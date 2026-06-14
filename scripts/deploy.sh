#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 TRADING MULTI-AGENT SYSTEM - DEPLOYMENT SCRIPT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -eq 0 ]; then
  echo -e "${RED}❌ Do not run this script as root${NC}"
  exit 1
fi

# Step 1: Environment check
echo -e "${BLUE}[1/8]${NC} Checking environment..."
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found${NC}"
  echo "Please copy .env.example to .env and configure it"
  exit 1
fi
echo -e "${GREEN}✓ Environment file found${NC}"

# Step 2: Dependencies check
echo -e "${BLUE}[2/8]${NC} Checking dependencies..."
if [ ! -d node_modules ]; then
  echo -e "${YELLOW}⚠ Installing dependencies...${NC}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Step 3: Run quick tests
echo -e "${BLUE}[3/8]${NC} Running quick tests..."
./scripts/quick-test.sh
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Tests failed${NC}"
  read -p "Continue anyway? (yes/no): " continue_deploy
  if [ "$continue_deploy" != "yes" ]; then
    exit 1
  fi
fi

# Step 4: Check testnet mode
echo -e "${BLUE}[4/8]${NC} Checking Binance mode..."
if grep -q "BINANCE_TESTNET_ENABLED=true" .env; then
  echo -e "${GREEN}✓ Running in TESTNET mode (safe)${NC}"
else
  echo -e "${RED}⚠️  WARNING: PRODUCTION MODE DETECTED${NC}"
  read -p "Are you sure you want to deploy in PRODUCTION mode? (yes/no): " confirm_prod
  if [ "$confirm_prod" != "yes" ]; then
    echo "Deployment cancelled"
    exit 1
  fi
fi

# Step 5: Create backup
echo -e "${BLUE}[5/8]${NC} Creating backup..."
./scripts/backup.sh
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backup created${NC}"
else
  echo -e "${YELLOW}⚠ Backup failed (continuing anyway)${NC}"
fi

# Step 6: Stop existing process
echo -e "${BLUE}[6/8]${NC} Stopping existing process..."
if pm2 list | grep -q "trading-multi-agent"; then
  pm2 stop trading-multi-agent
  echo -e "${GREEN}✓ Existing process stopped${NC}"
else
  echo -e "${YELLOW}⚠ No existing process found${NC}"
fi

# Step 7: Start application
echo -e "${BLUE}[7/8]${NC} Starting application..."
pm2 start ecosystem.config.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start application${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Application started${NC}"

# Step 8: Save PM2 configuration
echo -e "${BLUE}[8/8]${NC} Saving PM2 configuration..."
pm2 save
echo -e "${GREEN}✓ PM2 configuration saved${NC}"

# Wait for health check
echo ""
echo -e "${BLUE}Waiting for health check...${NC}"
sleep 5

# Check health endpoint
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}⚠ Health check failed (check logs)${NC}"
fi

# Display status
echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check application status"
echo "  pm2 logs                - View logs"
echo "  pm2 monit               - Monitor resources"
echo "  ./scripts/monitor.sh    - System health check"
echo ""
echo "Health endpoint: http://localhost:3000/health"
echo "Metrics endpoint: http://localhost:3000/metrics"
echo ""
echo "═══════════════════════════════════════════════════════════"
