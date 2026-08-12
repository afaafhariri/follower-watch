package main

import "testing"

var sampleFollowers = []byte(`[
  {"title": "", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/alice", "value": "alice", "timestamp": 1700000000}]},
  {"title": "", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/bob", "value": "bob", "timestamp": 1700000001}]}
]`)

var sampleFollowing = []byte(`{
  "relationships_following": [
    {"title": "alice", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/alice", "timestamp": 1700000000}]},
    {"title": "carol", "media_list_data": [], "string_list_data": [{"href": "https://www.instagram.com/carol", "timestamp": 1700000002}]}
  ]
}`)

func TestAnalyzeFiles(t *testing.T) {
	followers, following, err := analyzeFiles(map[string][]byte{
		"followers_1.json": sampleFollowers,
		"following.json":   sampleFollowing,
	})
	if err != nil {
		t.Fatalf("analyzeFiles: %v", err)
	}
	if len(followers) != 2 {
		t.Errorf("expected 2 followers, got %d", len(followers))
	}
	if _, ok := followers["alice"]; !ok {
		t.Errorf("expected alice in followers")
	}
	if len(following) != 2 {
		t.Fatalf("expected 2 following, got %d", len(following))
	}

	nf := nonFollowers(following, followers)
	if len(nf) != 1 || nf[0].Username != "carol" {
		t.Errorf("expected carol as the only non-follower, got %+v", nf)
	}
}

func TestDiffFollowers(t *testing.T) {
	current := map[string]struct{}{"alice": {}, "dave": {}}
	unfollowed, gained := diffFollowers([]string{"alice", "bob"}, current)
	if len(unfollowed) != 1 || unfollowed[0] != "bob" {
		t.Errorf("expected bob to be unfollowed, got %v", unfollowed)
	}
	if len(gained) != 1 || gained[0] != "dave" {
		t.Errorf("expected dave to be gained, got %v", gained)
	}
}
