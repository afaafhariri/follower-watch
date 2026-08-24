package main

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
	"google.golang.org/api/option"
)

const folderMimeType = "application/vnd.google-apps.folder"

// newDriveService builds a read-only Drive client from either a service
// account key file or an OAuth client + refresh token (see -authorize).
func newDriveService(ctx context.Context) (*drive.Service, error) {
	if keyFile := os.Getenv("GOOGLE_SERVICE_ACCOUNT_FILE"); keyFile != "" {
		return drive.NewService(ctx,
			option.WithCredentialsFile(keyFile),
			option.WithScopes(drive.DriveReadonlyScope))
	}

	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	refreshToken := os.Getenv("GOOGLE_REFRESH_TOKEN")
	if clientID == "" || clientSecret == "" || refreshToken == "" {
		return nil, fmt.Errorf("missing Google credentials: set GOOGLE_SERVICE_ACCOUNT_FILE, or GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN (run with -authorize to obtain a refresh token)")
	}

	conf := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{drive.DriveReadonlyScope},
	}
	ts := conf.TokenSource(ctx, &oauth2.Token{RefreshToken: refreshToken})
	return drive.NewService(ctx, option.WithTokenSource(ts))
}

// listExports returns every "meta-*" export folder in Drive, oldest first.
func listExports(svc *drive.Service) ([]*drive.File, error) {
	list, err := svc.Files.List().
		Q(fmt.Sprintf("mimeType='%s' and name contains 'meta' and trashed=false", folderMimeType)).
		OrderBy("createdTime").
		Fields("files(id,name,createdTime)").
		PageSize(50).
		Do()
	if err != nil {
		return nil, fmt.Errorf("listing Drive folders: %w", err)
	}
	var exports []*drive.File
	for _, f := range list.Files {
		if strings.HasPrefix(strings.ToLower(f.Name), "meta-") {
			exports = append(exports, f)
		}
	}
	if len(exports) == 0 {
		return nil, fmt.Errorf("no 'meta-*' export folder found in Drive")
	}
	return exports, nil
}

// exportsToProcess returns the exports not yet folded into the state, oldest
// first.
//
// Processing every unseen export matters for an incremental feed: each one
// carries only the followers gained since the previous export, so skipping a
// night drops those people from the follower set for good. A run that failed
// (or a paused schedule) is caught up on the next run instead.
func exportsToProcess(all []*drive.File, prev *state) []*drive.File {
	if prev == nil || prev.LastFolder == "" {
		return all
	}
	for i, f := range all {
		if f.Name == prev.LastFolder {
			return all[i+1:]
		}
	}
	// The last processed export has aged out of Drive, so everything still
	// there postdates the stored state.
	return all
}

// childFolder finds a sub-folder of parentID whose name contains needle.
func childFolder(svc *drive.Service, parentID, needle string) (*drive.File, error) {
	list, err := svc.Files.List().
		Q(fmt.Sprintf("'%s' in parents and mimeType='%s' and trashed=false", parentID, folderMimeType)).
		Fields("files(id,name)").
		PageSize(100).
		Do()
	if err != nil {
		return nil, fmt.Errorf("listing children: %w", err)
	}
	for _, f := range list.Files {
		if strings.Contains(strings.ToLower(f.Name), needle) {
			return f, nil
		}
	}
	return nil, fmt.Errorf("no folder containing %q under parent %s", needle, parentID)
}

// fetchFollowerFiles walks export/instagram-*/connections/followers_and_following
// and downloads every followers_*.json / following.json, keyed by file name.
func fetchFollowerFiles(svc *drive.Service, exportID string) (map[string][]byte, error) {
	ig, err := childFolder(svc, exportID, "instagram")
	if err != nil {
		return nil, err
	}
	conn, err := childFolder(svc, ig.Id, "connections")
	if err != nil {
		return nil, err
	}
	ff, err := childFolder(svc, conn.Id, "followers_and_following")
	if err != nil {
		return nil, err
	}

	list, err := svc.Files.List().
		Q(fmt.Sprintf("'%s' in parents and mimeType!='%s' and trashed=false", ff.Id, folderMimeType)).
		Fields("files(id,name)").
		PageSize(200).
		Do()
	if err != nil {
		return nil, fmt.Errorf("listing follower files: %w", err)
	}

	files := make(map[string][]byte)
	for _, f := range list.Files {
		if !isFollowersFile(f.Name) && !isFollowingFile(f.Name) {
			continue
		}
		content, err := downloadFile(svc, f.Id)
		if err != nil {
			return nil, fmt.Errorf("downloading %s: %w", f.Name, err)
		}
		files[f.Name] = content
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("no followers/following JSON files found in %s", ff.Name)
	}
	return files, nil
}

func downloadFile(svc *drive.Service, id string) ([]byte, error) {
	resp, err := svc.Files.Get(id).Download()
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
