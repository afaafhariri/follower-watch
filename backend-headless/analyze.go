package main

import "sort"

// minSnapshotSize is the floor for treating an export as a full follower list.
// It stops a handful of new followers from being mistaken for a snapshot on an
// account that only has a few followers to begin with.
const minSnapshotSize = 25

// isSnapshot decides whether the follower list in an export is the complete
// set or one of Meta's incremental updates.
//
// A recurring export carries only the followers gained since the previous one —
// typically one to three entries against a stored set in the hundreds — so the
// two cases are separated by orders of magnitude and the threshold never sits
// near the boundary.
//
// The bias is deliberate: when the call is close, treat the export as a delta.
// Mistaking a delta for a snapshot reports everyone as an unfollower, while
// mistaking a snapshot for a delta only costs one night's unfollower report.
func isSnapshot(parsed, known int) bool {
	if known == 0 {
		return true // nothing to compare against; this export defines the baseline
	}
	floor := minSnapshotSize
	if known < floor {
		floor = known
	}
	threshold := known / 2
	if threshold < floor {
		threshold = floor
	}
	return parsed >= threshold
}

func setOf(usernames []string) map[string]struct{} {
	set := make(map[string]struct{}, len(usernames))
	for _, u := range usernames {
		set[u] = struct{}{}
	}
	return set
}

func union(a, b map[string]struct{}) map[string]struct{} {
	out := make(map[string]struct{}, len(a)+len(b))
	for u := range a {
		out[u] = struct{}{}
	}
	for u := range b {
		out[u] = struct{}{}
	}
	return out
}

func sortedKeys(set map[string]struct{}) []string {
	out := make([]string, 0, len(set))
	for u := range set {
		out = append(out, u)
	}
	sort.Strings(out)
	return out
}

// diffSets reports who is in previous but not current (removed) and who is in
// current but not previous (added), both sorted.
func diffSets(previous, current map[string]struct{}) (removed, added []string) {
	for u := range previous {
		if _, ok := current[u]; !ok {
			removed = append(removed, u)
		}
	}
	for u := range current {
		if _, ok := previous[u]; !ok {
			added = append(added, u)
		}
	}
	sort.Strings(removed)
	sort.Strings(added)
	return removed, added
}
