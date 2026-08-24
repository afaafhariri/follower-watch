// Command watcher is a headless follower-watch pipeline: it reads the latest
// Meta export from Google Drive, works out what changed since the previous
// run, and emails the report. No OAuth sign-in, no Redis — all configuration
// comes from environment variables (.env).
//
// It runs the pipeline once and exits. Scheduling is external: Cloud Scheduler
// in the deployed setup, or cron/launchd if you run it yourself.
package main

import (
	"context"
	"flag"
	"log"

	"github.com/joho/godotenv"
)

func main() {
	// Load .env file for local development (optional, ignored if missing)
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, using environment variables")
	}

	authorize := flag.Bool("authorize", false, "run the one-time OAuth flow to obtain a Google Drive refresh token")
	dryRun := flag.Bool("dry-run", false, "print the report instead of emailing it, and leave state untouched")
	// The deployed Cloud Run job passes -once. Running once is now the only
	// behaviour, so the flag is accepted and ignored rather than removed.
	_ = flag.Bool("once", false, "deprecated: the pipeline always runs once and exits")
	flag.Parse()

	if *authorize {
		if err := runAuthorizeFlow(context.Background()); err != nil {
			log.Fatalf("Authorization failed: %v", err)
		}
		return
	}

	if err := runPipeline(context.Background(), *dryRun); err != nil {
		log.Fatalf("Pipeline failed: %v", err)
	}
}
