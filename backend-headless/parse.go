package main

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
)

// Parsing of Meta's Instagram export, matching backend/instagram.go: the same
// file names, the same JSON shapes, the same "anyone you follow who isn't in
// your follower set doesn't follow you back" rule.

// relationship is one entry in Meta's followers_*.json / following.json.
type relationship struct {
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

// followingFile is the object wrapper Meta uses for following.json.
type followingFile struct {
	RelationshipsFollowing []relationship `json:"relationships_following"`
}

// account is a single Instagram account named in the export.
type account struct {
	Username   string
	ProfileURL string
	FollowedAt int64
}

// parseResult is a parsed export.
type parseResult struct {
	// Followers holds lowercased usernames, for set comparison.
	Followers map[string]struct{}
	// FollowerAccounts holds the same accounts with their original casing and
	// the timestamp they followed you.
	FollowerAccounts []account
	// Following holds the accounts you follow, in export order.
	Following []account
	// Errors holds per-file parse failures; the file itself is skipped.
	Errors []error
	// SawFollowersFile and SawFollowingFile record whether a file of each kind
	// was present at all, which is not the same as it being empty. Meta's
	// recurring export sometimes omits one of them entirely.
	SawFollowersFile bool
	SawFollowingFile bool
}

func baseName(name string) string {
	if i := strings.LastIndex(name, "/"); i != -1 {
		name = name[i+1:]
	}
	return strings.ToLower(name)
}

// isFollowersFile matches followers.json, followers_1.json and so on: any JSON
// file whose name mentions "followers" but not "following".
func isFollowersFile(name string) bool {
	b := baseName(name)
	return strings.HasSuffix(b, ".json") &&
		strings.Contains(b, "followers") &&
		!strings.Contains(b, "following")
}

// isFollowingFile matches following.json. It deliberately does not match the
// other connection files Meta ships (follow_requests_*, recently_unfollowed_*).
func isFollowingFile(name string) bool {
	b := baseName(name)
	return strings.HasSuffix(b, ".json") &&
		strings.Contains(b, "following") &&
		!strings.Contains(b, "followers")
}

// usernameOf returns the account name for an entry. Followers files carry it
// in string_list_data[].value; following entries carry it in title.
func usernameOf(rel relationship) string {
	if len(rel.StringListData) > 0 && rel.StringListData[0].Value != "" {
		return rel.StringListData[0].Value
	}
	return rel.Title
}

func accountOf(rel relationship) (account, bool) {
	u := usernameOf(rel)
	if u == "" {
		return account{}, false
	}
	var ts int64
	if len(rel.StringListData) > 0 {
		ts = rel.StringListData[0].Timestamp
	}
	return account{
		Username:   u,
		ProfileURL: "https://instagram.com/" + u,
		FollowedAt: ts,
	}, true
}

// parseRelationships accepts either a JSON array of entries or a single entry
// object, which is what Meta sends when there is only one.
//
// The single-object fallback needs the username check: Go unmarshals any JSON
// object into relationship without complaint, so a file of some other shape
// would otherwise parse "successfully" into zero accounts and look like an
// empty follower list rather than a failure.
func parseRelationships(content []byte) ([]relationship, error) {
	var list []relationship
	if err := json.Unmarshal(content, &list); err == nil {
		return list, nil
	}
	var single relationship
	if err := json.Unmarshal(content, &single); err != nil {
		return nil, err
	}
	if usernameOf(single) == "" {
		return nil, fmt.Errorf("unrecognised shape: neither an array of entries nor a single entry")
	}
	return []relationship{single}, nil
}

// parseFollowing handles following.json, which Meta wraps in an object.
func parseFollowing(content []byte) ([]relationship, error) {
	var wrapped followingFile
	if err := json.Unmarshal(content, &wrapped); err == nil && len(wrapped.RelationshipsFollowing) > 0 {
		return wrapped.RelationshipsFollowing, nil
	}
	return parseRelationships(content)
}

// parseFiles parses export files keyed by name. Names may be bare file names
// or full paths; only the last path segment is matched.
func parseFiles(files map[string][]byte) (parseResult, error) {
	res := parseResult{Followers: make(map[string]struct{})}

	// Deterministic order, so a duplicated account always resolves to the same
	// entry regardless of map iteration order.
	names := make([]string, 0, len(files))
	for name := range files {
		names = append(names, name)
	}
	sort.Strings(names)

	seenFollowing := make(map[string]struct{})

	for _, name := range names {
		switch {
		case isFollowersFile(name):
			res.SawFollowersFile = true
			rels, err := parseRelationships(files[name])
			if err != nil {
				res.Errors = append(res.Errors, fmt.Errorf("parsing %s: %w", name, err))
				continue
			}
			for _, rel := range rels {
				acc, ok := accountOf(rel)
				if !ok {
					continue
				}
				key := strings.ToLower(acc.Username)
				if _, dup := res.Followers[key]; dup {
					continue
				}
				res.Followers[key] = struct{}{}
				res.FollowerAccounts = append(res.FollowerAccounts, acc)
			}

		case isFollowingFile(name):
			res.SawFollowingFile = true
			rels, err := parseFollowing(files[name])
			if err != nil {
				res.Errors = append(res.Errors, fmt.Errorf("parsing %s: %w", name, err))
				continue
			}
			for _, rel := range rels {
				acc, ok := accountOf(rel)
				if !ok {
					continue
				}
				key := strings.ToLower(acc.Username)
				if _, dup := seenFollowing[key]; dup {
					continue
				}
				seenFollowing[key] = struct{}{}
				res.Following = append(res.Following, acc)
			}
		}
	}

	if !res.SawFollowersFile && !res.SawFollowingFile {
		return res, fmt.Errorf("no followers or following files found in export")
	}
	return res, nil
}

// nonFollowers returns the accounts you follow that don't follow you back.
func nonFollowers(following []account, followers map[string]struct{}) []account {
	var out []account
	for _, acc := range following {
		if _, ok := followers[strings.ToLower(acc.Username)]; !ok {
			out = append(out, acc)
		}
	}
	return out
}
