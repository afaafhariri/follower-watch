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
	// Match followers_1.json, followers_2.json, etc. in connections/followers_and_following/ folder
	followerPattern := regexp.MustCompile(`(?i)followers(_\d+)?\.json$`)
	// Path pattern to match the expected folder structure
	pathPattern := regexp.MustCompile(`(?i)connections/followers_and_following/`)

	log.Printf("[DEBUG] extractFollowers: scanning %d files in zip", len(zipReader.File))

	for _, file := range zipReader.File {
		fileName := file.Name
		log.Printf("[DEBUG] extractFollowers: checking file: %s", fileName)
		baseName := fileName
		if idx := strings.LastIndex(fileName, "/"); idx != -1 {
			baseName = fileName[idx+1:]
		}

		// Check if file is in the expected path OR matches the follower pattern directly
		inExpectedPath := pathPattern.MatchString(fileName)
		matchesFollowerPattern := followerPattern.MatchString(baseName)

		log.Printf("[DEBUG] extractFollowers: file=%s, baseName=%s, inExpectedPath=%v, matchesFollowerPattern=%v", fileName, baseName, inExpectedPath, matchesFollowerPattern)

		// Skip if not a followers file
		if !matchesFollowerPattern && !strings.Contains(strings.ToLower(baseName), "followers") {
			log.Printf("[DEBUG] extractFollowers: skipping %s (not a followers file)", fileName)
			continue
		}

		// Skip following files
		if strings.Contains(strings.ToLower(baseName), "following") {
			log.Printf("[DEBUG] extractFollowers: skipping %s (is a following file)", fileName)
			continue
		}

		// Prefer files in the expected path, but also accept files that match the pattern elsewhere
		if !inExpectedPath && !matchesFollowerPattern {
			log.Printf("[DEBUG] extractFollowers: skipping %s (not in expected path and doesn't match pattern)", fileName)
			continue
		}

		log.Printf("[DEBUG] extractFollowers: PROCESSING file: %s", fileName)

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
			log.Printf("[DEBUG] extractFollowers: parsed %s as []InstagramRelationship with %d items", fileName, len(relationships))
			for _, rel := range relationships {
				// Username can be in title OR in string_list_data[].value
				username := rel.Title
				if len(rel.StringListData) > 0 && rel.StringListData[0].Value != "" {
					username = rel.StringListData[0].Value
				}
				if username != "" {
					followers[strings.ToLower(username)] = struct{}{}
				}
			}
			continue
		} else {
			log.Printf("[DEBUG] extractFollowers: failed to parse %s as []InstagramRelationship: %v", fileName, err)
		}

		var singleRel InstagramRelationship
		if err := json.Unmarshal(content, &singleRel); err == nil {
			log.Printf("[DEBUG] extractFollowers: parsed %s as single InstagramRelationship", fileName)
			// Username can be in title OR in string_list_data[].value
			username := singleRel.Title
			if len(singleRel.StringListData) > 0 && singleRel.StringListData[0].Value != "" {
				username = singleRel.StringListData[0].Value
			}
			if username != "" {
				followers[strings.ToLower(username)] = struct{}{}
			}
		} else {
			log.Printf("[DEBUG] extractFollowers: failed to parse %s as single InstagramRelationship: %v", fileName, err)
			log.Printf("[DEBUG] extractFollowers: content preview: %.500s", string(content))
		}
	}

	log.Printf("[DEBUG] extractFollowers: found %d total followers", len(followers))
	return followers, len(followers), nil
}

func extractFollowing(zipReader *zip.Reader) ([]NonFollower, int, error) {
	var following []NonFollower
	// Path pattern to match the expected folder structure
	pathPattern := regexp.MustCompile(`(?i)connections/followers_and_following/`)
	// Match following.json file
	followingPattern := regexp.MustCompile(`(?i)^following\.json$`)

	log.Printf("[DEBUG] extractFollowing: scanning %d files in zip", len(zipReader.File))

	for _, file := range zipReader.File {
		fileName := file.Name
		log.Printf("[DEBUG] extractFollowing: checking file: %s", fileName)
		lowerFileName := strings.ToLower(fileName)
		baseName := fileName
		if idx := strings.LastIndex(fileName, "/"); idx != -1 {
			baseName = fileName[idx+1:]
		}
		lowerBaseName := strings.ToLower(baseName)

		// Check if file is in the expected path
		inExpectedPath := pathPattern.MatchString(fileName)
		matchesFollowingPattern := followingPattern.MatchString(baseName)

		log.Printf("[DEBUG] extractFollowing: file=%s, baseName=%s, inExpectedPath=%v, matchesFollowingPattern=%v", fileName, baseName, inExpectedPath, matchesFollowingPattern)

		// Skip if not a following file or doesn't contain "following" in name
		if !matchesFollowingPattern && !strings.Contains(lowerBaseName, "following") {
			log.Printf("[DEBUG] extractFollowing: skipping %s (not a following file)", fileName)
			continue
		}

		// Skip followers files
		if strings.Contains(lowerBaseName, "followers") {
			log.Printf("[DEBUG] extractFollowing: skipping %s (is a followers file)", fileName)
			continue
		}

		// Prefer files in the expected path, but also accept files that match the pattern elsewhere
		if !inExpectedPath && !matchesFollowingPattern && !strings.Contains(lowerFileName, "following") {
			log.Printf("[DEBUG] extractFollowing: skipping %s (not in expected path)", fileName)
			continue
		}

		log.Printf("[DEBUG] extractFollowing: PROCESSING file: %s", fileName)

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
			log.Printf("[DEBUG] extractFollowing: parsed %s as FollowingData with %d relationships", fileName, len(followingData.RelationshipsFollowing))
			for _, rel := range followingData.RelationshipsFollowing {
				// Username can be in title OR in string_list_data[].value
				username := rel.Title
				var timestamp int64
				if len(rel.StringListData) > 0 {
					if rel.StringListData[0].Value != "" {
						username = rel.StringListData[0].Value
					}
					timestamp = rel.StringListData[0].Timestamp
				}
				if username != "" {
					following = append(following, NonFollower{
						Username:   username,
						ProfileURL: fmt.Sprintf("https://instagram.com/%s", username),
						FollowedAt: timestamp,
					})
				}
			}
			if len(following) > 0 {
				log.Printf("[DEBUG] extractFollowing: found %d following from FollowingData", len(following))
				break
			}
		} else {
			log.Printf("[DEBUG] extractFollowing: failed to parse %s as FollowingData: %v", fileName, err)
		}

		var relationships []InstagramRelationship
		if err := json.Unmarshal(content, &relationships); err == nil {
			log.Printf("[DEBUG] extractFollowing: parsed %s as []InstagramRelationship with %d items", fileName, len(relationships))
			for _, rel := range relationships {
				// Username can be in title OR in string_list_data[].value
				username := rel.Title
				var timestamp int64
				if len(rel.StringListData) > 0 {
					if rel.StringListData[0].Value != "" {
						username = rel.StringListData[0].Value
					}
					timestamp = rel.StringListData[0].Timestamp
				}
				if username != "" {
					following = append(following, NonFollower{
						Username:   username,
						ProfileURL: fmt.Sprintf("https://instagram.com/%s", username),
						FollowedAt: timestamp,
					})
				}
			}
		} else {
			log.Printf("[DEBUG] extractFollowing: failed to parse %s as []InstagramRelationship: %v", fileName, err)
			log.Printf("[DEBUG] extractFollowing: content preview: %.500s", string(content))
		}
	}

	log.Printf("[DEBUG] extractFollowing: found %d total following", len(following))
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
