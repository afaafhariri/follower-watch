#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 FollowerCount - Google Cloud Platform Deployment${NC}"
echo "====================================================="

# Default values
GCP_REGION="${GCP_REGION:-us-central1}"
FUNCTION_NAME="follower-count-api"

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}Error: gcloud CLI is not installed${NC}"
        echo "Install it from: https://cloud.google.com/sdk/docs/install"
        exit 1
    fi
    
    # Check if authenticated
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 &> /dev/null; then
        echo -e "${RED}Error: gcloud is not authenticated${NC}"
        echo "Run: gcloud auth login"
        exit 1
    fi
    
    # Check if project is set
    GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)
    if [ -z "$GCP_PROJECT" ]; then
        echo -e "${RED}Error: No GCP project set${NC}"
        echo "Run: gcloud config set project YOUR_PROJECT_ID"
        exit 1
    fi
    
    echo -e "${GREEN}✓ gcloud CLI authenticated${NC}"
    echo -e "${BLUE}  Project: $GCP_PROJECT${NC}"
    echo -e "${BLUE}  Region: $GCP_REGION${NC}"
}

# Deploy the Cloud Function
deploy_function() {
    echo -e "${YELLOW}Deploying Cloud Function...${NC}"
    
    cd backend
    
    # Get the frontend URL for CORS
    FRONTEND_URL="${FRONTEND_URL:-}"
    
    gcloud functions deploy $FUNCTION_NAME \
        --gen2 \
        --runtime=go121 \
        --region=$GCP_REGION \
        --source=. \
        --entry-point=AnalyzeFollowers \
        --trigger-http \
        --allow-unauthenticated \
        --memory=256MB \
        --timeout=60s \
        --set-env-vars="ALLOWED_ORIGINS=$FRONTEND_URL"
    
    cd ..
    
    echo -e "${GREEN}✓ Cloud Function deployed${NC}"
}

# Deploy frontend to Cloud Storage + Load Balancer (or Firebase Hosting)
deploy_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    
    # Get the function URL
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --gen2 --region=$GCP_REGION --format='value(serviceConfig.uri)')
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    
    # Build with API URL
    VITE_API_URL="$FUNCTION_URL" npm run build
    
    cd ..
    
    echo -e "${GREEN}✓ Frontend built${NC}"
    echo ""
    echo -e "${YELLOW}To deploy the frontend, you have several options:${NC}"
    echo ""
    echo -e "${BLUE}Option 1: Firebase Hosting (recommended)${NC}"
    echo "  npm install -g firebase-tools"
    echo "  firebase login"
    echo "  firebase init hosting"
    echo "  firebase deploy --only hosting"
    echo ""
    echo -e "${BLUE}Option 2: Cloud Storage + Load Balancer${NC}"
    echo "  gsutil mb gs://\$BUCKET_NAME"
    echo "  gsutil -m rsync -r frontend/dist gs://\$BUCKET_NAME"
    echo "  gsutil web set -m index.html -e index.html gs://\$BUCKET_NAME"
    echo ""
    echo -e "${BLUE}Option 3: Cloud Run (static)${NC}"
    echo "  Use a Docker container with nginx to serve static files"
}

# Get deployment info
get_info() {
    echo -e "${YELLOW}Getting deployment information...${NC}"
    
    GCP_PROJECT=$(gcloud config get-value project 2>/dev/null)
    
    echo ""
    echo -e "${GREEN}Cloud Function:${NC}"
    gcloud functions describe $FUNCTION_NAME --gen2 --region=$GCP_REGION --format='table(name,state,serviceConfig.uri)' 2>/dev/null || echo "  Not deployed"
    
    echo ""
    echo -e "${GREEN}Function URL:${NC}"
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --gen2 --region=$GCP_REGION --format='value(serviceConfig.uri)' 2>/dev/null)
    if [ -n "$FUNCTION_URL" ]; then
        echo "  $FUNCTION_URL"
    else
        echo "  Not available"
    fi
}

# Show logs
show_logs() {
    echo -e "${YELLOW}Showing Cloud Function logs...${NC}"
    gcloud functions logs read $FUNCTION_NAME --gen2 --region=$GCP_REGION --limit=${1:-50}
}

# Delete deployment
delete_deployment() {
    echo -e "${RED}WARNING: This will delete the Cloud Function!${NC}"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gcloud functions delete $FUNCTION_NAME --gen2 --region=$GCP_REGION --quiet
        echo -e "${GREEN}Cloud Function deleted${NC}"
    fi
}

# Print usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  deploy          Deploy the Cloud Function"
    echo "  frontend        Build frontend with function URL"
    echo "  info            Get deployment information"
    echo "  logs [n]        Show last n logs (default: 50)"
    echo "  delete          Delete the Cloud Function"
    echo "  help            Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  GCP_REGION      GCP region (default: us-central1)"
    echo "  FRONTEND_URL    Frontend URL for CORS (optional)"
}

# Main
main() {
    case "${1:-deploy}" in
        deploy)
            check_requirements
            deploy_function
            get_info
            ;;
        frontend)
            check_requirements
            deploy_frontend
            ;;
        info)
            check_requirements
            get_info
            ;;
        logs)
            check_requirements
            show_logs "${2:-50}"
            ;;
        delete)
            check_requirements
            delete_deployment
            ;;
        help|--help|-h)
            usage
            ;;
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            usage
            exit 1
            ;;
    esac
}

main "$@"
