#!/bin/bash

# Trading Multi-Agent System - Complete Test Suite
# This script runs all tests to validate the system

echo "═══════════════════════════════════════════════════════════"
echo "  🧪 COMPLETE TEST SUITE"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
  local test_name=$1
  local test_command=$2

  ((TOTAL_TESTS++))
  echo -e "${BLUE}Running:${NC} $test_name"

  if eval "$test_command" > /tmp/test_output.log 2>&1; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((PASSED_TESTS++))
  else
    echo -e "${RED}✗ FAILED${NC}"
    echo "  Error output:"
    cat /tmp/test_output.log | head -5 | sed 's/^/  /'
    ((FAILED_TESTS++))
  fi
  echo ""
}

# Test 1: Environment
echo -e "${YELLOW}=== ENVIRONMENT TESTS ===${NC}"
run_test "Node.js version" "node --version"
run_test "NPM version" "npm --version"
run_test "Dependencies installed" "test -d node_modules"
run_test ".env file exists" "test -f .env"

# Test 2: File Structure
echo -e "${YELLOW}=== FILE STRUCTURE TESTS ===${NC}"
run_test "Agents directory" "test -d agents"
run_test "Shared directory" "test -d shared"
run_test "Config directory" "test -d config"
run_test "Utils directory" "test -d utils"
run_test "Tests directory" "test -d tests"
run_test "Scripts directory" "test -d scripts"

# Test 3: Critical Files
echo -e "${YELLOW}=== CRITICAL FILES TESTS ===${NC}"
run_test "Discord gateway" "test -f shared/discord-gateway-main.js"
run_test "Binance service" "test -f shared/binance-service.js"
run_test "Risk manager" "test -f shared/risk-manager.js"
run_test "Health check" "test -f shared/health-check.js"
run_test "OpenClaw agent" "test -f shared/openclaw-agent.js"

# Test 4: Agent Files
echo -e "${YELLOW}=== AGENT FILES TESTS ===${NC}"
run_test "Analyst agent" "test -f agents/analyst/index.js"
run_test "Strategist agent" "test -f agents/strategist/index.js"
run_test "Executor agent" "test -f agents/executor/index.js"
run_test "Monitor agent" "test -f agents/monitor/index.js"
run_test "Developer agent" "test -f agents/developer/index.js"

# Test 5: Configuration
echo -e "${YELLOW}=== CONFIGURATION TESTS ===${NC}"
run_test "Discord config" "test -f config/discord.config.js"
run_test "System prompts" "test -f config/system-prompts.js"
run_test "PM2 config" "test -f ecosystem.config.js"
run_test "Docker config" "test -f Dockerfile"
run_test "Docker compose" "test -f docker-compose.yml"

# Test 6: Environment Variables
echo -e "${YELLOW}=== ENVIRONMENT VARIABLES TESTS ===${NC}"
run_test "Discord tokens" "grep -q 'DISCORD_BOT_TOKEN_ANALYST' .env"
run_test "Binance API" "grep -q 'BINANCE_API_KEY' .env"
run_test "LLM provider" "grep -q 'LLM_PROVIDER' .env"
run_test "Risk settings" "grep -q 'MAX_POSITION_SIZE' .env"

# Test 7: Binance Integration (if testnet enabled)
if grep -q "BINANCE_TESTNET_ENABLED=true" .env; then
  echo -e "${YELLOW}=== BINANCE INTEGRATION TESTS ===${NC}"
  run_test "Binance connection" "timeout 15 node test-binance.js"
else
  echo -e "${YELLOW}⚠ Skipping Binance tests (testnet not enabled)${NC}"
  echo ""
fi

# Test 8: Syntax Check
echo -e "${YELLOW}=== SYNTAX TESTS ===${NC}"
run_test "Main gateway syntax" "node -c shared/discord-gateway-main.js"
run_test "Binance service syntax" "node -c shared/binance-service.js"
run_test "Risk manager syntax" "node -c shared/risk-manager.js"

# Summary
echo "═══════════════════════════════════════════════════════════"
echo -e "  RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
  echo "System is ready for deployment."
  exit 0
else
  PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
  echo -e "${YELLOW}⚠ SOME TESTS FAILED${NC}"
  echo "Pass rate: ${PASS_RATE}%"
  echo "Please review the errors above."
  exit 1
fi
