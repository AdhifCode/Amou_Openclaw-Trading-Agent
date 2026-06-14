#!/bin/bash

# Trading Multi-Agent System - Status Check
# Check health of all components

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Trading Multi-Agent System - Health Check           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if main process is running
echo -e "${BLUE}[1/5] Checking Discord Gateway Process...${NC}"
if pgrep -f "discord-gateway-main.js" > /dev/null; then
    PID=$(pgrep -f "discord-gateway-main.js")
    echo -e "${GREEN}✓ Running (PID: $PID)${NC}"
else
    echo -e "${RED}✗ Not running${NC}"
fi
echo ""

# Check .env file
echo -e "${BLUE}[2/5] Checking Configuration...${NC}"
if [ -f .env ]; then
    echo -e "${GREEN}✓ .env file exists${NC}"

    # Count configured bots
    BOT_COUNT=$(grep -c "^DISCORD_BOT_TOKEN_" .env || true)
    echo -e "  → Discord Bots: ${GREEN}${BOT_COUNT}/5${NC}"

    # Check LLM provider
    LLM_PROVIDER=$(grep "^LLM_PROVIDER=" .env | cut -d '=' -f2 || echo "not set")
    echo -e "  → LLM Provider: ${GREEN}${LLM_PROVIDER}${NC}"
else
    echo -e "${RED}✗ .env file not found${NC}"
fi
echo ""

# Check Custom LLM endpoint
echo -e "${BLUE}[3/5] Checking LLM Endpoint...${NC}"
if [ -f .env ]; then
    LLM_PROVIDER=$(grep "^LLM_PROVIDER=" .env | cut -d '=' -f2 || echo "")
    if [ "$LLM_PROVIDER" = "custom" ]; then
        CUSTOM_LLM_BASE_URL=$(grep "^CUSTOM_LLM_BASE_URL=" .env | cut -d '=' -f2 || echo "")
        if [ -n "$CUSTOM_LLM_BASE_URL" ]; then
            if curl -s --max-time 3 "$CUSTOM_LLM_BASE_URL/v1/models" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ Custom LLM endpoint accessible${NC}"
                echo -e "  → URL: ${CUSTOM_LLM_BASE_URL}"
            else
                echo -e "${RED}✗ Custom LLM endpoint not accessible${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⊘ Using ${LLM_PROVIDER} provider${NC}"
    fi
else
    echo -e "${RED}✗ Cannot check (no .env)${NC}"
fi
echo ""

# Check logs
echo -e "${BLUE}[4/5] Checking Logs...${NC}"
if [ -d logs ]; then
    LOG_COUNT=$(ls -1 logs/*.log 2>/dev/null | wc -l || echo 0)
    if [ "$LOG_COUNT" -gt 0 ]; then
        echo -e "${GREEN}✓ Log directory exists (${LOG_COUNT} files)${NC}"

        # Show latest log entries
        echo -e "${YELLOW}  Latest log entries:${NC}"
        tail -3 logs/*.log 2>/dev/null | head -10 | sed 's/^/    /'
    else
        echo -e "${YELLOW}⊘ Log directory exists but empty${NC}"
    fi
else
    echo -e "${YELLOW}⊘ No logs directory${NC}"
fi
echo ""

# Check node_modules
echo -e "${BLUE}[5/5] Checking Dependencies...${NC}"
if [ -d node_modules ]; then
    PKG_COUNT=$(ls -1d node_modules/* 2>/dev/null | wc -l || echo 0)
    echo -e "${GREEN}✓ Dependencies installed (${PKG_COUNT} packages)${NC}"
else
    echo -e "${RED}✗ node_modules not found${NC}"
    echo -e "${YELLOW}  Run: npm install${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if pgrep -f "discord-gateway-main.js" > /dev/null; then
    echo -e "${GREEN}System Status: RUNNING ✓${NC}"
else
    echo -e "${RED}System Status: STOPPED ✗${NC}"
    echo -e "${YELLOW}To start: ./START.sh or npm start${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
