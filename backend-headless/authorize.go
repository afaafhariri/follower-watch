package main

import (
	"context"
	"fmt"
	"net/http"
	"os"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
)

// runAuthorizeFlow is a one-time interactive flow: it prints a consent URL,
// catches the redirect on localhost, and prints the refresh token to put in
// .env as GOOGLE_REFRESH_TOKEN.
func runAuthorizeFlow(ctx context.Context) error {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if clientID == "" || clientSecret == "" {
		return fmt.Errorf("set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first")
	}

	port := os.Getenv("AUTH_PORT")
	if port == "" {
		port = "8090"
	}

	conf := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Endpoint:     google.Endpoint,
		Scopes:       []string{drive.DriveReadonlyScope},
		RedirectURL:  fmt.Sprintf("http://localhost:%s/callback", port),
	}

	codeCh := make(chan string, 1)
	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "missing code parameter", http.StatusBadRequest)
			return
		}
		fmt.Fprintln(w, "Authorization received — you can close this tab and return to the terminal.")
		codeCh <- code
	})
	srv := &http.Server{Addr: ":" + port, Handler: mux}
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			fmt.Fprintf(os.Stderr, "callback server error: %v\n", err)
			os.Exit(1)
		}
	}()
	defer srv.Shutdown(ctx)

	url := conf.AuthCodeURL("follower-watch", oauth2.AccessTypeOffline, oauth2.ApprovalForce)
	fmt.Println("Open this URL in your browser and grant read-only Drive access:")
	fmt.Println()
	fmt.Println("  " + url)
	fmt.Println()
	fmt.Println("Waiting for the redirect on " + conf.RedirectURL + " ...")

	code := <-codeCh
	tok, err := conf.Exchange(ctx, code)
	if err != nil {
		return fmt.Errorf("exchanging code: %w", err)
	}
	if tok.RefreshToken == "" {
		return fmt.Errorf("no refresh token returned; remove the app's previous grant at https://myaccount.google.com/permissions and try again")
	}

	fmt.Println()
	fmt.Println("Success! Add this line to your .env:")
	fmt.Println()
	fmt.Printf("  GOOGLE_REFRESH_TOKEN=%s\n", tok.RefreshToken)
	fmt.Println()
	return nil
}
