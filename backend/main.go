package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

// Instagram data structures
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

// NonFollower represents a user who doesn't follow back
type NonFollower struct {
	Username   string `json:"username"`
	ProfileURL string `json:"profile_url"`
	FollowedAt int64  `json:"followed_at,omitempty"`
}

// Response structure
type APIResponse struct {
	Success        bool          `json:"success"`
	NonFollowers   []NonFollower `json:"non_followers,omitempty"`
	TotalFollowing int           `json:"total_following,omitempty"`
	TotalFollowers int           `json:"total_followers,omitempty"`
	Count          int           `json:"count,omitempty"`
	Error          string        `json:"error,omitempty"`
	Message        string        `json:"message,omitempty"`
}

// Rate limiting implementation
var (
	rateLimitMu    sync.Mutex
	requestTracker = make(map[string][]time.Time)
	maxRequests    = 10
	windowDuration = time.Minute * 5
)

// CORS headers - configured for production
func getCORSHeaders() map[string]string {
	return map[string]string{
		"Access-Control-Allow-Origin":  "*", // Configure with your frontend domain
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type, X-Requested-With",
		"Access-Control-Max-Age":       "86400",
		"Content-Type":                 "application/json",
	}
}

// Check rate limit for an IP
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

	// Check if under limit
	if len(validRequests) >= maxRequests {
		return false
	}

	// Add current request
	requestTracker[ip] = append(requestTracker[ip], now)
	return true
}

// Create error response (no sensitive data logged)
func errorResponse(statusCode int, message string) events.APIGatewayProxyResponse {
	response := APIResponse{
		Success: false,
		Error:   message,
	}
	body, _ := json.Marshal(response)
	return events.APIGatewayProxyResponse{
		StatusCode: statusCode,
		Headers:    getCORSHeaders(),
		Body:       string(body),
	}
}

// Create success response
func successResponse(data APIResponse) events.APIGatewayProxyResponse {
	data.Success = true
	body, _ := json.Marshal(data)
	return events.APIGatewayProxyResponse{
		StatusCode: http.StatusOK,
		Headers:    getCORSHeaders(),
		Body:       string(body),
	}
}

// Extract usernames from follower files (handles followers_1.json, followers_2.json, etc.)
func extractFollowers(zipReader *zip.Reader) (map[string]struct{}, int, error) {
	followers := make(map[string]struct{})
	followerPattern := regexp.MustCompile(`(?i)followers[/_]?(\d+)?\.json$|^followers\.json$`)

	for _, file := range zipReader.File {
		// Check various paths for follower files
		fileName := file.Name
		baseName := fileName
		if idx := strings.LastIndex(fileName, "/"); idx != -1 {
			baseName = fileName[idx+1:]
		}

		// Match follower files including followers_1.json, followers_2.json, etc.
		if !followerPattern.MatchString(baseName) && !strings.Contains(strings.ToLower(fileName), "followers") {
			continue
		}

		// Skip if it's following file
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

		// Try parsing as array of relationships first
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

		// Try parsing as single relationship object
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

// Extract following list
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

		// Try parsing as FollowingData structure
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

		// Try parsing as array of relationships
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

// Find non-followers
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

// Main handler
func handleRequest(ctx context.Context, request events.APIGatewayProxyRequest) (events.APIGatewayProxyResponse, error) {
	// Handle preflight OPTIONS request
	if request.HTTPMethod == "OPTIONS" {
		return events.APIGatewayProxyResponse{
			StatusCode: http.StatusOK,
			Headers:    getCORSHeaders(),
		}, nil
	}

	// Only allow POST
	if request.HTTPMethod != "POST" {
		return errorResponse(http.StatusMethodNotAllowed, "Method not allowed"), nil
	}

	// Rate limiting - get client IP
	clientIP := request.RequestContext.Identity.SourceIP
	if clientIP == "" {
		clientIP = "unknown"
	}

	if !checkRateLimit(clientIP) {
		return errorResponse(http.StatusTooManyRequests, "Rate limit exceeded. Please try again later."), nil
	}

	// Validate content type
	contentType := request.Headers["Content-Type"]
	if contentType == "" {
		contentType = request.Headers["content-type"]
	}

	// Decode body (handle base64 if needed)
	var bodyBytes []byte
	var err error

	if request.IsBase64Encoded {
		bodyBytes, err = base64.StdEncoding.DecodeString(request.Body)
		if err != nil {
			return errorResponse(http.StatusBadRequest, "Invalid base64 encoding"), nil
		}
	} else {
		bodyBytes = []byte(request.Body)
	}

	// Validate file size (max 50MB)
	if len(bodyBytes) > 50*1024*1024 {
		return errorResponse(http.StatusRequestEntityTooLarge, "File too large. Maximum size is 50MB."), nil
	}

	// Validate ZIP magic bytes
	if len(bodyBytes) < 4 || bodyBytes[0] != 0x50 || bodyBytes[1] != 0x4B {
		return errorResponse(http.StatusBadRequest, "Invalid file format. Please upload a valid ZIP file."), nil
	}

	// Create zip reader from memory
	zipReader, err := zip.NewReader(bytes.NewReader(bodyBytes), int64(len(bodyBytes)))
	if err != nil {
		return errorResponse(http.StatusBadRequest, "Failed to read ZIP file. Please ensure it's a valid ZIP archive."), nil
	}

	// Extract followers (into a set for O(1) lookup)
	followers, totalFollowers, err := extractFollowers(zipReader)
	if err != nil {
		return errorResponse(http.StatusInternalServerError, "Failed to process followers data"), nil
	}

	// Extract following list
	following, totalFollowing, err := extractFollowing(zipReader)
	if err != nil {
		return errorResponse(http.StatusInternalServerError, "Failed to process following data"), nil
	}

	// Validate we found data
	if totalFollowing == 0 {
		return errorResponse(http.StatusBadRequest, "No following data found. Please upload a valid Instagram data export."), nil
	}

	if totalFollowers == 0 {
		return errorResponse(http.StatusBadRequest, "No followers data found. Please upload a valid Instagram data export."), nil
	}

	// Find non-followers
	nonFollowers := findNonFollowers(following, followers)

	// Return success response (no usernames logged - privacy compliant)
	return successResponse(APIResponse{
		NonFollowers:   nonFollowers,
		TotalFollowing: totalFollowing,
		TotalFollowers: totalFollowers,
		Count:          len(nonFollowers),
		Message:        "Analysis complete",
	}), nil
}

func main() {
	lambda.Start(handleRequest)
}
