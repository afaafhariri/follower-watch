package main

import (
	"log"
	"os"

	_ "github.com/followercount/backend"

	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Starting local Cloud Functions emulator on port %s", port)
	log.Printf("📍 Function endpoint: http://localhost:%s/", port)

	if err := funcframework.Start(port); err != nil {
		log.Fatalf("funcframework.Start: %v", err)
	}
}
