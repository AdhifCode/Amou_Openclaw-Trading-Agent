#!/bin/bash

# Trading Multi-Agent System - Stop Script
# Gracefully stop all running agents

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Stopping Trading Multi-Agent System...${NC}"

# Find and kill the main process
if pgrep -f "discord-gateway-main.js" > /dev/null; then
    echo -e "${YELLOW}Stopping Discord Gateway...${NC}"
    pkill -SIGTERM -f "discord-gateway-main.js"

    # Wait for graceful shutdown
    sleep 3

    # Force kill if still running
    if pgrep -f "discord-gateway-main.js" > /dev/null; then
        echo -e "${RED}Force killing remaining processes...${NC}"
        pkill -SIGKILL -f "discord-gateway-main.js"
    fi

    echo -e "${GREEN}✓ System stopped${NC}"
else
    echo -e "${YELLOW}No running processes found${NC}"
fi
