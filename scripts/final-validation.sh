#!/bin/bash

# Final Validation Script
# Run this before first deployment

echo "═══════════════════════════════════════════════════════════"
echo "  🔍 FINAL VALIDATION CHECKLIST"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

check_item() {
  local item=$1
  local command=$2
  local level=${3:-error}  # error, warning, info

  echo -n "Checking: $item ... "

  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((CHECKS_PASSED++))
    return 0
  else
    if [ "$level" = "warning" ]; then
      echo -e "${YELLOW}⚠${NC}"
      ((CHECKS_WARNING++))
    else
      echo -e "${RED}✗${NC}"
      ((CHECKS_FAILED++))
    fi
    return 1
  fi
}

echo -e "${BLUE}=== ENVIRONMENT ===${NC}"
check_item "Node.js installed" "node --version"
check_item "npm installed" "npm --version"
check_item "Dependencies installed" "test -d node_modules"
check_item ".env file exists" "test -f .env"
echo ""

echo -e "${BLUE}=== CONFIGURATION ===${NC}"
check_item "Discord tokens configured" "grep -q 'DISCORD_BOT_TOKEN_ANALYST' .env"
check_item "Binance API configured" "grep -q 'BINANCE_API_KEY' .env"
check_item "LLM provider configured" "grep -q 'LLM_PROVIDER' .env"
check_item "Testnet mode enabled" "grep -q 'BINANCE_TESTNET_ENABLED=true' .env"
check_item "Risk limits configured" "grep -q 'MAX_POSITION_SIZE' .env"
echo ""

echo -e "${BLUE}=== CRITICAL FILES ===${NC}"
check_item "Main gateway exists" "test -f shared/discord-gateway-main.js"
check_item "Binance service exists" "test -f shared/binance-service.js"
check_item "Risk manager exists" "test -f shared/risk-manager.js"
check_item "Health check exists" "test -f shared/health-check.js"
check_item "All 5 agents exist" "test -f agents/analyst/index.js && test -f agents/strategist/index.js && test -f agents/executor/index.js && test -f agents/monitor/index.js && test -f agents/developer/index.js"
echo ""

echo -e "${BLUE}=== DEPLOYMENT FILES ===${NC}"
check_item "PM2 config exists" "test -f ecosystem.config.js"
check_item "Docker files exist" "test -f Dockerfile && test -f docker-compose.yml"
check_item "Backup script exists" "test -x scripts/backup.sh"
check_item "Monitor script exists" "test -x scripts/monitor.sh"
check_item "Emergency script exists" "test -f scripts/emergency-cancel-all.js"
echo ""

echo -e "${BLUE}=== DOCUMENTATION ===${NC}"
check_item "README exists" "test -f README.md"
check_item "Getting started guide exists" "test -f GETTING_STARTED.md"
check_item "Quick reference exists" "test -f QUICKREF.md"
check_item "Deployment guide exists" "test -f PHASE5_DEPLOYMENT.md"
check_item "Risk management guide exists" "test -f docs/RISK_MANAGEMENT.md"
echo ""

echo -e "${BLUE}=== SECURITY CHECKS ===${NC}"
check_item ".env not in git" "grep -q '^\.env$' .gitignore"
check_item "logs/ not in git" "grep -q '^logs/' .gitignore"
check_item "node_modules/ not in git" "grep -q '^node_modules/' .gitignore"
echo ""

echo -e "${BLUE}=== OPTIONAL CHECKS ===${NC}"
check_item "PM2 installed globally" "which pm2" "warning"
check_item "Docker installed" "which docker" "warning"
check_item "Redis available" "which redis-cli" "warning"
echo ""

# Summary
echo "═══════════════════════════════════════════════════════════"
echo "  VALIDATION RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}Passed:   $CHECKS_PASSED${NC}"
echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
echo -e "${RED}Failed:   $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ SYSTEM READY FOR DEPLOYMENT${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Review configuration: cat .env"
  echo "  2. Test Binance connection: node test-binance.js"
  echo "  3. Start system: npm run dev"
  echo "  4. Test in Discord: @Analyst ping"
  echo ""
  exit 0
else
  echo -e "${RED}❌ SYSTEM NOT READY${NC}"
  echo "Please fix the failed checks above before deploying."
  echo ""
  exit 1
fi
