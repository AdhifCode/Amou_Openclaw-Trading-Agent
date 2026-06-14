#!/bin/bash

echo "═══════════════════════════════════════"
echo "  Trading Multi-Agent - Quick Test"
echo "═══════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to run test
run_test() {
  local test_name=$1
  local test_command=$2

  echo -n "Testing: $test_name ... "

  if eval "$test_command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    ((FAILED++))
  fi
}

# 1. Check Node.js
run_test "Node.js installed" "node --version"

# 2. Check npm packages
run_test "Dependencies installed" "test -d node_modules"

# 3. Check .env file
run_test ".env file exists" "test -f .env"

# 4. Check required env variables
run_test "Discord tokens configured" "grep -q 'DISCORD_BOT_TOKEN_ANALYST' .env"
run_test "Binance API configured" "grep -q 'BINANCE_API_KEY' .env"
run_test "LLM provider configured" "grep -q 'LLM_PROVIDER' .env"

# 5. Check directory structure
run_test "Agents directory exists" "test -d agents"
run_test "Shared directory exists" "test -d shared"
run_test "Config directory exists" "test -d config"
run_test "Utils directory exists" "test -d utils"

# 6. Check critical files
run_test "Binance service exists" "test -f shared/binance-service.js"
run_test "Discord gateway exists" "test -f shared/discord-gateway-main.js"
run_test "OpenClaw agent exists" "test -f shared/openclaw-agent.js"

# 7. Test Binance connection (if testnet enabled)
if grep -q "BINANCE_TESTNET_ENABLED=true" .env; then
  echo -n "Testing: Binance testnet connection ... "
  if node test-binance.js > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED++))
  else
    echo -e "${YELLOW}⚠ SKIPPED (check logs)${NC}"
  fi
fi

echo ""
echo "═══════════════════════════════════════"
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "═══════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed! System is ready.${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed. Please check configuration.${NC}"
  exit 1
fi
