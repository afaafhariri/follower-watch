package followercount

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func createTestZip(t *testing.T, files map[string]string) []byte {
	buf := new(bytes.Buffer)
	w := zip.NewWriter(buf)

	for name, content := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatalf("Failed to create file in zip: %v", err)
		}
		_, err = f.Write([]byte(content))
		if err != nil {
			t.Fatalf("Failed to write to zip file: %v", err)
		}
	}

	err := w.Close()
	if err != nil {
		t.Fatalf("Failed to close zip writer: %v", err)
	}

	return buf.Bytes()
}

func TestAnalyzeFollowers_ValidZip(t *testing.T) {
	// Each InstagramRelationship represents one user
	followersData := `[
		{"string_list_data": [{"value": "user1", "timestamp": 1234567890}]},
		{"string_list_data": [{"value": "user2", "timestamp": 1234567891}]}
	]`

	followingData := `{
		"relationships_following": [
			{"title": "user1", "string_list_data": [{"href": "https://instagram.com/user1", "timestamp": 1234567890}]},
			{"title": "user3", "string_list_data": [{"href": "https://instagram.com/user3", "timestamp": 1234567892}]},
			{"title": "user4", "string_list_data": [{"href": "https://instagram.com/user4", "timestamp": 1234567893}]}
		]
	}`

	zipBytes := createTestZip(t, map[string]string{
		"connections/followers_and_following/followers_1.json": followersData,
		"connections/followers_and_following/following.json":   followingData,
	})

	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(zipBytes))
	req.Header.Set("Content-Type", "application/zip")

	w := httptest.NewRecorder()
	AnalyzeFollowers(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		t.Fatalf("Expected status 200, got %d: %s", resp.StatusCode, string(body))
	}

	var apiResponse APIResponse
	err := json.NewDecoder(resp.Body).Decode(&apiResponse)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if !apiResponse.Success {
		t.Fatalf("Expected success, got error: %s", apiResponse.Error)
	}

	// user3 and user4 should be non-followers
	if apiResponse.Count != 2 {
		t.Fatalf("Expected 2 non-followers, got %d", apiResponse.Count)
	}
}

func TestAnalyzeFollowers_InvalidZip(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader([]byte("not a zip file")))
	req.Header.Set("Content-Type", "application/zip")

	w := httptest.NewRecorder()
	AnalyzeFollowers(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", resp.StatusCode)
	}
}

func TestAnalyzeFollowers_MethodNotAllowed(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	w := httptest.NewRecorder()
	AnalyzeFollowers(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("Expected status 405, got %d", resp.StatusCode)
	}
}

func TestAnalyzeFollowers_OptionsRequest(t *testing.T) {
	req := httptest.NewRequest(http.MethodOptions, "/", nil)
	req.Header.Set("Origin", "http://localhost:3000")

	w := httptest.NewRecorder()
	AnalyzeFollowers(w, req)

	resp := w.Result()
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200 for OPTIONS, got %d", resp.StatusCode)
	}

	if resp.Header.Get("Access-Control-Allow-Methods") == "" {
		t.Fatal("Expected CORS headers to be set")
	}
}

func TestFindNonFollowers(t *testing.T) {
	followers := map[string]struct{}{
		"user1": {},
		"user2": {},
	}

	following := []NonFollower{
		{Username: "user1", ProfileURL: "https://instagram.com/user1"},
		{Username: "user3", ProfileURL: "https://instagram.com/user3"},
		{Username: "USER2", ProfileURL: "https://instagram.com/USER2"}, // Test case insensitivity
	}

	nonFollowers := findNonFollowers(following, followers)

	if len(nonFollowers) != 1 {
		t.Fatalf("Expected 1 non-follower, got %d", len(nonFollowers))
	}

	if nonFollowers[0].Username != "user3" {
		t.Fatalf("Expected user3 to be non-follower, got %s", nonFollowers[0].Username)
	}
}

func TestGetClientIP(t *testing.T) {
	tests := []struct {
		name       string
		headers    map[string]string
		remoteAddr string
		expected   string
	}{
		{
			name:       "X-Forwarded-For single IP",
			headers:    map[string]string{"X-Forwarded-For": "1.2.3.4"},
			remoteAddr: "5.6.7.8:1234",
			expected:   "1.2.3.4",
		},
		{
			name:       "X-Forwarded-For multiple IPs",
			headers:    map[string]string{"X-Forwarded-For": "1.2.3.4, 5.6.7.8, 9.10.11.12"},
			remoteAddr: "5.6.7.8:1234",
			expected:   "1.2.3.4",
		},
		{
			name:       "X-Real-IP",
			headers:    map[string]string{"X-Real-IP": "1.2.3.4"},
			remoteAddr: "5.6.7.8:1234",
			expected:   "1.2.3.4",
		},
		{
			name:       "RemoteAddr fallback",
			headers:    map[string]string{},
			remoteAddr: "5.6.7.8:1234",
			expected:   "5.6.7.8",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/", nil)
			req.RemoteAddr = tt.remoteAddr
			for k, v := range tt.headers {
				req.Header.Set(k, v)
			}

			ip := getClientIP(req)
			if ip != tt.expected {
				t.Errorf("Expected IP %s, got %s", tt.expected, ip)
			}
		})
	}
}
