package followercount

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
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

func labeledEntry(username, name string, ts int64) string {
	return fmt.Sprintf(`{"timestamp": %d, "media": [], "label_values": [
		{"label": "URL", "value": "https://www.instagram.com/%s"},
		{"label": "Name", "value": %q},
		{"label": "Username", "value": %q}
	], "fbid": "1"}`, ts, username, name, username)
}

func analyzeZip(t *testing.T, files map[string]string) (*http.Response, APIResponse) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(createTestZip(t, files)))
	req.Header.Set("Content-Type", "application/zip")
	w := httptest.NewRecorder()
	AnalyzeFollowers(w, req)

	resp := w.Result()
	var apiResponse APIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}
	return resp, apiResponse
}

const (
	testDir       = "connections/followers_and_following/"
	testFollowers = `[
		{"string_list_data": [{"value": "user1", "timestamp": 1}]},
		{"string_list_data": [{"value": "user2", "timestamp": 2}]}
	]`
	testFollowing = `{"relationships_following": [
		{"title": "user1", "string_list_data": [{"href": "https://www.instagram.com/_u/user1", "timestamp": 1}]},
		{"title": "user3", "string_list_data": [{"href": "https://www.instagram.com/_u/user3", "timestamp": 3}]}
	]}`
)

func TestAnalyzeFollowers_RecentActivity(t *testing.T) {
	resp, apiResponse := analyzeZip(t, map[string]string{
		testDir + "followers_1.json": testFollowers,
		testDir + "following.json":   testFollowing,
		testDir + "recent_follow_requests.json": "[" +
			labeledEntry("user3", "Accepted Request", 10) + "," +
			labeledEntry("user5", "Pending Request", 11) + "," +
			labeledEntry("user6", "Declined Request", 12) + "]",
		testDir + "pending_follow_requests.json": "[" + labeledEntry("user5", "Pending Request", 11) + "]",
		testDir + "recently_unfollowed_profiles.json": "[" +
			labeledEntry("user2", "Still Follows", 20) + "," +
			labeledEntry("user7", "Gone", 21) + "]",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", resp.StatusCode, apiResponse.Error)
	}

	activity := apiResponse.RecentActivity
	if activity == nil {
		t.Fatal("Expected recent_activity in response")
	}

	// user5 is still pending, so it's only listed under PendingRequests
	wantStatus := map[string]string{"user3": RequestAccepted, "user6": RequestNotAccepted}
	if len(activity.FollowRequests) != len(wantStatus) {
		t.Fatalf("Expected %d follow requests, got %d", len(wantStatus), len(activity.FollowRequests))
	}
	for _, r := range activity.FollowRequests {
		if r.Status != wantStatus[r.Username] {
			t.Errorf("%s: expected status %q, got %q", r.Username, wantStatus[r.Username], r.Status)
		}
		if r.Name == "" || r.Timestamp == 0 {
			t.Errorf("%s: expected name and timestamp to be parsed, got %+v", r.Username, r.Profile)
		}
	}

	if len(activity.PendingRequests) != 1 || activity.PendingRequests[0].Username != "user5" {
		t.Errorf("Expected one pending request for user5, got %+v", activity.PendingRequests)
	}

	wantFollowsYou := map[string]bool{"user2": true, "user7": false}
	if len(activity.Unfollowed) != len(wantFollowsYou) {
		t.Fatalf("Expected %d unfollowed, got %d", len(wantFollowsYou), len(activity.Unfollowed))
	}
	for _, u := range activity.Unfollowed {
		if u.FollowsYou != wantFollowsYou[u.Username] {
			t.Errorf("%s: expected follows_you=%v", u.Username, wantFollowsYou[u.Username])
		}
	}
}

func TestAnalyzeFollowers_MissingOptionalFiles(t *testing.T) {
	resp, apiResponse := analyzeZip(t, map[string]string{
		testDir + "followers_1.json": testFollowers,
		testDir + "following.json":   testFollowing,
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", resp.StatusCode, apiResponse.Error)
	}

	activity := apiResponse.RecentActivity
	if activity == nil || activity.FollowRequests == nil || activity.PendingRequests == nil || activity.Unfollowed == nil {
		t.Fatalf("Expected empty (non-null) activity lists, got %+v", activity)
	}
	if len(activity.FollowRequests)+len(activity.PendingRequests)+len(activity.Unfollowed) != 0 {
		t.Fatalf("Expected no activity, got %+v", activity)
	}
}

func TestAnalyzeFollowers_LabelValuesFollowLists(t *testing.T) {
	// followers/following in the newer label_values shape
	resp, apiResponse := analyzeZip(t, map[string]string{
		testDir + "followers_1.json": "[" + labeledEntry("user1", "One", 1) + "]",
		testDir + "following.json": "[" +
			labeledEntry("user1", "One", 1) + "," +
			labeledEntry("user3", "Three", 3) + "]",
	})
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("Expected status 200, got %d: %s", resp.StatusCode, apiResponse.Error)
	}
	if apiResponse.Count != 1 || apiResponse.NonFollowers[0].Username != "user3" {
		t.Fatalf("Expected user3 as the only non-follower, got %+v", apiResponse.NonFollowers)
	}
}

func TestAnalyzeFollowers_IgnoresFollowingHashtags(t *testing.T) {
	_, apiResponse := analyzeZip(t, map[string]string{
		testDir + "followers_1.json":        testFollowers,
		testDir + "following.json":          testFollowing,
		testDir + "following_hashtags.json": `{"relationships_following_hashtags": [{"title": "sunsets", "string_list_data": [{"value": "sunsets"}]}]}`,
	})
	if apiResponse.TotalFollowing != 2 {
		t.Fatalf("Expected 2 following (hashtags excluded), got %d", apiResponse.TotalFollowing)
	}
}

func TestAnalyzeFollowers_HTMLExport(t *testing.T) {
	resp, apiResponse := analyzeZip(t, map[string]string{
		testDir + "followers_1.html": "<html></html>",
		testDir + "following.html":   "<html></html>",
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("Expected status 400, got %d", resp.StatusCode)
	}
	if !strings.Contains(apiResponse.Error, "HTML") {
		t.Fatalf("Expected an HTML-format error, got %q", apiResponse.Error)
	}
}

func TestFixMetaEncoding(t *testing.T) {
	tests := map[string]string{
		"Ren\u00c3\u00a9e":              "Renée",
		"Heba \u00f0\u009f\u0098\u008a": "Heba 😊",
		"plain ascii":                   "plain ascii",
		"already Renée":                 "already Renée", // valid text is left alone
		"lone \u00e9":                   "lone é",        // not valid UTF-8 once re-read as bytes
	}
	for in, want := range tests {
		var decoded string
		if err := json.Unmarshal([]byte(`"`+in+`"`), &decoded); err != nil {
			t.Fatalf("bad test input %q: %v", in, err)
		}
		if got := fixMetaEncoding(decoded); got != want {
			t.Errorf("fixMetaEncoding(%q) = %q, want %q", decoded, got, want)
		}
	}
}

func TestLoginCookieSecureOnlyOverHTTPS(t *testing.T) {
	tests := []struct {
		name       string
		forwarded  string
		wantSecure bool
	}{
		{"plain http (local dev)", "", false},
		{"https behind proxy", "https", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/auth/google/login", nil)
			if tt.forwarded != "" {
				req.Header.Set("X-Forwarded-Proto", tt.forwarded)
			}
			w := httptest.NewRecorder()
			HandleGoogleLogin(w, req)

			cookies := w.Result().Cookies()
			if len(cookies) == 0 {
				t.Fatal("Expected an oauth_state cookie")
			}
			if cookies[0].Secure != tt.wantSecure {
				t.Errorf("Expected Secure=%v, got %v", tt.wantSecure, cookies[0].Secure)
			}
		})
	}
}
