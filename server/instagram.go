// Package followercount provides the HTTP handler for analyzing Instagram data
package followercount

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"
)

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
	// RecentActivity is nil only in results cached before it was added
	RecentActivity *RecentActivity `json:"recent_activity,omitempty"`
	Error          string          `json:"error,omitempty"`
	Message        string          `json:"message,omitempty"`
}

var (
	rateLimitMu    sync.Mutex
	requestTracker = make(map[string][]time.Time)
	// lastRateLimitSweep is when stale requestTracker entries were last removed
	lastRateLimitSweep time.Time
	maxRequests        = 10
	windowDuration     = time.Minute * 5
)

func getEnv(key string) string {
	return os.Getenv(key)
}

func getAllowedOrigins() []string {
	origins := getEnv("ALLOWED_ORIGINS")
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
	return checkRateLimitAt(ip, time.Now())
}

// checkRateLimitAt records a request from ip at now and reports whether it is
// within the limit. Entries for IPs with no requests left in the window are
// removed so requestTracker does not grow with every IP ever seen.
func checkRateLimitAt(ip string, now time.Time) bool {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()

	cutoff := now.Add(-windowDuration)

	// Periodically sweep IPs that have not been seen within the window.
	if now.Sub(lastRateLimitSweep) >= windowDuration {
		for trackedIP, times := range requestTracker {
			if remaining := pruneRequests(times, cutoff); len(remaining) == 0 {
				delete(requestTracker, trackedIP)
			} else {
				requestTracker[trackedIP] = remaining
			}
		}
		lastRateLimitSweep = now
	}

	validRequests := pruneRequests(requestTracker[ip], cutoff)

	if len(validRequests) >= maxRequests {
		requestTracker[ip] = validRequests
		return false
	}

	requestTracker[ip] = append(validRequests, now)
	return true
}

// pruneRequests returns the request times that fall after cutoff.
func pruneRequests(times []time.Time, cutoff time.Time) []time.Time {
	var valid []time.Time
	for _, t := range times {
		if t.After(cutoff) {
			valid = append(valid, t)
		}
	}
	return valid
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

	if (totalFollowing == 0 || totalFollowers == 0) && isHTMLExport(zipReader) {
		sendError(w, http.StatusBadRequest, "This export was downloaded in HTML format. Please request a new export with the format set to JSON.")
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

	result := APIResponse{
		Success:        true,
		NonFollowers:   nonFollowers,
		TotalFollowing: totalFollowing,
		TotalFollowers: totalFollowers,
		Count:          len(nonFollowers),
		RecentActivity: extractRecentActivity(zipReader, following, followers),
		Message:        "Analysis complete",
	}

	// Cache result for the logged-in user (use background context since the
	// request context is canceled after the response is sent)
	if email := UserEmailFromContext(r.Context()); email != "" {
		go SaveResult(context.Background(), hashEmail(email), result)
	}

	sendJSON(w, http.StatusOK, result)
}
