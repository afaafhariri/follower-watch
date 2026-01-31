.PHONY: build clean test deploy

# Build the Lambda function
build:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go
	zip function.zip bootstrap

# Build for ARM64 (Graviton2 - more cost effective)
build-arm:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go
	zip function.zip bootstrap

# Clean build artifacts
clean:
	rm -f bootstrap function.zip

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -cover -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Download dependencies
deps:
	go mod download
	go mod tidy

# Format code
fmt:
	go fmt ./...

# Lint code
lint:
	go vet ./...
