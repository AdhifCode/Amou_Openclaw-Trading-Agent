#!/bin/bash

# Trading Multi-Agent System - Startup Script
# Author: Trading System Team
# Description: Start all 5 Discord agents with health checks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Trading Multi-Agent System - Startup Script         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure it.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} .env file found"

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}✓${NC} Dependencies installed"

# Check if custom LLM endpoint is accessible (if using custom provider)
LLM_PROVIDER=$(grep "^LLM_PROVIDER=" .env | cut -d '=' -f2)
if [ "$LLM_PROVIDER" = "custom" ]; then
    CUSTOM_LLM_BASE_URL=$(grep "^CUSTOM_LLM_BASE_URL=" .env | cut -d '=' -f2)
    echo -e "${BLUE}Checking custom LLM endpoint: $CUSTOM_LLM_BASE_URL${NC}"

    if curl -s --max-time 3 "$CUSTOM_LLM_BASE_URL/v1/models" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Custom LLM endpoint is accessible"
    else
        echo -e "${YELLOW}⚠️  Warning: Custom LLM endpoint not accessible${NC}"
        echo -e "${YELLOW}   System will start but LLM calls may fail${NC}"
    fi
fi

# Check if logs directory exists
if [ ! -d logs ]; then
    mkdir -p logs
    echo -e "${GREEN}✓${NC} Created logs directory"
fi

# Kill existing process if running
if pgrep -f "discord-gateway-main.js" > /dev/null; then
    echo -e "${YELLOW}⚠️  Existing process found. Stopping...${NC}"
    pkill -f "discord-gateway-main.js"
    sleep 2
fi

echo ""
echo -e "${BLUE}Starting Discord Gateway with 5 agents...${NC}"
echo ""

# Start the system
npm start

# Note: The script will keep running until Ctrl+C
