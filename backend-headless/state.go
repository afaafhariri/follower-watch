package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

// state is what the watcher remembers between runs. Stored as JSON in DATA_DIR.
//
// Followers is the best-known current follower set: replaced outright when a
// full export arrives, added to when Meta sends an incremental one. The
// Snapshot* fields record the last export that carried a complete follower
// list, which is the point unfollower counts are measured from.
type state struct {
	LastFolder     string   `json:"last_folder"`
	UpdatedAt      string   `json:"updated_at"`
	Followers      []string `json:"followers"`
	SnapshotFolder string   `json:"snapshot_folder,omitempty"`
	SnapshotAt     string   `json:"snapshot_at,omitempty"`
	SnapshotCount  int      `json:"snapshot_count,omitempty"`
}

func statePath() string {
	dir := os.Getenv("DATA_DIR")
	if dir == "" {
		dir = "."
	}
	return filepath.Join(dir, "state.json")
}

// loadState returns nil (no error) when no snapshot exists yet.
func loadState() (*state, error) {
	content, err := os.ReadFile(statePath())
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, err
	}
	var s state
	if err := json.Unmarshal(content, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func saveState(s *state) error {
	sort.Strings(s.Followers)
	if err := os.MkdirAll(filepath.Dir(statePath()), 0o755); err != nil {
		return err
	}
	content, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(statePath(), content, 0o600)
}
