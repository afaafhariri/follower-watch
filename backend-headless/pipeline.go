package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"
)

// runPipeline executes one full cycle: find the latest export on Drive,
// parse it, diff against the previous snapshot, email the report, save state.
func runPipeline(ctx context.Context) error {
	svc, err := newDriveService(ctx)
	if err != nil {
		return err
	}

	export, err := findLatestExport(svc)
	if err != nil {
		return err
	}
	log.Printf("Latest export folder: %s (created %s)", export.Name, export.CreatedTime)

	prev, err := loadState()
	if err != nil {
		return fmt.Errorf("loading state: %w", err)
	}
	if prev != nil && prev.LastFolder == export.Name {
		log.Printf("Export %s already processed on %s; nothing to do", export.Name, prev.UpdatedAt)
		return nil
	}

	files, err := fetchFollowerFiles(svc, export.Id)
	if err != nil {
		return err
	}
	log.Printf("Downloaded %d JSON files from %s", len(files), export.Name)

	followers, following, err := analyzeFiles(files)
	if err != nil {
		return err
	}
	if len(followers) == 0 {
		return fmt.Errorf("no followers found in export %s", export.Name)
	}
	if len(following) == 0 {
		return fmt.Errorf("no following found in export %s", export.Name)
	}
	log.Printf("Parsed %d followers, %d following", len(followers), len(following))

	subject, body := buildReport(export.Name, prev, followers, following)
	if err := sendEmail(subject, body); err != nil {
		return fmt.Errorf("sending email: %w", err)
	}
	log.Printf("Report emailed: %s", subject)

	current := make([]string, 0, len(followers))
	for u := range followers {
		current = append(current, u)
	}
	if err := saveState(&state{
		LastFolder: export.Name,
		UpdatedAt:  time.Now().Format(time.RFC3339),
		Followers:  current,
	}); err != nil {
		return fmt.Errorf("saving state: %w", err)
	}
	return nil
}

func buildReport(exportName string, prev *state, followers map[string]struct{}, following []account) (subject, body string) {
	var b strings.Builder
	nf := nonFollowers(following, followers)

	fmt.Fprintf(&b, "Follower Watch report for export %s\n\n", exportName)
	fmt.Fprintf(&b, "Followers: %d\nFollowing: %d\n\n", len(followers), len(following))

	if prev == nil {
		subject = fmt.Sprintf("Follower Watch: baseline saved (%d followers)", len(followers))
		b.WriteString("This is the first run, so there is no previous snapshot to compare against.\n")
		b.WriteString("Unfollower tracking starts from the next export.\n\n")
	} else {
		unfollowed, gained := diffFollowers(prev.Followers, followers)
		switch len(unfollowed) {
		case 0:
			subject = "Follower Watch: no unfollowers 🎉"
		case 1:
			subject = "Follower Watch: 1 person unfollowed you"
		default:
			subject = fmt.Sprintf("Follower Watch: %d people unfollowed you", len(unfollowed))
		}

		fmt.Fprintf(&b, "Since %s (%s):\n\n", prev.LastFolder, prev.UpdatedAt)
		fmt.Fprintf(&b, "Unfollowed you (%d):\n", len(unfollowed))
		if len(unfollowed) == 0 {
			b.WriteString("  none\n")
		}
		for _, u := range unfollowed {
			fmt.Fprintf(&b, "  - %s (https://instagram.com/%s)\n", u, u)
		}
		fmt.Fprintf(&b, "\nNew followers (%d):\n", len(gained))
		if len(gained) == 0 {
			b.WriteString("  none\n")
		}
		for _, u := range gained {
			fmt.Fprintf(&b, "  - %s (https://instagram.com/%s)\n", u, u)
		}
		b.WriteString("\n")
	}

	fmt.Fprintf(&b, "Not following you back (%d):\n", len(nf))
	if len(nf) == 0 {
		b.WriteString("  none\n")
	}
	for _, acc := range nf {
		fmt.Fprintf(&b, "  - %s (%s)\n", acc.Username, acc.ProfileURL)
	}

	return subject, b.String()
}
