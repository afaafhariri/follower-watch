package main

import "testing"

var (
	sampleFollowers = []byte(`[
	  {"title": "", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/alice", "value": "alice", "timestamp": 1700000000}]},
	  {"title": "", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/bob", "value": "bob", "timestamp": 1700000001}]}
	]`)

	// Meta drops the array when a recurring export contains exactly one new
	// follower; this is the real shape seen in meta-2026-Aug-21.
	sampleSingleFollower = []byte(`{"title": "", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/carol", "value": "carol", "timestamp": 1700000002}]}`)

	sampleFollowing = []byte(`{
	  "relationships_following": [
	    {"title": "alice", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/alice", "timestamp": 1700000000}]},
	    {"title": "dave", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/dave", "timestamp": 1700000003}]}
	  ]
	}`)
)

func TestParseFiles(t *testing.T) {
	res, err := parseFiles(map[string][]byte{
		"followers_1.json": sampleFollowers,
		"following.json":   sampleFollowing,
	})
	if err != nil {
		t.Fatalf("parseFiles: %v", err)
	}
	if len(res.Errors) != 0 {
		t.Fatalf("unexpected parse errors: %v", res.Errors)
	}
	if len(res.Followers) != 2 {
		t.Errorf("expected 2 followers, got %d", len(res.Followers))
	}
	if _, ok := res.Followers["alice"]; !ok {
		t.Error("expected alice in followers")
	}
	if len(res.Following) != 2 {
		t.Fatalf("expected 2 following, got %d", len(res.Following))
	}
	if res.Following[0].FollowedAt != 1700000000 {
		t.Errorf("expected the follow timestamp to survive, got %d", res.Following[0].FollowedAt)
	}

	nf := nonFollowers(res.Following, res.Followers)
	if len(nf) != 1 || nf[0].Username != "dave" {
		t.Errorf("expected dave as the only non-follower, got %+v", nf)
	}
}

func TestParseFilesSingleFollowerObject(t *testing.T) {
	res, err := parseFiles(map[string][]byte{"followers_1.json": sampleSingleFollower})
	if err != nil {
		t.Fatalf("parseFiles: %v", err)
	}
	if len(res.Errors) != 0 {
		t.Fatalf("unexpected parse errors: %v", res.Errors)
	}
	if len(res.Followers) != 1 {
		t.Fatalf("expected 1 follower, got %d", len(res.Followers))
	}
	if _, ok := res.Followers["carol"]; !ok {
		t.Error("expected carol in followers")
	}
}

// A file of an unexpected shape must be reported, not silently read as an
// empty follower list — that is what turned a delta export into "699 people
// unfollowed you".
func TestParseFilesRejectsForeignObject(t *testing.T) {
	res, err := parseFiles(map[string][]byte{
		"followers_1.json": []byte(`{"label_values": [], "fbid": "1", "timestamp": 1}`),
	})
	if err != nil {
		t.Fatalf("parseFiles: %v", err)
	}
	if len(res.Errors) == 0 {
		t.Fatal("expected a parse error for an unrecognised object shape")
	}
	if len(res.Followers) != 0 {
		t.Errorf("expected no followers, got %d", len(res.Followers))
	}
}

func TestFileMatching(t *testing.T) {
	followers := []string{"followers_1.json", "followers.json", "FOLLOWERS_2.JSON",
		"connections/followers_and_following/followers_1.json"}
	following := []string{"following.json", "connections/followers_and_following/following.json"}
	neither := []string{
		"follow_requests_you've_received.json",
		"recent_follow_requests.json",
		"pending_follow_requests.json",
		"recently_unfollowed_accounts.json",
		"close_friends.json",
		"blocked_accounts.json",
	}

	for _, n := range followers {
		if !isFollowersFile(n) || isFollowingFile(n) {
			t.Errorf("%s should match followers only", n)
		}
	}
	for _, n := range following {
		if !isFollowingFile(n) || isFollowersFile(n) {
			t.Errorf("%s should match following only", n)
		}
	}
	for _, n := range neither {
		if isFollowersFile(n) || isFollowingFile(n) {
			t.Errorf("%s should match neither", n)
		}
	}
}

func TestParseFilesMissingFollowingFile(t *testing.T) {
	res, err := parseFiles(map[string][]byte{"followers_1.json": sampleFollowers})
	if err != nil {
		t.Fatalf("parseFiles: %v", err)
	}
	if !res.SawFollowersFile || res.SawFollowingFile {
		t.Errorf("expected followers seen, following absent; got %v/%v",
			res.SawFollowersFile, res.SawFollowingFile)
	}
}

func TestParseFilesNothingUsable(t *testing.T) {
	if _, err := parseFiles(map[string][]byte{"close_friends.json": []byte(`[]`)}); err == nil {
		t.Fatal("expected an error when no followers/following files are present")
	}
}
