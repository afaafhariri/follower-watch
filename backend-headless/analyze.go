package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"sort"
	"strings"
)

// Same export shapes the main backend parses in backend/instagram.go.
type instagramRelationship struct {
	Title          string `json:"title"`
	StringListData []struct {
		Href      string `json:"href"`
		Value     string `json:"value"`
		Timestamp int64  `json:"timestamp"`
	} `json:"string_list_data"`
}

type followingData struct {
	RelationshipsFollowing []instagramRelationship `json:"relationships_following"`
}

type account struct {
	Username   string
	ProfileURL string
}

var (
	followersFilePattern = regexp.MustCompile(`(?i)^followers(_\d+)?\.json$`)
	followingFilePattern = regexp.MustCompile(`(?i)^following\.json$`)
)

func usernameOf(rel instagramRelationship) string {
	// Followers files put the username in string_list_data[].value;
	// following entries put it in title.
	if len(rel.StringListData) > 0 && rel.StringListData[0].Value != "" {
		return rel.StringListData[0].Value
	}
	return rel.Title
}

// analyzeFiles parses the followers_and_following JSON files (keyed by file
// name) into the follower username set and the following list.
func analyzeFiles(files map[string][]byte) (map[string]struct{}, []account, error) {
	followers := make(map[string]struct{})
	var following []account

	for name, content := range files {
		switch {
		case followersFilePattern.MatchString(name):
			var rels []instagramRelationship
			if err := json.Unmarshal(content, &rels); err != nil {
				var single instagramRelationship
				if err2 := json.Unmarshal(content, &single); err2 != nil {
					return nil, nil, fmt.Errorf("parsing %s: %w", name, err)
				}
				rels = []instagramRelationship{single}
			}
			for _, rel := range rels {
				if u := usernameOf(rel); u != "" {
					followers[strings.ToLower(u)] = struct{}{}
				}
			}

		case followingFilePattern.MatchString(name):
			var fd followingData
			rels := fd.RelationshipsFollowing
			if err := json.Unmarshal(content, &fd); err == nil && len(fd.RelationshipsFollowing) > 0 {
				rels = fd.RelationshipsFollowing
			} else {
				var list []instagramRelationship
				if err := json.Unmarshal(content, &list); err != nil {
					return nil, nil, fmt.Errorf("parsing %s: %w", name, err)
				}
				rels = list
			}
			for _, rel := range rels {
				if u := usernameOf(rel); u != "" {
					following = append(following, account{
						Username:   u,
						ProfileURL: "https://instagram.com/" + u,
					})
				}
			}
		}
	}

	return followers, following, nil
}

// nonFollowers returns accounts you follow that don't follow you back.
func nonFollowers(following []account, followers map[string]struct{}) []account {
	var out []account
	for _, acc := range following {
		if _, ok := followers[strings.ToLower(acc.Username)]; !ok {
			out = append(out, acc)
		}
	}
	return out
}

// diffFollowers compares the previous follower list with the current set and
// returns who unfollowed and who is new, sorted.
func diffFollowers(previous []string, current map[string]struct{}) (unfollowed, gained []string) {
	prevSet := make(map[string]struct{}, len(previous))
	for _, u := range previous {
		prevSet[u] = struct{}{}
		if _, ok := current[u]; !ok {
			unfollowed = append(unfollowed, u)
		}
	}
	for u := range current {
		if _, ok := prevSet[u]; !ok {
			gained = append(gained, u)
		}
	}
	sort.Strings(unfollowed)
	sort.Strings(gained)
	return unfollowed, gained
}
