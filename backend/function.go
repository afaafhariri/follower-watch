// Package followercount provides a Cloud Function for analyzing Instagram data
package followercount

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

func init() {
	functions.HTTP("AnalyzeFollowers", AnalyzeFollowers)
}

type InstagramRelationship struct {
	Title     string `json:"title"`
	MediaList []struct {
		Title string `json:"title"`
	} `json:"media_list_data"`
	StringListData []struct {
		Href      string `json:"href"`
		Value     string `json:"value"`
		Timestamp int64  `json:"timestamp"`
	} `json:"string_list_data"`
}

type FollowingData struct {
	RelationshipsFollowing []InstagramRelationship `json:"relationships_following"`
}

type NonFollower struct {
	Username   string `json:"username"`
	ProfileURL string `json:"profile_url"`
	FollowedAt int64  `json:"followed_at,omitempty"`
}

type APIResponse struct {
	Success        bool          `json:"success"`
	NonFollowers   []NonFollower `json:"non_followers,omitempty"`
	TotalFollowing int           `json:"total_following,omitempty"`
	TotalFollowers int           `json:"total_followers,omitempty"`
	Count          int           `json:"count,omitempty"`
	Error          string        `json:"error,omitempty"`
	Message        string        `json:"message,omitempty"`
}

var (
	rateLimitMu    sync.Mutex
	requestTracker = make(map[string][]time.Time)
	maxRequests    = 10
	windowDuration = time.Minute * 5
)

func getAllowedOrigins() []string {
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		return []string{"*"}
	}
	return strings.Split(origins, ",")
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	allowedOrigins := getAllowedOrigins()

	for _, o := range allowedOrigins {
		if o == "*" || o == origin {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			break
		}
	}

	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
	w.Header().Set("Access-Control-Max-Age", "86400")
}

func checkRateLimit(ip string) bool {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()

	now := time.Now()
	cutoff := now.Add(-windowDuration)

	// Clean old entries
	var validRequests []time.Time
	for _, t := range requestTracker[ip] {
		if t.After(cutoff) {
			validRequests = append(validRequests, t)
		}
	}
	requestTracker[ip] = validRequests

	if len(validRequests) >= maxRequests {
		return false
	}

	requestTracker[ip] = append(requestTracker[ip], now)
	return true
}

func getClientIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}

	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}

	ip := r.RemoteAddr
	if colonIdx := strings.LastIndex(ip, ":"); colonIdx != -1 {
		ip = ip[:colonIdx]
	}
	return ip
}

func sendJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(data)
}

func sendError(w http.ResponseWriter, statusCode int, message string) {
	sendJSON(w, statusCode, APIResponse{
		Success: false,
		Error:   message,
	})
}

func extractFollowers(zipReader *zip.Reader) (map[string]struct{}, int, error) {
	followers := make(map[string]struct{})
	followerPattern := regexp.MustCompile(`(?i)followers[/_]?(\d+)?\.json$|^followers\.json$`)

	for _, file := range zipReader.File {
		fileName := file.Name
		baseName := fileName
		if idx := strings.LastIndex(fileName, "/"); idx != -1 {
			baseName = fileName[idx+1:]
		}

		if !followerPattern.MatchString(baseName) && !strings.Contains(strings.ToLower(fileName), "followers") {
			continue
		}

		if strings.Contains(strings.ToLower(baseName), "following") {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			continue
		}

		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		var relationships []InstagramRelationship
		if err := json.Unmarshal(content, &relationships); err == nil {
			for _, rel := range relationships {
				for _, data := range rel.StringListData {
					if data.Value != "" {
						followers[strings.ToLower(data.Value)] = struct{}{}
					}
				}
			}
			continue
		}

		var singleRel InstagramRelationship
		if err := json.Unmarshal(content, &singleRel); err == nil {
			for _, data := range singleRel.StringListData {
				if data.Value != "" {
					followers[strings.ToLower(data.Value)] = struct{}{}
				}
			}
		}
	}

	return followers, len(followers), nil
}

func extractFollowing(zipReader *zip.Reader) ([]NonFollower, int, error) {
	var following []NonFollower

	for _, file := range zipReader.File {
		fileName := strings.ToLower(file.Name)
		baseName := fileName
		if idx := strings.LastIndex(fileName, "/"); idx != -1 {
			baseName = fileName[idx+1:]
		}

		if !strings.Contains(baseName, "following") || strings.Contains(baseName, "followers") {
			continue
		}

		rc, err := file.Open()
		if err != nil {
			continue
		}

		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		var followingData FollowingData
		if err := json.Unmarshal(content, &followingData); err == nil {
			for _, rel := range followingData.RelationshipsFollowing {
				for _, data := range rel.StringListData {
					if data.Value != "" {
						following = append(following, NonFollower{
							Username:   data.Value,
							ProfileURL: fmt.Sprintf("https://instagram.com/%s", data.Value),
							FollowedAt: data.Timestamp,
						})
					}
				}
			}
			if len(following) > 0 {
				break
			}
		}

		var relationships []InstagramRelationship
		if err := json.Unmarshal(content, &relationships); err == nil {
			for _, rel := range relationships {
				for _, data := range rel.StringListData {
					if data.Value != "" {
						following = append(following, NonFollower{
							Username:   data.Value,
							ProfileURL: fmt.Sprintf("https://instagram.com/%s", data.Value),
							FollowedAt: data.Timestamp,
						})
					}
				}
			}
		}
	}

	return following, len(following), nil
}

func findNonFollowers(following []NonFollower, followers map[string]struct{}) []NonFollower {
	var nonFollowers []NonFollower

	for _, user := range following {
		username := strings.ToLower(user.Username)
		if _, exists := followers[username]; !exists {
			nonFollowers = append(nonFollowers, user)
		}
	}

	return nonFollowers
}

func AnalyzeFollowers(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		sendError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	clientIP := getClientIP(r)
	if !checkRateLimit(clientIP) {
		sendError(w, http.StatusTooManyRequests, "Rate limit exceeded. Please try again later.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 50*1024*1024)

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		if strings.Contains(err.Error(), "request body too large") {
			sendError(w, http.StatusRequestEntityTooLarge, "File too large. Maximum size is 50MB.")
			return
		}
		sendError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	if len(bodyBytes) < 4 || bodyBytes[0] != 0x50 || bodyBytes[1] != 0x4B {
		sendError(w, http.StatusBadRequest, "Invalid file format. Please upload a valid ZIP file.")
		return
	}

	zipReader, err := zip.NewReader(bytes.NewReader(bodyBytes), int64(len(bodyBytes)))
	if err != nil {
		sendError(w, http.StatusBadRequest, "Failed to read ZIP file. Please ensure it's a valid ZIP archive.")
		return
	}

	followers, totalFollowers, err := extractFollowers(zipReader)
	if err != nil {
		log.Printf("Error extracting followers: %v", err)
		sendError(w, http.StatusInternalServerError, "Failed to process followers data")
		return
	}

	following, totalFollowing, err := extractFollowing(zipReader)
	if err != nil {
		log.Printf("Error extracting following: %v", err)
		sendError(w, http.StatusInternalServerError, "Failed to process following data")
		return
	}

	if totalFollowing == 0 {
		sendError(w, http.StatusBadRequest, "No following data found. Please upload a valid Instagram data export.")
		return
	}

	if totalFollowers == 0 {
		sendError(w, http.StatusBadRequest, "No followers data found. Please upload a valid Instagram data export.")
		return
	}

	nonFollowers := findNonFollowers(following, followers)

	sendJSON(w, http.StatusOK, APIResponse{
		Success:        true,
		NonFollowers:   nonFollowers,
		TotalFollowing: totalFollowing,
		TotalFollowers: totalFollowers,
		Count:          len(nonFollowers),
		Message:        "Analysis complete",
	})
}
