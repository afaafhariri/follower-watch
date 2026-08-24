package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

// runResult is everything one pipeline run worked out, ready to be rendered
// into an email and written back as the new state.
type runResult struct {
	exportName string
	prev       *state
	parsed     parseResult

	// snapshot is true when the export carried a full follower list rather
	// than one of Meta's incremental updates.
	snapshot bool
	// hasFollowerData is false when the export shipped no usable follower file
	// at all, which Meta does from time to time.
	hasFollowerData bool

	// followers is the best-known follower set after folding this export in.
	followers  map[string]struct{}
	gained     []string
	unfollowed []string // only meaningful when snapshot is true
}

// runPipeline executes one full cycle: fold every export it hasn't seen yet
// into the follower set, email the report, save state.
func runPipeline(ctx context.Context, dryRun bool) error {
	svc, err := newDriveService(ctx)
	if err != nil {
		return err
	}

	all, err := listExports(svc)
	if err != nil {
		return err
	}

	prev, err := loadState()
	if err != nil {
		return fmt.Errorf("loading state: %w", err)
	}

	pending := exportsToProcess(all, prev)
	if len(pending) == 0 {
		newest := all[len(all)-1]
		if !dryRun {
			log.Printf("Export %s already processed on %s; nothing to do", newest.Name, prev.UpdatedAt)
			return nil
		}
		// A dry run should always show something, so re-read the newest export.
		pending = all[len(all)-1:]
	}

	names := make([]string, 0, len(pending))
	for _, exp := range pending {
		names = append(names, exp.Name)
	}
	log.Printf("Processing %d export(s): %s", len(pending), strings.Join(names, ", "))

	current := prev
	var results []runResult
	for _, exp := range pending {
		files, err := fetchFollowerFiles(svc, exp.Id)
		if err != nil {
			return err
		}
		parsed, err := parseFiles(files)
		if err != nil {
			return fmt.Errorf("%s: %w", exp.Name, err)
		}
		// A file we matched but could not read would leave a partial follower
		// set, which is exactly the input that produces a bogus unfollower
		// report. Stop rather than email a guess.
		if len(parsed.Errors) > 0 {
			return fmt.Errorf("unreadable export files in %s: %v", exp.Name, parsed.Errors)
		}

		r := evaluate(exp.Name, current, parsed)
		log.Printf("%s: %d followers (%s), %d following; follower set now %d",
			exp.Name, len(parsed.Followers), describeKind(r), len(parsed.Following), len(r.followers))
		results = append(results, r)
		current = r.nextState()
	}

	subject, body := buildReport(aggregate(prev, results))

	if dryRun {
		fmt.Printf("\n--- DRY RUN: no email sent, no state saved ---\nSubject: %s\n\n%s\n", subject, body)
		return nil
	}

	if err := sendEmail(subject, body); err != nil {
		return fmt.Errorf("sending email: %w", err)
	}
	log.Printf("Report emailed: %s", subject)

	if err := saveState(current); err != nil {
		return fmt.Errorf("saving state: %w", err)
	}
	return nil
}

// aggregate folds several exports into a single report: what changed between
// the state the run started from and the state it ended with.
func aggregate(prev *state, results []runResult) runResult {
	last := results[len(results)-1]
	if len(results) == 1 {
		return last
	}

	out := last
	out.prev = prev
	out.exportName = fmt.Sprintf("%s (%d exports)", last.exportName, len(results))
	out.snapshot = false
	out.hasFollowerData = false
	for _, r := range results {
		out.snapshot = out.snapshot || r.snapshot
		out.hasFollowerData = out.hasFollowerData || r.hasFollowerData
		// Report against the newest export that actually carried a following
		// list, so one night missing following.json doesn't blank the section.
		if r.parsed.SawFollowingFile {
			out.parsed = r.parsed
		}
	}

	known := map[string]struct{}{}
	if prev != nil {
		known = setOf(prev.Followers)
	}
	out.unfollowed, out.gained = diffSets(known, out.followers)
	if !out.snapshot {
		// Incremental exports only ever add. A name missing from them says
		// nothing about whether that person is still following.
		out.unfollowed = nil
	}
	return out
}

// evaluate folds a parsed export into what we already knew.
func evaluate(exportName string, prev *state, parsed parseResult) runResult {
	res := runResult{
		exportName:      exportName,
		prev:            prev,
		parsed:          parsed,
		hasFollowerData: parsed.SawFollowersFile && len(parsed.Followers) > 0,
	}

	var known map[string]struct{}
	if prev != nil {
		known = setOf(prev.Followers)
	} else {
		known = map[string]struct{}{}
	}

	switch {
	case !res.hasFollowerData:
		// Nothing to learn about followers; keep what we already had.
		res.followers = known

	case isSnapshot(len(parsed.Followers), len(known)):
		res.snapshot = true
		res.followers = parsed.Followers
		res.unfollowed, res.gained = diffSets(known, parsed.Followers)

	default:
		// Incremental export: it can only tell us about arrivals.
		res.followers = union(known, parsed.Followers)
		_, res.gained = diffSets(known, parsed.Followers)
	}

	return res
}

// nextState is the snapshot to persist after this run.
func (r runResult) nextState() *state {
	now := time.Now().UTC().Format(time.RFC3339)
	next := &state{
		LastFolder: r.exportName,
		UpdatedAt:  now,
		Followers:  sortedKeys(r.followers),
	}
	if r.prev != nil {
		next.SnapshotFolder = r.prev.SnapshotFolder
		next.SnapshotAt = r.prev.SnapshotAt
		next.SnapshotCount = r.prev.SnapshotCount
	}
	if r.snapshot {
		next.SnapshotFolder = r.exportName
		next.SnapshotAt = now
		next.SnapshotCount = len(r.parsed.Followers)
	}
	return next
}

// isBaseline reports whether this is the first run, where there is nothing to
// compare against yet.
func (r runResult) isBaseline() bool {
	return r.prev == nil
}

func describeKind(r runResult) string {
	switch {
	case !r.hasFollowerData:
		return "no follower list in this export"
	case r.snapshot:
		return "full snapshot"
	default:
		return "incremental update"
	}
}

func buildReport(r runResult) (subject, body string) {
	var b strings.Builder

	fmt.Fprintf(&b, "Follower Watch — %s\n\n", r.exportName)

	switch {
	case r.isBaseline():
		subject = fmt.Sprintf("Follower Watch: baseline saved (%d followers)", len(r.followers))
		fmt.Fprintf(&b, "First run: recorded a baseline of %d followers.\n", len(r.followers))
		b.WriteString("Unfollower tracking starts from the next export.\n\n")

	case !r.hasFollowerData:
		subject = "Follower Watch: export had no follower list"
		b.WriteString("This export contained no follower data, so the stored follower set is\n")
		b.WriteString("unchanged and nothing can be said about arrivals or departures tonight.\n\n")

	case r.snapshot:
		switch len(r.unfollowed) {
		case 0:
			subject = "Follower Watch: no unfollowers 🎉"
		case 1:
			subject = "Follower Watch: 1 person unfollowed you"
		default:
			subject = fmt.Sprintf("Follower Watch: %d people unfollowed you", len(r.unfollowed))
		}
		b.WriteString("This export carried a full follower list.\n\n")
		if r.prev != nil {
			since := r.prev.SnapshotFolder
			if since == "" {
				since = r.prev.LastFolder
			}
			fmt.Fprintf(&b, "Compared against %s (%s):\n\n", since, r.prev.UpdatedAt)
		}
		writeList(&b, "Unfollowed you", r.unfollowed)
		writeList(&b, "New followers", r.gained)

	default:
		switch len(r.gained) {
		case 0:
			subject = "Follower Watch: no new followers"
		case 1:
			subject = "Follower Watch: 1 new follower"
		default:
			subject = fmt.Sprintf("Follower Watch: %d new followers", len(r.gained))
		}
		b.WriteString("Meta sent an incremental export: it lists only the followers gained\n")
		b.WriteString("since the previous one, not your full follower list. Unfollowers cannot\n")
		b.WriteString("be detected from it — that needs a full export.\n")
		if r.prev != nil && r.prev.SnapshotFolder != "" {
			fmt.Fprintf(&b, "Last full export: %s (%s, %d followers).\n",
				r.prev.SnapshotFolder, r.prev.SnapshotAt, r.prev.SnapshotCount)
		}
		b.WriteString("\n")
		writeList(&b, "New followers", r.gained)
	}

	fmt.Fprintf(&b, "Followers: %d", len(r.followers))
	if !r.snapshot && !r.isBaseline() {
		b.WriteString(" (best known)")
	}
	b.WriteString("\n")

	if r.parsed.SawFollowingFile {
		fmt.Fprintf(&b, "Following: %d\n\n", len(r.parsed.Following))
		nf := nonFollowers(r.parsed.Following, r.followers)
		writeAccounts(&b, "Not following you back", nf)
		if !r.snapshot && !r.isBaseline() {
			b.WriteString("This list is based on the follower set as of the last full export plus\n")
			b.WriteString("every incremental update since, so it can only understate: everyone\n")
			b.WriteString("listed genuinely doesn't follow you back, but someone who quietly\n")
			b.WriteString("unfollowed since then may be missing.\n")
		}
	} else {
		b.WriteString("\nThis export contained no following.json, so the not-following-back list\n")
		b.WriteString("is unavailable tonight.\n")
	}

	return subject, b.String()
}

func writeList(b *strings.Builder, heading string, usernames []string) {
	fmt.Fprintf(b, "%s (%d):\n", heading, len(usernames))
	if len(usernames) == 0 {
		b.WriteString("  none\n\n")
		return
	}
	for _, u := range usernames {
		fmt.Fprintf(b, "  - %s (https://instagram.com/%s)\n", u, u)
	}
	b.WriteString("\n")
}

func writeAccounts(b *strings.Builder, heading string, accounts []account) {
	fmt.Fprintf(b, "%s (%d):\n", heading, len(accounts))
	if len(accounts) == 0 {
		b.WriteString("  none\n\n")
		return
	}
	for _, acc := range accounts {
		fmt.Fprintf(b, "  - %s (%s)\n", acc.Username, acc.ProfileURL)
	}
	b.WriteString("\n")
}
