package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

// state is the snapshot of the last processed export, used to detect
// unfollowers between runs. Stored as JSON in DATA_DIR.
type state struct {
	LastFolder string   `json:"last_folder"`
	UpdatedAt  string   `json:"updated_at"`
	Followers  []string `json:"followers"`
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
