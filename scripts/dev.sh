#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🔧 Starting local development environment${NC}"
echo "==========================================="

# Start backend with SAM local
start_backend() {
    echo -e "${YELLOW}Starting SAM local API...${NC}"
    
    cd backend
    
    # Build Go binary for local testing (native architecture)
    go build -o bootstrap main.go
    
    cd ..
    
    # Start SAM local API
    sam local start-api --port 3001 --warm-containers EAGER &
    SAM_PID=$!
    
    echo -e "${GREEN}✓ Backend running on http://localhost:3001${NC}"
}

# Start frontend dev server
start_frontend() {
    echo -e "${YELLOW}Starting frontend dev server...${NC}"
    
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    
    echo -e "${GREEN}✓ Frontend running on http://localhost:3000${NC}"
}

# Cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down...${NC}"
    
    if [ -n "$SAM_PID" ]; then
        kill $SAM_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}Done${NC}"
}

trap cleanup EXIT

# Main
main() {
    start_backend
    sleep 3
    start_frontend
    
    echo ""
    echo -e "${GREEN}🚀 Development environment ready!${NC}"
    echo "=================================="
    echo -e "Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "Backend:  ${YELLOW}http://localhost:3001/api/analyze${NC}"
    echo ""
    echo "Press Ctrl+C to stop"
    
    # Wait for processes
    wait
}

main
