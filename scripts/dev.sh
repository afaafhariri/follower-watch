#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Starting local development environment${NC}"
echo "==========================================="

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Done${NC}"
}

trap cleanup EXIT

# Start backend using functions-framework
start_backend() {
    echo -e "${YELLOW}Starting Cloud Functions emulator...${NC}"
    
    cd backend
    
    # Download dependencies if needed
    if [ ! -f "go.sum" ]; then
        echo "Downloading dependencies..."
        go mod tidy
    fi
    
    # Set environment variables
    export ALLOWED_ORIGINS="http://localhost:3000"
    export FUNCTION_TARGET="AnalyzeFollowers"
    export PORT=8080
    
    # Run using functions-framework
    cd cmd && go run main.go &
    BACKEND_PID=$!
    cd ../..
    
    echo -e "${GREEN}✓ Backend running on http://localhost:8080${NC}"
}

# Start frontend dev server
start_frontend() {
    echo -e "${YELLOW}Starting frontend dev server...${NC}"
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    VITE_API_URL="http://localhost:8080" npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    
    echo -e "${GREEN}✓ Frontend running on http://localhost:3000${NC}"
}

# Main
main() {
    start_backend
    sleep 3
    start_frontend
    
    echo ""
    echo -e "${GREEN}🚀 Development environment ready!${NC}"
    echo "=================================="
    echo -e "Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "Function: ${YELLOW}http://localhost:8080${NC}"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # Wait for processes
    wait
}

main
