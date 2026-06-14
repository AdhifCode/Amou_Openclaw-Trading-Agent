#!/bin/bash

# First Run Script
# Guides user through first-time system startup

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 TRADING MULTI-AGENT - FIRST RUN"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script will guide you through starting the system"
echo "for the first time."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Validation
echo -e "${BLUE}[Step 1/5]${NC} Running validation checks..."
./scripts/final-validation.sh > /tmp/validation.log 2>&1

if [ $? -ne 0 ]; then
  echo -e "${RED}✗ Validation failed${NC}"
  cat /tmp/validation.log
  exit 1
fi
echo -e "${GREEN}✓ Validation passed${NC}"
echo ""

# Step 2: Test Binance
echo -e "${BLUE}[Step 2/5]${NC} Testing Binance connection..."
echo "This may take 10-15 seconds..."
timeout 20 node test-binance.js > /tmp/binance-test.log 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Binance connection successful${NC}"
else
  echo -e "${YELLOW}⚠ Binance test timeout (this is normal on slow testnet)${NC}"
fi
echo ""

# Step 3: Choose startup mode
echo -e "${BLUE}[Step 3/5]${NC} Choose startup mode:"
echo "  1) Development mode (npm run dev) - Recommended for testing"
echo "  2) Production mode (PM2) - For production deployment"
echo "  3) Docker - Containerized deployment"
echo ""
read -p "Enter choice (1-3): " mode_choice

case $mode_choice in
  1)
    MODE="dev"
    START_CMD="npm run dev"
    ;;
  2)
    MODE="pm2"
    START_CMD="pm2 start ecosystem.config.js"
    ;;
  3)
    MODE="docker"
    START_CMD="docker-compose up -d"
    ;;
  *)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}[Step 4/5]${NC} Starting system in ${YELLOW}$MODE${NC} mode..."
echo "Command: $START_CMD"
echo ""

if [ "$MODE" = "dev" ]; then
  echo -e "${YELLOW}Starting in development mode...${NC}"
  echo "Press Ctrl+C to stop"
  echo ""
  sleep 2
  npm run dev
elif [ "$MODE" = "pm2" ]; then
  # Check if PM2 is installed
  if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    npm install -g pm2
  fi

  pm2 start ecosystem.config.js

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ System started with PM2${NC}"
    echo ""
    echo -e "${BLUE}[Step 5/5]${NC} Post-startup checks..."
    sleep 3

    # Check health
    echo "Checking health endpoint..."
    sleep 2
    curl -s http://localhost:3000/health | grep -q "ok" && echo -e "${GREEN}✓ Health check passed${NC}" || echo -e "${YELLOW}⚠ Health check pending${NC}"

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ SYSTEM STARTED SUCCESSFULLY${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Useful commands:"
    echo "  pm2 status              - Check status"
    echo "  pm2 logs                - View logs"
    echo "  pm2 monit               - Monitor resources"
    echo "  pm2 restart trading-multi-agent  - Restart"
    echo "  pm2 stop trading-multi-agent     - Stop"
    echo ""
    echo "Health endpoint: http://localhost:3000/health"
    echo ""
    echo "Next: Test in Discord by sending '@Analyst ping'"
    echo ""
  else
    echo -e "${RED}✗ Failed to start with PM2${NC}"
    exit 1
  fi
elif [ "$MODE" = "docker" ]; then
  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found. Please install Docker first.${NC}"
    exit 1
  fi

  docker-compose up -d

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ System started with Docker${NC}"
    echo ""
    echo -e "${BLUE}[Step 5/5]${NC} Post-startup checks..."
    sleep 5

    # Check health
    echo "Checking health endpoint..."
    curl -s http://localhost:3000/health | grep -q "ok" && echo -e "${GREEN}✓ Health check passed${NC}" || echo -e "${YELLOW}⚠ Health check pending${NC}"

    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${GREEN}✅ SYSTEM STARTED SUCCESSFULLY${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose ps       - Check status"
    echo "  docker-compose logs -f  - View logs"
    echo "  docker-compose restart  - Restart"
    echo "  docker-compose down     - Stop"
    echo ""
    echo "Health endpoint: http://localhost:3000/health"
    echo ""
    echo "Next: Test in Discord by sending '@Analyst ping'"
    echo ""
  else
    echo -e "${RED}✗ Failed to start with Docker${NC}"
    exit 1
  fi
fi
