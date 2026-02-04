package main

import (
	"log"

	_ "github.com/followercount/backend"

	"github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
	"github.com/joho/godotenv"
)

func main() {
	envConfig, err := godotenv.Read()
	if err != nil {
		log.Printf("Warning: Could not read .env file: %v", err)
		envConfig = make(map[string]string)
	}

	port := envConfig["PORT"]
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Starting local Cloud Functions emulator on port %s", port)
	log.Printf("📍 Function endpoint: http://localhost:%s/", port)

	if err := funcframework.Start(port); err != nil {
		log.Fatalf("funcframework.Start: %v", err)
	}
}
