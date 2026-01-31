.PHONY: test test-coverage run deploy clean fmt lint deps

run:
	cd cmd && FUNCTION_TARGET=AnalyzeFollowers go run main.go

test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -cover -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

deps:
	go mod download
	go mod tidy

fmt:
	go fmt ./...

lint:
	go vet ./...

clean:
	rm -f coverage.out coverage.html

# Deploy to Google Cloud Functions (2nd gen)
deploy:
	gcloud functions deploy follower-count-api \
		--gen2 \
		--runtime=go121 \
		--region=us-central1 \
		--source=. \
		--entry-point=AnalyzeFollowers \
		--trigger-http \
		--allow-unauthenticated \
		--memory=256MB \
		--timeout=60s \
		--set-env-vars="ALLOWED_ORIGINS=$(ALLOWED_ORIGINS)"

# Deploy with specific project
deploy-project:
	gcloud functions deploy follower-count-api \
		--gen2 \
		--project=$(GCP_PROJECT) \
		--runtime=go121 \
		--region=$(GCP_REGION) \
		--source=. \
		--entry-point=AnalyzeFollowers \
		--trigger-http \
		--allow-unauthenticated \
		--memory=256MB \
		--timeout=60s \
		--set-env-vars="ALLOWED_ORIGINS=$(ALLOWED_ORIGINS)"

url:
	gcloud functions describe follower-count-api --gen2 --region=us-central1 --format='value(serviceConfig.uri)'

logs:
	gcloud functions logs read follower-count-api --gen2 --region=us-central1 --limit=50

delete:
	gcloud functions delete follower-count-api --gen2 --region=us-central1 --quiet
