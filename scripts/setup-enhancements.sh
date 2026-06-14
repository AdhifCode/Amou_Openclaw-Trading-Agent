#!/bin/bash

# Enhancement Features Implementation Script
# This script sets up the new features for Trading Multi-Agent System

echo "═══════════════════════════════════════════════════════════"
echo "  🚀 ENHANCEMENT FEATURES SETUP"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Setting up 4 enhancement features:${NC}"
echo "  1. Dynamic Analyst Agent (Multi-Strategy)"
echo "  2. Real-time Web Dashboard"
echo "  3. Autonomous Inter-Agent Communication"
echo "  4. Per-Agent Model Selection"
echo ""

# Step 1: Create new directories
echo -e "${BLUE}[1/6]${NC} Creating directories..."
mkdir -p api
mkdir -p config/strategies
mkdir -p dashboard
mkdir -p agents/analyst/strategies

echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Step 2: Install new dependencies
echo -e "${BLUE}[2/6]${NC} Installing new dependencies..."
npm install socket.io express cors --save

echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Create configuration files
echo -e "${BLUE}[3/6]${NC} Creating configuration files..."

# Create strategies.json
cat > config/strategies.json << 'EOF'
{
  "strategies": {
    "BTC/USDT": {
      "name": "Conservative Momentum",
      "indicators": ["RSI", "MACD", "SMA_20", "SMA_50"],
      "timeframe": "4h",
      "systemPrompt": "btc_conservative",
      "parameters": {
        "rsi_oversold": 30,
        "rsi_overbought": 70,
        "macd_signal_threshold": 0.5
      },
      "riskProfile": "conservative"
    },
    "ETH/USDT": {
      "name": "Volatility Breakout",
      "indicators": ["BB", "ATR", "Volume", "EMA_12"],
      "timeframe": "1h",
      "systemPrompt": "eth_aggressive",
      "parameters": {
        "bb_std_dev": 2,
        "volume_spike_threshold": 1.5
      },
      "riskProfile": "aggressive"
    }
  },
  "systemPrompts": {
    "btc_conservative": {
      "role": "Conservative Bitcoin Analyst",
      "instructions": "You are a conservative Bitcoin analyst. Focus on strong confirmation signals.",
      "riskTolerance": "low",
      "minConfidence": 0.8
    },
    "eth_aggressive": {
      "role": "Aggressive Ethereum Trader",
      "instructions": "You are an aggressive Ethereum trader. Look for volatility breakouts.",
      "riskTolerance": "high",
      "minConfidence": 0.6
    }
  }
}
EOF

# Create agent-models.json
cat > config/agent-models.json << 'EOF'
{
  "agents": {
    "analyst": {
      "model": "claude-haiku-4.6",
      "provider": "anthropic",
      "temperature": 0.3,
      "maxTokens": 2000,
      "reasoning": "Fast analysis, lower cost"
    },
    "strategist": {
      "model": "claude-sonnet-4.6",
      "provider": "anthropic",
      "temperature": 0.5,
      "maxTokens": 3000,
      "reasoning": "Balanced performance"
    },
    "executor": {
      "model": "claude-opus-4.8",
      "provider": "anthropic",
      "temperature": 0.1,
      "maxTokens": 1500,
      "reasoning": "Highest accuracy"
    },
    "monitor": {
      "model": "claude-haiku-4.6",
      "provider": "anthropic",
      "temperature": 0.2,
      "maxTokens": 1500,
      "reasoning": "Fast monitoring"
    },
    "developer": {
      "model": "claude-sonnet-4.6",
      "provider": "anthropic",
      "temperature": 0.4,
      "maxTokens": 4000,
      "reasoning": "Complex debugging"
    }
  }
}
EOF

echo -e "${GREEN}✓ Configuration files created${NC}"
echo ""

# Step 4: Update environment variables
echo -e "${BLUE}[4/6]${NC} Updating environment variables..."

cat >> .env << 'EOF'

# ==================== ENHANCEMENT FEATURES ====================
# Dashboard
DASHBOARD_URL=http://localhost:3000
API_PORT=4000

# Orchestrator
ORCHESTRATOR_CYCLE_INTERVAL=300000  # 5 minutes
ORCHESTRATOR_MAX_CONCURRENT=3
ORCHESTRATOR_MAX_FAILURES=3

# Watchlist (comma-separated)
WATCHLIST=BTC/USDT,ETH/USDT,SOL/USDT

EOF

echo -e "${GREEN}✓ Environment variables updated${NC}"
echo ""

# Step 5: Create package.json scripts
echo -e "${BLUE}[5/6]${NC} Adding npm scripts..."

# Backup package.json
cp package.json package.json.backup

# Add new scripts using node
node << 'NODESCRIPT'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg.scripts = {
  ...pkg.scripts,
  "start:api": "node api/dashboard-server.js",
  "start:orchestrator": "node shared/orchestrator-cli.js",
  "dev:full": "concurrently \"npm run dev\" \"npm run start:api\"",
  "test:strategies": "node tests/test-strategies.js",
  "test:orchestrator": "node tests/test-orchestrator.js"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('Scripts added to package.json');
NODESCRIPT

echo -e "${GREEN}✓ npm scripts added${NC}"
echo ""

# Step 6: Create test files
echo -e "${BLUE}[6/6]${NC} Creating test files..."

cat > tests/test-strategies.js << 'EOF'
require('dotenv').config();
const { getStrategyManager } = require('../shared/strategy-manager');

async function testStrategies() {
  console.log('Testing Strategy Manager...\n');

  const manager = getStrategyManager();

  // Test 1: Load strategies
  console.log('1. Loading strategies...');
  const strategies = manager.getAllStrategies();
  console.log(`✓ Loaded ${Object.keys(strategies).length} strategies`);

  // Test 2: Get specific strategy
  console.log('\n2. Getting BTC/USDT strategy...');
  const btcStrategy = manager.getStrategy('BTC/USDT');
  console.log('✓ Strategy:', btcStrategy.name);
  console.log('  Indicators:', btcStrategy.indicators.join(', '));
  console.log('  Timeframe:', btcStrategy.timeframe);

  // Test 3: Get system prompt
  console.log('\n3. Getting system prompt...');
  const prompt = manager.getSystemPrompt(btcStrategy.systemPrompt);
  console.log('✓ Prompt role:', prompt.role);
  console.log('  Risk tolerance:', prompt.riskTolerance);

  console.log('\n✅ All strategy tests passed!');
}

testStrategies().catch(console.error);
EOF

cat > tests/test-orchestrator.js << 'EOF'
require('dotenv').config();
const { getOrchestrator } = require('../shared/orchestrator');

async function testOrchestrator() {
  console.log('Testing Orchestrator...\n');

  const orchestrator = getOrchestrator();

  // Test 1: Start orchestrator
  console.log('1. Starting orchestrator...');
  const watchlist = ['BTC/USDT', 'ETH/USDT'];
  orchestrator.start(watchlist);
  console.log('✓ Orchestrator started');

  // Test 2: Get status
  console.log('\n2. Getting status...');
  const status = orchestrator.getStatus();
  console.log('✓ Status:', status);

  // Test 3: Stop orchestrator
  console.log('\n3. Stopping orchestrator...');
  orchestrator.stop();
  console.log('✓ Orchestrator stopped');

  console.log('\n✅ All orchestrator tests passed!');
}

testOrchestrator().catch(console.error);
EOF

echo -e "${GREEN}✓ Test files created${NC}"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ SETUP COMPLETE${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Review configuration files:"
echo "   - config/strategies.json"
echo "   - config/agent-models.json"
echo ""
echo "2. Copy implementation files from ENHANCEMENT_DESIGN.md:"
echo "   - shared/strategy-manager.js"
echo "   - shared/orchestrator.js"
echo "   - shared/model-manager.js"
echo "   - api/dashboard-server.js"
echo ""
echo "3. Test the new features:"
echo "   npm run test:strategies"
echo "   npm run test:orchestrator"
echo ""
echo "4. Start the enhanced system:"
echo "   npm run dev:full"
echo ""
echo "5. Set up the dashboard (optional):"
echo "   cd .."
echo "   npx create-next-app@latest dashboard --typescript --tailwind --app"
echo ""
echo "═══════════════════════════════════════════════════════════"
