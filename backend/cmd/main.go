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

	mux := http.NewServeMux()
	mux.HandleFunc("/AnalyzeFollowers", followercount.AnalyzeFollowers)
	mux.HandleFunc("/api/analyze", followercount.AnalyzeFollowers)
	mux.HandleFunc("/analyze", followercount.AnalyzeFollowers)

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
