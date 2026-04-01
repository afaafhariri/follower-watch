package main

import (
	"log"
	"net/http"
	"os"

	followercount "github.com/followercount/backend"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file for local development (optional, ignored if missing)
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, using environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	followercount.InitRedis()

	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("/auth/google/login", followercount.HandleGoogleLogin)
	mux.HandleFunc("/auth/google/callback", followercount.HandleGoogleCallback)
	mux.HandleFunc("/auth/me", followercount.HandleAuthMe)
	mux.HandleFunc("/auth/logout", followercount.HandleLogout)

	// Protected API routes
	mux.HandleFunc("/AnalyzeFollowers", followercount.RequireAuth(followercount.AnalyzeFollowers))
	mux.HandleFunc("/api/analyze", followercount.RequireAuth(followercount.AnalyzeFollowers))
	mux.HandleFunc("/analyze", followercount.RequireAuth(followercount.AnalyzeFollowers))

	// Cached result routes
	lastResultHandler := followercount.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			followercount.HandleGetLastResult(w, r)
		case http.MethodDelete:
			followercount.HandleDeleteLastResult(w, r)
		case http.MethodOptions:
			w.WriteHeader(http.StatusOK)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})
	mux.HandleFunc("/api/last-result", lastResultHandler)
	mux.HandleFunc("/last-result", lastResultHandler)

	// Serve frontend static files if the directory exists
	staticDir := os.Getenv("STATIC_DIR")
	if staticDir == "" {
		staticDir = "../frontend/dist"
	}
	if info, err := os.Stat(staticDir); err == nil && info.IsDir() {
		log.Printf("Serving static files from %s", staticDir)
		fs := http.FileServer(http.Dir(staticDir))
		mux.Handle("/", fs)
	}

	log.Printf("Starting server on port %s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
