package followercount

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
)

// FacebookEntry represents a single person in a Facebook connections JSON file.
type FacebookEntry struct {
	Name      string `json:"name"`
	Timestamp int64  `json:"timestamp"`
}

// parseFBEntries finds the first key in the JSON object whose name starts with
// keyPrefix (e.g. "followers_v", "following_v", "friends_v") and unmarshals its
// array value. This handles any version suffix Facebook may use (v2, v3, v4…).
func parseFBEntries(content []byte, keyPrefix string) ([]FacebookEntry, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(content, &raw); err != nil {
		return nil, err
	}
	for key, val := range raw {
		if strings.HasPrefix(key, keyPrefix) {
			var entries []FacebookEntry
			if err := json.Unmarshal(val, &entries); err != nil {
				return nil, err
			}
			return entries, nil
		}
	}
	return nil, fmt.Errorf("no key with prefix %q found in JSON", keyPrefix)
}

// FacebookPerson is a person in the Facebook analysis output.
type FacebookPerson struct {
	Name      string `json:"name"`
	Timestamp int64  `json:"timestamp,omitempty"`
}

// FacebookAnalysisResult is the API response for Facebook analysis.
type FacebookAnalysisResult struct {
	Success             bool             `json:"success"`
	NonFollowingFriends []FacebookPerson `json:"non_following_friends,omitempty"`
	NonFollowingPages   []FacebookPerson `json:"non_following_pages,omitempty"`
	TotalFriends        int              `json:"total_friends,omitempty"`
	TotalFollowing      int              `json:"total_following,omitempty"`
	TotalFollowers      int              `json:"total_followers,omitempty"`
	FriendsCount        int              `json:"friends_count,omitempty"`
	PagesCount          int              `json:"pages_count,omitempty"`
	Error               string           `json:"error,omitempty"`
	Message             string           `json:"message,omitempty"`
}

func sendFacebookError(w http.ResponseWriter, statusCode int, message string) {
	sendJSON(w, statusCode, FacebookAnalysisResult{Success: false, Error: message})
}

// extractFBFollowers reads connections/Followers/people_who_followed_you.json
// and returns a lowercase-name set for O(1) lookup.
func extractFBFollowers(zipReader *zip.Reader) (map[string]struct{}, int, error) {
	followers := make(map[string]struct{})

	for _, file := range zipReader.File {
		lower := strings.ToLower(file.Name)
		if !strings.Contains(lower, "connections/followers/") {
			continue
		}
		if !strings.Contains(lower, "people_who_followed_you") {
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

		entries, err := parseFBEntries(content, "followers_v")
		if err != nil {
			log.Printf("[DEBUG] extractFBFollowers: failed to parse %s: %v", file.Name, err)
			continue
		}

		for _, entry := range entries {
			if entry.Name != "" {
				followers[strings.ToLower(entry.Name)] = struct{}{}
			}
		}

		log.Printf("[DEBUG] extractFBFollowers: found %d followers in %s", len(followers), file.Name)
		break
	}

	return followers, len(followers), nil
}

// extractFBFollowing reads connections/Followers/who_you've_followed.json
func extractFBFollowing(zipReader *zip.Reader) ([]FacebookEntry, int, error) {
	var following []FacebookEntry

	for _, file := range zipReader.File {
		lower := strings.ToLower(file.Name)
		if !strings.Contains(lower, "connections/followers/") {
			continue
		}
		if strings.Contains(lower, "people_who_followed_you") {
			continue
		}
		if !strings.Contains(lower, "followed") {
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

		entries, err := parseFBEntries(content, "following_v")
		if err != nil {
			log.Printf("[DEBUG] extractFBFollowing: failed to parse %s: %v", file.Name, err)
			continue
		}

		following = entries
		log.Printf("[DEBUG] extractFBFollowing: found %d following in %s", len(following), file.Name)
		break
	}

	return following, len(following), nil
}

// extractFBFriends reads connections/Friends/your_friends.json
func extractFBFriends(zipReader *zip.Reader) ([]FacebookEntry, int, error) {
	var friends []FacebookEntry

	for _, file := range zipReader.File {
		lower := strings.ToLower(file.Name)
		if !strings.Contains(lower, "connections/friends/") {
			continue
		}
		if !strings.Contains(lower, "your_friends") {
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

		entries, err := parseFBEntries(content, "friends_v")
		if err != nil {
			log.Printf("[DEBUG] extractFBFriends: failed to parse %s: %v", file.Name, err)
			continue
		}

		friends = entries
		log.Printf("[DEBUG] extractFBFriends: found %d friends in %s", len(friends), file.Name)
		break
	}

	return friends, len(friends), nil
}

// AnalyzeFacebook is the HTTP handler for POST /api/analyze/facebook.
// It is completely separate from the Instagram analysis logic.
func AnalyzeFacebook(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		sendFacebookError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	clientIP := getClientIP(r)
	if !checkRateLimit(clientIP) {
		sendFacebookError(w, http.StatusTooManyRequests, "Rate limit exceeded. Please try again later.")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 50*1024*1024)

	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		if strings.Contains(err.Error(), "request body too large") {
			sendFacebookError(w, http.StatusRequestEntityTooLarge, "File too large. Maximum size is 50MB.")
			return
		}
		sendFacebookError(w, http.StatusBadRequest, "Failed to read request body")
		return
	}

	if len(bodyBytes) < 4 || bodyBytes[0] != 0x50 || bodyBytes[1] != 0x4B {
		sendFacebookError(w, http.StatusBadRequest, "Invalid file format. Please upload a valid ZIP file.")
		return
	}

	zipReader, err := zip.NewReader(bytes.NewReader(bodyBytes), int64(len(bodyBytes)))
	if err != nil {
		sendFacebookError(w, http.StatusBadRequest, "Failed to read ZIP file. Please ensure it's a valid ZIP archive.")
		return
	}

	fbFollowers, totalFollowers, err := extractFBFollowers(zipReader)
	if err != nil {
		sendFacebookError(w, http.StatusInternalServerError, "Failed to process followers data")
		return
	}

	fbFollowing, totalFollowing, err := extractFBFollowing(zipReader)
	if err != nil {
		sendFacebookError(w, http.StatusInternalServerError, "Failed to process following data")
		return
	}

	fbFriends, totalFriends, err := extractFBFriends(zipReader)
	if err != nil {
		sendFacebookError(w, http.StatusInternalServerError, "Failed to process friends data")
		return
	}

	if totalFollowing == 0 && totalFriends == 0 {
		sendFacebookError(w, http.StatusBadRequest, "No Facebook connection data found. Please upload a valid Facebook data export.")
		return
	}

	// List A: friends who are NOT in the followers set
	var nonFollowingFriends []FacebookPerson
	for _, friend := range fbFriends {
		if _, exists := fbFollowers[strings.ToLower(friend.Name)]; !exists {
			nonFollowingFriends = append(nonFollowingFriends, FacebookPerson{
				Name:      friend.Name,
				Timestamp: friend.Timestamp,
			})
		}
	}

	// List B: pages/people you follow who are NOT in the followers set
	var nonFollowingPages []FacebookPerson
	for _, followed := range fbFollowing {
		if _, exists := fbFollowers[strings.ToLower(followed.Name)]; !exists {
			nonFollowingPages = append(nonFollowingPages, FacebookPerson{
				Name:      followed.Name,
				Timestamp: followed.Timestamp,
			})
		}
	}

	result := FacebookAnalysisResult{
		Success:             true,
		NonFollowingFriends: nonFollowingFriends,
		NonFollowingPages:   nonFollowingPages,
		TotalFriends:        totalFriends,
		TotalFollowing:      totalFollowing,
		TotalFollowers:      totalFollowers,
		FriendsCount:        len(nonFollowingFriends),
		PagesCount:          len(nonFollowingPages),
		Message:             "Facebook analysis complete",
	}

	if email := UserEmailFromContext(r.Context()); email != "" {
		go SaveFacebookResult(context.Background(), hashEmail(email), result)
	}

	sendJSON(w, http.StatusOK, result)
}
