#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 FollowerCount - Full Deployment Script${NC}"
echo "==========================================="

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is not installed${NC}"
        exit 1
    fi
    
    if ! command -v sam &> /dev/null; then
        echo -e "${RED}Error: AWS SAM CLI is not installed${NC}"
        exit 1
    fi
    
    if ! command -v go &> /dev/null; then
        echo -e "${RED}Error: Go is not installed${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}"
}

# Build backend
build_backend() {
    echo -e "${YELLOW}Building backend...${NC}"
    cd backend
    GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -tags lambda.norpc -o bootstrap main.go
    cd ..
    echo -e "${GREEN}✓ Backend built successfully${NC}"
}

# Build frontend
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Set API URL based on environment
    if [ -n "$API_URL" ]; then
        VITE_API_URL=$API_URL npm run build
    else
        npm run build
    fi
    
    cd ..
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
}

# Deploy with SAM
deploy_sam() {
    echo -e "${YELLOW}Deploying with SAM...${NC}"
    
    STAGE=${1:-prod}
    
    sam build --use-container=false
    sam deploy --config-env $STAGE
    
    echo -e "${GREEN}✓ SAM deployment complete${NC}"
}

# Deploy frontend to S3
deploy_frontend() {
    echo -e "${YELLOW}Deploying frontend to S3...${NC}"
    
    # Get bucket name from CloudFormation outputs
    STAGE=${1:-prod}
    STACK_NAME="follower-count-${STAGE}"
    
    BUCKET_NAME=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
        --output text)
    
    if [ -z "$BUCKET_NAME" ]; then
        echo -e "${RED}Error: Could not find frontend bucket${NC}"
        exit 1
    fi
    
    # Sync frontend files
    aws s3 sync frontend/dist s3://$BUCKET_NAME \
        --delete \
        --cache-control "public, max-age=31536000" \
        --exclude "*.html"
    
    # Upload HTML files with no-cache
    aws s3 sync frontend/dist s3://$BUCKET_NAME \
        --delete \
        --cache-control "no-cache, no-store, must-revalidate" \
        --exclude "*" \
        --include "*.html"
    
    # Invalidate CloudFront cache
    DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
        --output text)
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo "Invalidating CloudFront cache..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*"
    fi
    
    echo -e "${GREEN}✓ Frontend deployed to S3${NC}"
    
    # Print URLs
    WEBSITE_URL=$(aws cloudformation describe-stacks \
        --stack-name $STACK_NAME \
        --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionUrl`].OutputValue' \
        --output text)
    
    echo ""
    echo -e "${GREEN}🎉 Deployment Complete!${NC}"
    echo "========================"
    echo -e "Frontend URL: ${YELLOW}${WEBSITE_URL}${NC}"
}

# Main
main() {
    STAGE=${1:-prod}
    
    check_requirements
    build_backend
    build_frontend
    deploy_sam $STAGE
    deploy_frontend $STAGE
}

# Run with stage argument
main "$@"
