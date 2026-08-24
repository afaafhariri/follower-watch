package main

import (
	"fmt"
	"strings"
	"testing"

	"google.golang.org/api/drive/v3"
)

func TestIsSnapshot(t *testing.T) {
	tests := []struct {
		name   string
		parsed int
		known  int
		want   bool
	}{
		// The real numbers from meta-2026-Aug-18..22: a couple of new
		// followers against a stored set of ~700.
		{"incremental export against a large set", 1, 698, false},
		{"incremental export, three new", 3, 698, false},
		{"first run has nothing to compare against", 698, 0, true},
		{"full export, slightly grown", 701, 698, true},
		{"full export after real losses", 400, 698, true},
		{"suspicious collapse is treated as incremental", 300, 698, false},
		{"small account, full export", 10, 10, true},
		{"small account, one new follower", 1, 10, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isSnapshot(tt.parsed, tt.known); got != tt.want {
				t.Errorf("isSnapshot(%d, %d) = %v, want %v", tt.parsed, tt.known, got, tt.want)
			}
		})
	}
}

func TestDiffSets(t *testing.T) {
	removed, added := diffSets(
		map[string]struct{}{"alice": {}, "bob": {}},
		map[string]struct{}{"alice": {}, "dave": {}},
	)
	if len(removed) != 1 || removed[0] != "bob" {
		t.Errorf("expected bob removed, got %v", removed)
	}
	if len(added) != 1 || added[0] != "dave" {
		t.Errorf("expected dave added, got %v", added)
	}
}

// largeState builds a previous state with n synthetic followers.
func largeState(n int) *state {
	s := &state{
		LastFolder:     "meta-2026-Aug-12-10-02-29",
		UpdatedAt:      "2026-08-12T18:02:54Z",
		SnapshotFolder: "meta-2026-Aug-12-10-02-29",
		SnapshotAt:     "2026-08-12T18:02:54Z",
		SnapshotCount:  n,
	}
	for i := 0; i < n; i++ {
		s.Followers = append(s.Followers, fmt.Sprintf("follower%04d", i))
	}
	return s
}

func parsedExport(followers []string, following []string) parseResult {
	res := parseResult{
		Followers:        map[string]struct{}{},
		SawFollowersFile: true,
		SawFollowingFile: len(following) > 0,
	}
	for _, u := range followers {
		res.Followers[u] = struct{}{}
		res.FollowerAccounts = append(res.FollowerAccounts, account{Username: u})
	}
	for _, u := range following {
		res.Following = append(res.Following, account{
			Username:   u,
			ProfileURL: "https://instagram.com/" + u,
		})
	}
	return res
}

// The regression this whole change exists for: an incremental export must
// never be read as "everybody unfollowed you".
func TestEvaluateIncrementalExportReportsNoUnfollowers(t *testing.T) {
	prev := largeState(698)
	parsed := parsedExport([]string{"newperson"}, []string{"follower0000", "someoneelse"})

	got := evaluate("meta-2026-Aug-18-23-23-00", prev, parsed)

	if got.snapshot {
		t.Fatal("a one-follower export must not be classified as a snapshot")
	}
	if len(got.unfollowed) != 0 {
		t.Errorf("expected no unfollowers from an incremental export, got %d", len(got.unfollowed))
	}
	if len(got.gained) != 1 || got.gained[0] != "newperson" {
		t.Errorf("expected newperson as the only new follower, got %v", got.gained)
	}
	if len(got.followers) != 699 {
		t.Errorf("expected the follower set to grow to 699, got %d", len(got.followers))
	}
}

func TestEvaluateSnapshotExportDiffs(t *testing.T) {
	prev := largeState(100)
	current := make([]string, 0, 100)
	for i := 2; i < 100; i++ { // follower0000 and follower0001 are gone
		current = append(current, fmt.Sprintf("follower%04d", i))
	}
	current = append(current, "brandnew")

	got := evaluate("meta-2026-Aug-24-00-00-00", prev, parsedExport(current, nil))

	if !got.snapshot {
		t.Fatal("a full follower list must be classified as a snapshot")
	}
	if len(got.unfollowed) != 2 {
		t.Errorf("expected 2 unfollowers, got %d (%v)", len(got.unfollowed), got.unfollowed)
	}
	if len(got.gained) != 1 || got.gained[0] != "brandnew" {
		t.Errorf("expected brandnew as the only new follower, got %v", got.gained)
	}
	if len(got.followers) != 99 {
		t.Errorf("expected the snapshot to replace the set (99), got %d", len(got.followers))
	}

	next := got.nextState()
	if next.SnapshotFolder != "meta-2026-Aug-24-00-00-00" || next.SnapshotCount != 99 {
		t.Errorf("expected the snapshot marker to advance, got %+v", next)
	}
}

// An incremental run must not move the snapshot marker: unfollower counts are
// still measured from the last full export.
func TestNextStateKeepsSnapshotMarkerOnIncremental(t *testing.T) {
	prev := largeState(698)
	got := evaluate("meta-2026-Aug-18-23-23-00", prev, parsedExport([]string{"newperson"}, nil))

	next := got.nextState()
	if next.SnapshotFolder != prev.SnapshotFolder || next.SnapshotAt != prev.SnapshotAt {
		t.Errorf("snapshot marker moved on an incremental export: %+v", next)
	}
	if next.LastFolder != "meta-2026-Aug-18-23-23-00" {
		t.Errorf("expected last_folder to advance, got %s", next.LastFolder)
	}
	if len(next.Followers) != 699 {
		t.Errorf("expected 699 followers persisted, got %d", len(next.Followers))
	}
}

// meta-2026-Aug-22 shipped no following.json at all.
func TestEvaluateExportWithoutFollowingFile(t *testing.T) {
	prev := largeState(698)
	parsed := parsedExport([]string{"newperson"}, nil)

	got := evaluate("meta-2026-Aug-22-22-44-54", prev, parsed)

	_, body := buildReport(got)
	if !strings.Contains(body, "no following.json") {
		t.Errorf("expected the report to explain the missing following list, got:\n%s", body)
	}
	if strings.Contains(body, "Not following you back") {
		t.Error("the not-following-back list must be omitted when following.json is absent")
	}
}

func TestEvaluateExportWithoutFollowerFile(t *testing.T) {
	prev := largeState(698)
	parsed := parseResult{
		Followers:        map[string]struct{}{},
		SawFollowingFile: true,
		Following:        []account{{Username: "follower0000"}, {Username: "stranger"}},
	}

	got := evaluate("meta-2026-Aug-25-00-00-00", prev, parsed)

	if got.hasFollowerData {
		t.Fatal("expected hasFollowerData to be false")
	}
	if len(got.followers) != 698 {
		t.Errorf("expected the stored follower set to be preserved, got %d", len(got.followers))
	}
	subject, _ := buildReport(got)
	if !strings.Contains(subject, "no follower list") {
		t.Errorf("unexpected subject: %s", subject)
	}
}

func TestBuildReportIncrementalWording(t *testing.T) {
	prev := largeState(698)
	got := evaluate("meta-2026-Aug-18-23-23-00", prev,
		parsedExport([]string{"newperson"}, []string{"follower0000", "stranger"}))

	subject, body := buildReport(got)

	if subject != "Follower Watch: 1 new follower" {
		t.Errorf("unexpected subject: %s", subject)
	}
	if strings.Contains(strings.ToLower(subject), "unfollow") {
		t.Errorf("an incremental run must not claim unfollowers in the subject: %s", subject)
	}
	if !strings.Contains(body, "incremental export") {
		t.Errorf("expected the body to say the export was incremental, got:\n%s", body)
	}
	// stranger isn't in the follower set, follower0000 is.
	if !strings.Contains(body, "Not following you back (1)") {
		t.Errorf("expected one non-follower, got:\n%s", body)
	}
}

func TestBuildReportBaseline(t *testing.T) {
	got := evaluate("meta-2026-Aug-12-10-02-29", nil,
		parsedExport([]string{"alice", "bob"}, []string{"alice", "carol"}))

	subject, body := buildReport(got)
	if !strings.Contains(subject, "baseline saved") {
		t.Errorf("unexpected subject: %s", subject)
	}
	if strings.Contains(body, "Unfollowed you") {
		t.Error("the baseline run must not report unfollowers")
	}
}

func exportFolders(names ...string) []*drive.File {
	var out []*drive.File
	for _, n := range names {
		out = append(out, &drive.File{Name: n})
	}
	return out
}

func TestExportsToProcess(t *testing.T) {
	all := exportFolders("meta-A", "meta-B", "meta-C")

	if got := exportsToProcess(all, nil); len(got) != 3 {
		t.Errorf("no state: expected all 3 exports, got %d", len(got))
	}
	got := exportsToProcess(all, &state{LastFolder: "meta-B"})
	if len(got) != 1 || got[0].Name != "meta-C" {
		t.Errorf("expected only meta-C, got %v", got)
	}
	if got := exportsToProcess(all, &state{LastFolder: "meta-C"}); len(got) != 0 {
		t.Errorf("expected nothing pending, got %d", len(got))
	}
	// A state pointing at an export that has aged out of Drive: everything
	// still there is newer, so all of it must be folded in.
	if got := exportsToProcess(all, &state{LastFolder: "meta-2026-Aug-12"}); len(got) != 3 {
		t.Errorf("expected all 3 exports when the marker is gone, got %d", len(got))
	}
}

// Catching up on several missed nights must not lose the followers each
// incremental export carried, and must not invent unfollowers.
func TestAggregateIncrementalBatch(t *testing.T) {
	prev := largeState(698)

	first := evaluate("meta-day1", prev, parsedExport([]string{"newone"}, []string{"follower0000"}))
	second := evaluate("meta-day2", first.nextState(), parsedExport([]string{"newtwo"}, nil))
	third := evaluate("meta-day3", second.nextState(), parsedExport([]string{"newthree"}, []string{"follower0000", "stranger"}))

	batch := aggregate(prev, []runResult{first, second, third})

	if batch.snapshot {
		t.Error("a batch of incremental exports must not be reported as a snapshot")
	}
	if len(batch.unfollowed) != 0 {
		t.Errorf("expected no unfollowers, got %v", batch.unfollowed)
	}
	if len(batch.gained) != 3 {
		t.Errorf("expected all 3 new followers across the batch, got %v", batch.gained)
	}
	if len(batch.followers) != 701 {
		t.Errorf("expected 701 followers after the batch, got %d", len(batch.followers))
	}
	if !batch.parsed.SawFollowingFile {
		t.Error("expected the following list from the newest export that had one")
	}

	subject, body := buildReport(batch)
	if !strings.Contains(subject, "3 new followers") {
		t.Errorf("unexpected subject: %s", subject)
	}
	if !strings.Contains(body, "Not following you back (1)") {
		t.Errorf("expected stranger as the only non-follower, got:\n%s", body)
	}
}

// A batch where a full export lands after some incremental ones must still
// report real unfollowers.
func TestAggregateBatchWithSnapshot(t *testing.T) {
	prev := largeState(100)

	incremental := evaluate("meta-day1", prev, parsedExport([]string{"newone"}, nil))

	full := make([]string, 0, 100)
	for i := 3; i < 100; i++ { // three of the original followers are gone
		full = append(full, fmt.Sprintf("follower%04d", i))
	}
	snapshot := evaluate("meta-day2", incremental.nextState(), parsedExport(full, nil))

	batch := aggregate(prev, []runResult{incremental, snapshot})

	if !batch.snapshot {
		t.Fatal("expected the batch to count as a snapshot")
	}
	if len(batch.unfollowed) != 3 {
		t.Errorf("expected 3 unfollowers, got %d (%v)", len(batch.unfollowed), batch.unfollowed)
	}
	subject, _ := buildReport(batch)
	if !strings.Contains(subject, "3 people unfollowed you") {
		t.Errorf("unexpected subject: %s", subject)
	}
}
