package main

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

// Helper to create a test ZIP file in memory
func createTestZip(t *testing.T, files map[string]string) []byte {
	buf := new(bytes.Buffer)
	w := zip.NewWriter(buf)

	for name, content := range files {
		f, err := w.Create(name)
		if err != nil {
			t.Fatalf("Failed to create file in zip: %v", err)
		}
		_, err = f.Write([]byte(content))
		if err != nil {
			t.Fatalf("Failed to write to zip file: %v", err)
		}
	}

	err := w.Close()
	if err != nil {
		t.Fatalf("Failed to close zip writer: %v", err)
	}

	return buf.Bytes()
}

func TestHandleRequest_ValidZip(t *testing.T) {
	// Create test data
	followersData := `[{
		"title": "followers",
		"string_list_data": [
			{"value": "user1", "timestamp": 1234567890},
			{"value": "user2", "timestamp": 1234567891}
		]
	}]`

	followingData := `{
		"relationships_following": [{
			"title": "following",
			"string_list_data": [
				{"value": "user1", "timestamp": 1234567890},
				{"value": "user3", "timestamp": 1234567892},
				{"value": "user4", "timestamp": 1234567893}
			]
		}]
	}`

	zipBytes := createTestZip(t, map[string]string{
		"connections/followers_and_following/followers_1.json": followersData,
		"connections/followers_and_following/following.json":   followingData,
	})

	request := events.APIGatewayProxyRequest{
		HTTPMethod:      "POST",
		Body:            base64.StdEncoding.EncodeToString(zipBytes),
		IsBase64Encoded: true,
		RequestContext: events.APIGatewayProxyRequestContext{
			Identity: events.APIGatewayRequestIdentity{
				SourceIP: "127.0.0.1",
			},
		},
	}

	response, err := handleRequest(context.Background(), request)
	if err != nil {
		t.Fatalf("Handler returned error: %v", err)
	}

	if response.StatusCode != 200 {
		t.Fatalf("Expected status 200, got %d: %s", response.StatusCode, response.Body)
	}

	var apiResponse APIResponse
	err = json.Unmarshal([]byte(response.Body), &apiResponse)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if !apiResponse.Success {
		t.Fatalf("Expected success, got error: %s", apiResponse.Error)
	}

	// user3 and user4 should be non-followers
	if apiResponse.Count != 2 {
		t.Fatalf("Expected 2 non-followers, got %d", apiResponse.Count)
	}
}

func TestHandleRequest_InvalidZip(t *testing.T) {
	request := events.APIGatewayProxyRequest{
		HTTPMethod:      "POST",
		Body:            base64.StdEncoding.EncodeToString([]byte("not a zip file")),
		IsBase64Encoded: true,
		RequestContext: events.APIGatewayProxyRequestContext{
			Identity: events.APIGatewayRequestIdentity{
				SourceIP: "127.0.0.2",
			},
		},
	}

	response, _ := handleRequest(context.Background(), request)

	if response.StatusCode != 400 {
		t.Fatalf("Expected status 400, got %d", response.StatusCode)
	}
}

func TestHandleRequest_MethodNotAllowed(t *testing.T) {
	request := events.APIGatewayProxyRequest{
		HTTPMethod: "GET",
	}

	response, _ := handleRequest(context.Background(), request)

	if response.StatusCode != 405 {
		t.Fatalf("Expected status 405, got %d", response.StatusCode)
	}
}

func TestHandleRequest_Options(t *testing.T) {
	request := events.APIGatewayProxyRequest{
		HTTPMethod: "OPTIONS",
	}

	response, _ := handleRequest(context.Background(), request)

	if response.StatusCode != 200 {
		t.Fatalf("Expected status 200 for OPTIONS, got %d", response.StatusCode)
	}

	if response.Headers["Access-Control-Allow-Origin"] == "" {
		t.Fatal("Expected CORS headers to be set")
	}
}

func TestFindNonFollowers(t *testing.T) {
	followers := map[string]struct{}{
		"user1": {},
		"user2": {},
	}

	following := []NonFollower{
		{Username: "user1", ProfileURL: "https://instagram.com/user1"},
		{Username: "user3", ProfileURL: "https://instagram.com/user3"},
		{Username: "USER2", ProfileURL: "https://instagram.com/USER2"}, // Test case insensitivity
	}

	nonFollowers := findNonFollowers(following, followers)

	if len(nonFollowers) != 1 {
		t.Fatalf("Expected 1 non-follower, got %d", len(nonFollowers))
	}

	if nonFollowers[0].Username != "user3" {
		t.Fatalf("Expected user3 to be non-follower, got %s", nonFollowers[0].Username)
	}
}
