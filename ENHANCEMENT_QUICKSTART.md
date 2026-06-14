# 🎯 ENHANCEMENT FEATURES - QUICK START GUIDE

**Date**: 2026-06-01  
**Version**: 2.0.0

---

## 📋 OVERVIEW

Panduan ini akan membantu Anda mengimplementasikan 4 fitur enhancement baru:

1. **Dynamic Analyst Agent** - Multi-strategy per coin
2. **Real-time Web Dashboard** - React/Next.js monitoring
3. **Autonomous Communication** - Self-coordinating agents
4. **Per-Agent Model Selection** - Different Claude models

---

## 🚀 QUICK START

### Step 1: Run Setup Script

```bash
cd /home/adhif/Documents/trading-multi-agent
./scripts/setup-enhancements.sh
```

Script ini akan:
- ✅ Create directories
- ✅ Install dependencies
- ✅ Create configuration files
- ✅ Update environment variables
- ✅ Add npm scripts

### Step 2: Copy Implementation Files

Salin file-file implementasi dari dokumentasi design:

**Core Services:**
```bash
# Strategy Manager
# Copy code from ENHANCEMENT_DESIGN.md → shared/strategy-manager.js

# Orchestrator
# Copy code from ENHANCEMENT_DESIGN_PART2.md → shared/orchestrator.js

# Model Manager
# Copy code from ENHANCEMENT_DESIGN_PART2.md → shared/model-manager.js

# Dashboard API Server
# Copy code from ENHANCEMENT_DESIGN.md → api/dashboard-server.js
```

**Agent Updates:**
```bash
# Dynamic Analyst
# Copy code from ENHANCEMENT_DESIGN.md → agents/analyst/dynamic-analyzer.js

# Update OpenClaw Agent
# Update shared/openclaw-agent.js with model manager integration
```

### Step 3: Test New Features

```bash
# Test strategy manager
npm run test:strategies

# Test orchestrator
npm run test:orchestrator

# Test full system
npm run dev
```

---

## 📊 FEATURE 1: DYNAMIC ANALYST AGENT

### Configuration

Edit `config/strategies.json` untuk menambah strategi baru:

```json
{
  "strategies": {
    "SOL/USDT": {
      "name": "Trend Following",
      "indicators": ["EMA_12", "EMA_26", "ADX", "Volume"],
      "timeframe": "2h",
      "systemPrompt": "sol_trend",
      "parameters": {
        "adx_threshold": 25,
        "ema_crossover_confirmation": true
      },
      "riskProfile": "moderate"
    }
  },
  "systemPrompts": {
    "sol_trend": {
      "role": "Solana Trend Follower",
      "instructions": "Use EMA crossovers and ADX to identify strong trends.",
      "riskTolerance": "medium",
      "minConfidence": 0.7
    }
  }
}
```

### Usage

```javascript
const { DynamicAnalystAgent } = require('./agents/analyst/dynamic-analyzer');

const analyst = new DynamicAnalystAgent();

// Analyze with coin-specific strategy
const analysis = await analyst.analyze('BTC/USDT');

console.log(analysis);
// {
//   pair: 'BTC/USDT',
//   strategy: 'Conservative Momentum',
//   riskProfile: 'conservative',
//   analysis: {
//     sentiment: 'bullish',
//     confidence: 0.85,
//     signals: { entry: true, exit: false },
//     reasoning: '...'
//   },
//   indicators: { RSI: 45, MACD: {...}, ... }
// }
```

### API Endpoints

```bash
# Get all strategies
curl http://localhost:4000/api/strategies

# Get strategy for specific pair
curl http://localhost:4000/api/strategies/BTC/USDT

# Update strategy
curl -X PUT http://localhost:4000/api/strategies/BTC/USDT \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Strategy",
    "indicators": ["RSI", "MACD"],
    "timeframe": "4h"
  }'
```

---

## 🖥️ FEATURE 2: REAL-TIME WEB DASHBOARD

### Setup Dashboard Project

```bash
# Create Next.js project
cd /home/adhif/Documents
npx create-next-app@latest trading-dashboard --typescript --tailwind --app

cd trading-dashboard

# Install dependencies
npm install socket.io-client recharts @tanstack/react-query
npm install lucide-react class-variance-authority clsx tailwind-merge

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add card badge skeleton
```

### Create WebSocket Hook

**File: `hooks/useWebSocket.ts`**

Copy implementation from `ENHANCEMENT_DESIGN_PART3.md`

### Create Dashboard Page

**File: `app/dashboard/page.tsx`**

```typescript
'use client';

import { DashboardOverview } from '@/components/Dashboard/Overview';

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Trading Dashboard</h1>
      <DashboardOverview />
    </div>
  );
}
```

### Start Dashboard

```bash
# Terminal 1: Backend API
cd /home/adhif/Documents/trading-multi-agent
node api/dashboard-server.js

# Terminal 2: Dashboard
cd /home/adhif/Documents/trading-dashboard
npm run dev
```

Access dashboard at: http://localhost:3000/dashboard

---

## 🤖 FEATURE 3: AUTONOMOUS COMMUNICATION

### Configuration

Edit `.env`:

```env
# Orchestrator settings
ORCHESTRATOR_CYCLE_INTERVAL=300000  # 5 minutes
ORCHESTRATOR_MAX_CONCURRENT=3
ORCHESTRATOR_MAX_FAILURES=3

# Watchlist
WATCHLIST=BTC/USDT,ETH/USDT,SOL/USDT
```

### Start Autonomous Mode

**Via API:**

```bash
# Start orchestrator
curl -X POST http://localhost:4000/api/orchestrator/start \
  -H "Content-Type: application/json" \
  -d '{
    "watchlist": ["BTC/USDT", "ETH/USDT", "SOL/USDT"]
  }'

# Check status
curl http://localhost:4000/api/orchestrator/status

# Stop orchestrator
curl -X POST http://localhost:4000/api/orchestrator/stop
```

**Via Code:**

```javascript
const { getOrchestrator } = require('./shared/orchestrator');

const orchestrator = getOrchestrator();

// Start with watchlist
orchestrator.start(['BTC/USDT', 'ETH/USDT', 'SOL/USDT']);

// Listen to events
orchestrator.on('workflow-completed', (workflow) => {
  console.log('Workflow completed:', workflow);
});

orchestrator.on('circuit-breaker-opened', ({ pair, failures }) => {
  console.log(`Circuit breaker opened for ${pair}: ${failures} failures`);
});

// Get status
const status = orchestrator.getStatus();
console.log(status);

// Stop
orchestrator.stop();
```

### Workflow States

```
started → analyzing → strategizing → risk-checking → executing → monitoring → completed
```

Possible end states:
- `completed-success` - Trade executed successfully
- `completed-no-action` - No trade signal
- `completed-risk-rejected` - Risk check failed
- `failed` - Error occurred

---

## 🎨 FEATURE 4: PER-AGENT MODEL SELECTION

### Configuration

Edit `config/agent-models.json`:

```json
{
  "agents": {
    "analyst": {
      "model": "claude-haiku-4.6",
      "provider": "anthropic",
      "temperature": 0.3,
      "maxTokens": 2000
    },
    "strategist": {
      "model": "claude-sonnet-4.6",
      "provider": "anthropic",
      "temperature": 0.5,
      "maxTokens": 3000
    },
    "executor": {
      "model": "claude-opus-4.8",
      "provider": "anthropic",
      "temperature": 0.1,
      "maxTokens": 1500
    }
  }
}
```

### Usage

```javascript
const { getModelManager } = require('./shared/model-manager');

const modelManager = getModelManager();

// Get model for agent
const analystModel = modelManager.getAgentModel('analyst');
console.log(analystModel);
// {
//   model: 'claude-haiku-4.6',
//   provider: 'anthropic',
//   temperature: 0.3,
//   maxTokens: 2000
// }

// Update agent model
modelManager.updateAgentModel('analyst', {
  model: 'claude-sonnet-4.6',
  provider: 'anthropic',
  temperature: 0.4,
  maxTokens: 2500
});

// Estimate cost
const cost = modelManager.estimateCost('analyst', 1000, 500);
console.log(cost);
// {
//   inputCost: 0.0008,
//   outputCost: 0.002,
//   totalCost: 0.0028,
//   currency: 'USD'
// }
```

### API Endpoints

```bash
# Get all agent models
curl http://localhost:4000/api/models

# Get model for specific agent
curl http://localhost:4000/api/models/analyst

# Update agent model
curl -X PUT http://localhost:4000/api/models/analyst \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.6",
    "temperature": 0.4,
    "maxTokens": 2500
  }'

# Get model catalog
curl http://localhost:4000/api/models/catalog
```

---

## 🧪 TESTING

### Test Strategy Manager

```bash
npm run test:strategies
```

Expected output:
```
Testing Strategy Manager...

1. Loading strategies...
✓ Loaded 2 strategies

2. Getting BTC/USDT strategy...
✓ Strategy: Conservative Momentum
  Indicators: RSI, MACD, SMA_20, SMA_50
  Timeframe: 4h

3. Getting system prompt...
✓ Prompt role: Conservative Bitcoin Analyst
  Risk tolerance: low

✅ All strategy tests passed!
```

### Test Orchestrator

```bash
npm run test:orchestrator
```

Expected output:
```
Testing Orchestrator...

1. Starting orchestrator...
✓ Orchestrator started

2. Getting status...
✓ Status: { isRunning: true, watchlist: [...], ... }

3. Stopping orchestrator...
✓ Orchestrator stopped

✅ All orchestrator tests passed!
```

### Test Full System

```bash
# Start all services
npm run dev:full

# In another terminal, test API
curl http://localhost:4000/api/health
curl http://localhost:4000/api/status
curl http://localhost:4000/api/agents
```

---

## 📊 MONITORING

### Dashboard Metrics

Access dashboard at http://localhost:3000/dashboard to see:

- **Portfolio Overview**
  - Total balance (USDT)
  - Open positions count
  - Active agents count
  - System status

- **Agent Status**
  - Real-time agent activity
  - Current tasks
  - Last activity timestamp

- **Open Positions**
  - Symbol, side, type
  - Amount and price
  - Order status

- **Trade History**
  - Recent trades
  - PnL per trade
  - Success rate

### WebSocket Events

Subscribe to real-time updates:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');

// Subscribe to channels
socket.emit('subscribe', ['portfolio', 'positions', 'agents']);

// Listen for updates
socket.on('portfolio-update', (data) => {
  console.log('Portfolio updated:', data);
});

socket.on('positions-update', (data) => {
  console.log('Positions updated:', data);
});

socket.on('agents-update', (data) => {
  console.log('Agents updated:', data);
});

socket.on('trade-event', (data) => {
  console.log('Trade event:', data);
});
```

---

## 🔧 TROUBLESHOOTING

### Issue: Orchestrator not starting

**Solution:**
```bash
# Check if orchestrator is already running
curl http://localhost:4000/api/orchestrator/status

# Stop if running
curl -X POST http://localhost:4000/api/orchestrator/stop

# Start again
curl -X POST http://localhost:4000/api/orchestrator/start \
  -d '{"watchlist":["BTC/USDT"]}'
```

### Issue: Dashboard not connecting

**Solution:**
```bash
# Check if API server is running
curl http://localhost:4000/api/health

# Check WebSocket connection
curl http://localhost:4000/socket.io/

# Verify DASHBOARD_URL in .env
grep DASHBOARD_URL .env
```

### Issue: Strategy not loading

**Solution:**
```bash
# Validate JSON syntax
cat config/strategies.json | jq .

# Test strategy manager
npm run test:strategies

# Check logs
tail -f logs/combined.log | grep strategy
```

---

## 📚 NEXT STEPS

1. **Customize Strategies**
   - Add more coins to `config/strategies.json`
   - Create custom indicators
   - Fine-tune parameters

2. **Enhance Dashboard**
   - Add more charts (PnL, volume, etc.)
   - Implement trade execution from UI
   - Add strategy editor

3. **Optimize Orchestrator**
   - Adjust cycle interval
   - Fine-tune circuit breaker thresholds
   - Add more sophisticated workflow logic

4. **Monitor Performance**
   - Track model costs
   - Analyze agent response times
   - Monitor success rates

---

## 🎉 CONCLUSION

Anda sekarang memiliki sistem trading yang lebih powerful dengan:

✅ **Dynamic strategies** per coin  
✅ **Real-time dashboard** untuk monitoring  
✅ **Autonomous operation** tanpa manual trigger  
✅ **Flexible model selection** per agent

**Happy Trading! 🚀📈**

---

*For detailed implementation, refer to:*
- `ENHANCEMENT_DESIGN.md`
- `ENHANCEMENT_DESIGN_PART2.md`
- `ENHANCEMENT_DESIGN_PART3.md`
