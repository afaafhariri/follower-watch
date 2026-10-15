package followercount

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Meta's export uses two entry shapes for account lists:
//
//	older (followers_1.json, following.json):
//	  {"title": "user", "string_list_data": [{"href": "...", "value": "user", "timestamp": 123}]}
//	newer (recent_follow_requests.json, pending_follow_requests.json, ...):
//	  {"timestamp": 123, "label_values": [{"label": "Username", "value": "user"}, {"label": "Name", ...}]}
//
// exportEntry decodes either one so every list goes through the same parser.
type exportEntry struct {
	Title          string `json:"title"`
	Timestamp      int64  `json:"timestamp"`
	StringListData []struct {
		Href      string `json:"href"`
		Value     string `json:"value"`
		Timestamp int64  `json:"timestamp"`
	} `json:"string_list_data"`
	LabelValues []struct {
		Label string `json:"label"`
		Value string `json:"value"`
	} `json:"label_values"`
}

// Profile is one account from an export list.
type Profile struct {
	Username   string `json:"username"`
	Name       string `json:"name,omitempty"`
	ProfileURL string `json:"profile_url"`
	Timestamp  int64  `json:"timestamp,omitempty"`
}

// Follow request statuses, derived by cross-referencing the following list
// (the export itself doesn't record the outcome).
const (
	RequestAccepted    = "accepted"
	RequestNotAccepted = "not_accepted"
)

// FollowRequest is a follow request the user sent recently. Requests still
// pending are excluded; they're listed in RecentActivity.PendingRequests.
type FollowRequest struct {
	Profile
	Status string `json:"status"`
}

// UnfollowedProfile is an account the user recently unfollowed.
type UnfollowedProfile struct {
	Profile
	FollowsYou bool `json:"follows_you"`
}

// RecentActivity holds the optional lists from the export. Meta only keeps
// roughly the last 90 days of these, regardless of the export's date range.
type RecentActivity struct {
	FollowRequests  []FollowRequest     `json:"follow_requests"`
	PendingRequests []Profile           `json:"pending_requests"`
	Unfollowed      []UnfollowedProfile `json:"unfollowed"`
}

var (
	followersFile      = regexp.MustCompile(`(?i)^followers(_\d+)?\.json$`)
	followingFile      = regexp.MustCompile(`(?i)^following(_\d+)?\.json$`)
	recentRequestsFile = regexp.MustCompile(`(?i)^recent_follow_requests(_\d+)?\.json$`)
	pendingFile        = regexp.MustCompile(`(?i)^pending_follow_requests(_\d+)?\.json$`)
	unfollowedFile     = regexp.MustCompile(`(?i)^recently_unfollowed_profiles(_\d+)?\.json$`)
	expectedDir        = regexp.MustCompile(`(?i)connections/followers_and_following/`)
)

// fixMetaEncoding undoes Meta's export encoding, which writes each UTF-8
// byte as its own \u00XX escape ("Ã©" instead of "é").
// Strings that aren't affected are returned unchanged.
func fixMetaEncoding(s string) string {
	b := make([]byte, 0, len(s))
	for _, r := range s {
		if r > 0xFF {
			return s
		}
		b = append(b, byte(r))
	}
	if !utf8.Valid(b) {
		return s
	}
	return string(b)
}

func (e exportEntry) profile() (Profile, bool) {
	var p Profile
	for _, lv := range e.LabelValues {
		switch lv.Label {
		case "Username":
			p.Username = lv.Value
		case "Name":
			p.Name = fixMetaEncoding(lv.Value)
		}
	}
	p.Timestamp = e.Timestamp

	if len(e.StringListData) > 0 {
		if p.Username == "" {
			p.Username = e.StringListData[0].Value
		}
		if p.Timestamp == 0 {
			p.Timestamp = e.StringListData[0].Timestamp
		}
	}
	// following.json leaves value empty and puts the username in title
	if p.Username == "" {
		p.Username = e.Title
	}

	if p.Username == "" {
		return Profile{}, false
	}
	p.ProfileURL = fmt.Sprintf("https://instagram.com/%s", p.Username)
	return p, true
}

// parseProfiles accepts a bare list of entries, a single entry, or a list
// wrapped in an object such as {"relationships_following": [...]}.
func parseProfiles(content []byte) ([]Profile, error) {
	var entries []exportEntry
	if err := json.Unmarshal(content, &entries); err != nil {
		var obj map[string]json.RawMessage
		if err := json.Unmarshal(content, &obj); err != nil {
			return nil, err
		}

		_, hasStrings := obj["string_list_data"]
		_, hasLabels := obj["label_values"]
		if hasStrings || hasLabels {
			var single exportEntry
			if err := json.Unmarshal(content, &single); err != nil {
				return nil, err
			}
			entries = []exportEntry{single}
		} else {
			for _, raw := range obj {
				var wrapped []exportEntry
				if json.Unmarshal(raw, &wrapped) == nil {
					entries = append(entries, wrapped...)
				}
			}
		}
	}

	profiles := make([]Profile, 0, len(entries))
	for _, e := range entries {
		if p, ok := e.profile(); ok {
			profiles = append(profiles, p)
		}
	}
	return profiles, nil
}

func baseName(name string) string {
	if idx := strings.LastIndex(name, "/"); idx != -1 {
		return name[idx+1:]
	}
	return name
}

// readProfiles parses every file in the zip whose base name matches pattern.
// When fallback is set and no file matches exactly, files it accepts are used
// instead, for exports with unexpected naming.
func readProfiles(zipReader *zip.Reader, pattern *regexp.Regexp, fallback func(name string) bool) []Profile {
	files := matchingFiles(zipReader, func(name string) bool { return pattern.MatchString(baseName(name)) })
	if len(files) == 0 && fallback != nil {
		files = matchingFiles(zipReader, fallback)
	}

	var profiles []Profile
	for _, file := range files {
		rc, err := file.Open()
		if err != nil {
			continue
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			continue
		}

		parsed, err := parseProfiles(content)
		if err != nil {
			log.Printf("[DEBUG] readProfiles: failed to parse %s: %v", file.Name, err)
			continue
		}
		log.Printf("[DEBUG] readProfiles: %s → %d entries", file.Name, len(parsed))
		profiles = append(profiles, parsed...)
	}
	return profiles
}

func matchingFiles(zipReader *zip.Reader, accept func(name string) bool) []*zip.File {
	var files []*zip.File
	for _, file := range zipReader.File {
		if !file.FileInfo().IsDir() && accept(file.Name) {
			files = append(files, file)
		}
	}
	return files
}

func extractFollowers(zipReader *zip.Reader) (map[string]struct{}, int, error) {
	profiles := readProfiles(zipReader, followersFile, func(name string) bool {
		lower := strings.ToLower(baseName(name))
		return expectedDir.MatchString(name) && strings.HasSuffix(lower, ".json") &&
			strings.Contains(lower, "followers") && !strings.Contains(lower, "following")
	})

	followers := make(map[string]struct{}, len(profiles))
	for _, p := range profiles {
		followers[strings.ToLower(p.Username)] = struct{}{}
	}
	return followers, len(followers), nil
}

func extractFollowing(zipReader *zip.Reader) ([]NonFollower, int, error) {
	profiles := readProfiles(zipReader, followingFile, func(name string) bool {
		lower := strings.ToLower(baseName(name))
		return strings.HasSuffix(lower, ".json") && strings.Contains(lower, "following") &&
			!strings.Contains(lower, "followers") && !strings.Contains(lower, "hashtag")
	})

	following := make([]NonFollower, 0, len(profiles))
	for _, p := range profiles {
		following = append(following, NonFollower{
			Username:   p.Username,
			ProfileURL: p.ProfileURL,
			FollowedAt: p.Timestamp,
		})
	}
	return following, len(following), nil
}

// extractRecentActivity reads the optional request/unfollow lists. Missing
// files produce empty lists rather than errors.
func extractRecentActivity(zipReader *zip.Reader, following []NonFollower, followers map[string]struct{}) *RecentActivity {
	followingSet := make(map[string]struct{}, len(following))
	for _, f := range following {
		followingSet[strings.ToLower(f.Username)] = struct{}{}
	}

	pending := readProfiles(zipReader, pendingFile, nil)
	pendingSet := make(map[string]struct{}, len(pending))
	for _, p := range pending {
		pendingSet[strings.ToLower(p.Username)] = struct{}{}
	}

	activity := &RecentActivity{
		FollowRequests:  []FollowRequest{},
		PendingRequests: append([]Profile{}, pending...),
		Unfollowed:      []UnfollowedProfile{},
	}

	for _, p := range readProfiles(zipReader, recentRequestsFile, nil) {
		key := strings.ToLower(p.Username)
		if _, ok := pendingSet[key]; ok {
			continue
		}
		status := RequestNotAccepted
		if _, ok := followingSet[key]; ok {
			status = RequestAccepted
		}
		activity.FollowRequests = append(activity.FollowRequests, FollowRequest{Profile: p, Status: status})
	}

	for _, p := range readProfiles(zipReader, unfollowedFile, nil) {
		_, followsYou := followers[strings.ToLower(p.Username)]
		activity.Unfollowed = append(activity.Unfollowed, UnfollowedProfile{Profile: p, FollowsYou: followsYou})
	}

	return activity
}

// isHTMLExport reports whether the zip looks like an export downloaded in
// HTML format, which carries the same lists as .html pages instead of JSON.
func isHTMLExport(zipReader *zip.Reader) bool {
	for _, file := range zipReader.File {
		lower := strings.ToLower(file.Name)
		if strings.HasSuffix(lower, ".html") && strings.Contains(lower, "follow") {
			return true
		}
	}
	return false
}
