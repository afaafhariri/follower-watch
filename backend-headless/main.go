// Command watcher is a headless follower-watch pipeline: it reads the latest
// Meta export from Google Drive on a schedule, diffs followers against the
// previous run, and emails the report. No OAuth sign-in, no Redis — all
// configuration comes from environment variables (.env).
package main

import (
	"context"
	"flag"
	"log"
	"os"
	"time"
	_ "time/tzdata"

	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
)

func main() {
	// Load .env file for local development (optional, ignored if missing)
	if err := godotenv.Load(); err != nil {
		log.Printf("No .env file found, using environment variables")
	}

	authorize := flag.Bool("authorize", false, "run the one-time OAuth flow to obtain a Google Drive refresh token")
	once := flag.Bool("once", false, "run the pipeline immediately once and exit")
	flag.Parse()

	if *authorize {
		if err := runAuthorizeFlow(context.Background()); err != nil {
			log.Fatalf("Authorization failed: %v", err)
		}
		return
	}

	if *once {
		if err := runPipeline(context.Background()); err != nil {
			log.Fatalf("Pipeline failed: %v", err)
		}
		return
	}

	schedule := os.Getenv("CRON_SCHEDULE")
	if schedule == "" {
		schedule = "30 1 * * *" // every night at 1:30 AM
	}

	loc := time.Local
	if tz := os.Getenv("TZ"); tz != "" {
		l, err := time.LoadLocation(tz)
		if err != nil {
			log.Fatalf("Invalid TZ %q: %v", tz, err)
		}
		loc = l
	}

	c := cron.New(cron.WithLocation(loc))
	if _, err := c.AddFunc(schedule, func() {
		log.Printf("Scheduled run starting")
		if err := runPipeline(context.Background()); err != nil {
			log.Printf("Pipeline failed: %v", err)
		}
	}); err != nil {
		log.Fatalf("Invalid CRON_SCHEDULE %q: %v", schedule, err)
	}

	log.Printf("Follower watch scheduled (%q, timezone %s)", schedule, loc)
	c.Run()
}
