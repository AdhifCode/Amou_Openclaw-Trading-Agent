# 🚀 ENHANCEMENT FEATURES - ARCHITECTURE DESIGN

**Date**: 2026-06-01  
**Version**: 2.0.0  
**Status**: Design Phase

---

## 📋 OVERVIEW

Dokumen ini merancang 4 fitur enhancement untuk Trading Multi-Agent System:

1. **Dynamic Analyst Agent** - Multi-strategy & custom indicators
2. **Real-time Web Dashboard** - React/Next.js monitoring
3. **Fully Autonomous Inter-Agent Communication** - Self-coordinating agents
4. **Per-Agent Model Selection** - Different Claude models per agent

---

## 🏗️ FEATURE 1: DYNAMIC ANALYST AGENT

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Strategy Manager                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ BTC Strategy │  │ ETH Strategy │  │ SOL Strategy │     │
│  │ RSI + MACD   │  │ BB + Volume  │  │ Custom Mix   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Analyst Agent (Dynamic Brain)                   │
│  • Loads strategy config per coin                           │
│  • Switches system prompt dynamically                       │
│  • Calculates only selected indicators                      │
│  • Returns analysis with strategy context                   │
└─────────────────────────────────────────────────────────────┘
```

### Data Structure

**File: `config/strategies.json`**

```json
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
    },
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
    "btc_conservative": {
      "role": "Conservative Bitcoin Analyst",
      "instructions": "You are a conservative Bitcoin analyst. Focus on strong confirmation signals. Only recommend trades with RSI extremes AND MACD confirmation. Avoid choppy markets.",
      "riskTolerance": "low",
      "minConfidence": 0.8
    },
    "eth_aggressive": {
      "role": "Aggressive Ethereum Trader",
      "instructions": "You are an aggressive Ethereum trader. Look for volatility breakouts using Bollinger Bands. High volume spikes are your entry signals. Quick in, quick out.",
      "riskTolerance": "high",
      "minConfidence": 0.6
    },
    "sol_trend": {
      "role": "Solana Trend Follower",
      "instructions": "You are a Solana trend follower. Use EMA crossovers and ADX to identify strong trends. Only trade when ADX > 25. Ride the trend until reversal signals.",
      "riskTolerance": "medium",
      "minConfidence": 0.7
    }
  }
}
```

### Implementation

**File: `shared/strategy-manager.js`**

```javascript
const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('strategy-manager');

class StrategyManager {
  constructor() {
    this.strategiesPath = path.join(__dirname, '../config/strategies.json');
    this.strategies = this.loadStrategies();
  }

  loadStrategies() {
    try {
      const data = fs.readFileSync(this.strategiesPath, 'utf8');
      const config = JSON.parse(data);
      logger.info(`Loaded ${Object.keys(config.strategies).length} strategies`);
      return config;
    } catch (error) {
      logger.error('Failed to load strategies', { error: error.message });
      return { strategies: {}, systemPrompts: {} };
    }
  }

  reloadStrategies() {
    this.strategies = this.loadStrategies();
    logger.info('Strategies reloaded');
  }

  getStrategy(pair) {
    const strategy = this.strategies.strategies[pair];
    if (!strategy) {
      logger.warn(`No strategy found for ${pair}, using default`);
      return this.getDefaultStrategy();
    }
    return strategy;
  }

  getSystemPrompt(promptName) {
    return this.strategies.systemPrompts[promptName] || this.getDefaultPrompt();
  }

  getDefaultStrategy() {
    return {
      name: "Default Strategy",
      indicators: ["RSI", "MACD", "SMA_20"],
      timeframe: "4h",
      systemPrompt: "default",
      parameters: {},
      riskProfile: "moderate"
    };
  }

  getDefaultPrompt() {
    return {
      role: "General Market Analyst",
      instructions: "Analyze the market using standard technical indicators.",
      riskTolerance: "medium",
      minConfidence: 0.7
    };
  }

  getAllStrategies() {
    return this.strategies.strategies;
  }

  updateStrategy(pair, strategyConfig) {
    this.strategies.strategies[pair] = strategyConfig;
    this.saveStrategies();
    logger.info(`Strategy updated for ${pair}`);
  }

  saveStrategies() {
    try {
      fs.writeFileSync(
        this.strategiesPath,
        JSON.stringify(this.strategies, null, 2),
        'utf8'
      );
      logger.info('Strategies saved');
    } catch (error) {
      logger.error('Failed to save strategies', { error: error.message });
    }
  }
}

// Singleton
let instance = null;

function getStrategyManager() {
  if (!instance) {
    instance = new StrategyManager();
  }
  return instance;
}

module.exports = {
  StrategyManager,
  getStrategyManager,
};
```

**File: `agents/analyst/dynamic-analyzer.js`**

```javascript
const { OpenClawAgent } = require('../../shared/openclaw-agent');
const { getBinanceService } = require('../../shared/binance-service');
const { getStrategyManager } = require('../../shared/strategy-manager');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('dynamic-analyzer');

class DynamicAnalystAgent {
  constructor() {
    this.strategyManager = getStrategyManager();
    this.binance = getBinanceService();
  }

  /**
   * Analyze a pair using its specific strategy
   */
  async analyze(pair, options = {}) {
    logger.info(`Starting dynamic analysis for ${pair}`);

    // Get strategy for this pair
    const strategy = this.strategyManager.getStrategy(pair);
    const systemPrompt = this.strategyManager.getSystemPrompt(strategy.systemPrompt);

    logger.info(`Using strategy: ${strategy.name}`, {
      indicators: strategy.indicators,
      timeframe: strategy.timeframe,
    });

    // Fetch market data
    const marketData = await this.fetchMarketData(pair, strategy);

    // Calculate indicators based on strategy
    const indicators = await this.calculateIndicators(pair, strategy, marketData);

    // Create dynamic agent with strategy-specific prompt
    const agent = this.createDynamicAgent(pair, strategy, systemPrompt);

    // Analyze with context
    const analysis = await agent.analyze({
      pair,
      strategy: strategy.name,
      marketData,
      indicators,
      parameters: strategy.parameters,
    });

    return {
      pair,
      strategy: strategy.name,
      riskProfile: strategy.riskProfile,
      analysis,
      indicators,
      timestamp: new Date().toISOString(),
    };
  }

  async fetchMarketData(pair, strategy) {
    const timeframe = strategy.timeframe || '4h';
    const limit = 100;

    const [ticker, ohlcv] = await Promise.all([
      this.binance.fetchTicker(pair),
      this.binance.fetchOHLCV(pair, timeframe, limit),
    ]);

    return {
      ticker,
      ohlcv,
      timeframe,
    };
  }

  async calculateIndicators(pair, strategy, marketData) {
    const closes = marketData.ohlcv.map(c => c.close);
    const volumes = marketData.ohlcv.map(c => c.volume);
    const indicators = {};

    // Calculate only indicators specified in strategy
    for (const indicator of strategy.indicators) {
      try {
        switch (indicator) {
          case 'RSI':
            indicators.RSI = this.binance.calculateRSI(closes, 14);
            break;

          case 'MACD':
            indicators.MACD = this.binance.calculateMACD(closes);
            break;

          case 'SMA_20':
            indicators.SMA_20 = this.binance.calculateSMA(closes, 20);
            break;

          case 'SMA_50':
            indicators.SMA_50 = this.binance.calculateSMA(closes, 50);
            break;

          case 'EMA_12':
            indicators.EMA_12 = this.binance.calculateEMA(closes, 12);
            break;

          case 'EMA_26':
            indicators.EMA_26 = this.binance.calculateEMA(closes, 26);
            break;

          case 'BB':
            indicators.BB = this.binance.calculateBollingerBands(closes, 20, 2);
            break;

          case 'ATR':
            indicators.ATR = this.calculateATR(marketData.ohlcv, 14);
            break;

          case 'ADX':
            indicators.ADX = this.calculateADX(marketData.ohlcv, 14);
            break;

          case 'Volume':
            indicators.Volume = {
              current: volumes[volumes.length - 1],
              average: volumes.reduce((a, b) => a + b, 0) / volumes.length,
              spike: volumes[volumes.length - 1] / (volumes.reduce((a, b) => a + b, 0) / volumes.length),
            };
            break;

          default:
            logger.warn(`Unknown indicator: ${indicator}`);
        }
      } catch (error) {
        logger.error(`Failed to calculate ${indicator}`, { error: error.message });
      }
    }

    return indicators;
  }

  createDynamicAgent(pair, strategy, systemPrompt) {
    const agent = new OpenClawAgent(`analyst-${pair}`, {
      name: `Analyst (${strategy.name})`,
      role: systemPrompt.role,
    });

    // Build dynamic system prompt
    const fullPrompt = `
${systemPrompt.instructions}

You are analyzing ${pair} using the "${strategy.name}" strategy.

Risk Profile: ${strategy.riskProfile}
Minimum Confidence Required: ${systemPrompt.minConfidence}

Indicators Available:
${strategy.indicators.map(ind => `- ${ind}`).join('\n')}

Strategy Parameters:
${JSON.stringify(strategy.parameters, null, 2)}

Your task:
1. Analyze the provided market data and indicators
2. Determine market sentiment (bullish/bearish/neutral)
3. Identify entry/exit signals based on the strategy
4. Provide confidence score (0-1)
5. Return analysis in JSON format

Output Format:
{
  "sentiment": "bullish|bearish|neutral",
  "confidence": 0.85,
  "signals": {
    "entry": true/false,
    "exit": true/false
  },
  "reasoning": "Detailed explanation",
  "recommendations": ["action1", "action2"]
}
    `.trim();

    agent.setSystemPrompt(fullPrompt);

    return agent;
  }

  calculateATR(ohlcv, period = 14) {
    // Simplified ATR calculation
    const trs = [];
    for (let i = 1; i < ohlcv.length; i++) {
      const high = ohlcv[i].high;
      const low = ohlcv[i].low;
      const prevClose = ohlcv[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }

    const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
    return atr;
  }

  calculateADX(ohlcv, period = 14) {
    // Simplified ADX calculation (placeholder)
    // Full implementation would require +DI, -DI calculation
    return 25; // Placeholder
  }
}

module.exports = { DynamicAnalystAgent };
```

---

## 🏗️ FEATURE 2: REAL-TIME WEB DASHBOARD

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (Next.js/React)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Dashboard   │  │  Trade View  │  │  Settings    │     │
│  │  Overview    │  │  & Charts    │  │  & Config    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                    ↕ WebSocket + REST API
┌─────────────────────────────────────────────────────────────┐
│              Backend API Server (Express)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  REST API    │  │  WebSocket   │  │  Event Bus   │     │
│  │  Endpoints   │  │  Server      │  │  (Redis)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    Monitor Agent                             │
│  • Collects data from all agents                            │
│  • Publishes updates to Event Bus                           │
│  • Provides aggregated metrics                              │
└─────────────────────────────────────────────────────────────┘
```

### API Structure

**File: `api/dashboard-server.js`**

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createLogger } = require('../utils/logger');
const { getBinanceService } = require('../shared/binance-service');
const { getRiskManager } = require('../shared/risk-manager');

const logger = createLogger('dashboard-api');

class DashboardServer {
  constructor(port = 4000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Get system status
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = await this.getSystemStatus();
        res.json(status);
      } catch (error) {
        logger.error('Failed to get system status', { error });
        res.status(500).json({ error: error.message });
      }
    });

    // Get portfolio
    this.app.get('/api/portfolio', async (req, res) => {
      try {
        const portfolio = await this.getPortfolio();
        res.json(portfolio);
      } catch (error) {
        logger.error('Failed to get portfolio', { error });
        res.status(500).json({ error: error.message });
      }
    });

    // Get trade history
    this.app.get('/api/trades', async (req, res) => {
      try {
        const { limit = 50 } = req.query;
        const trades = await this.getTradeHistory(parseInt(limit));
        res.json(trades);
      } catch (error) {
        logger.error('Failed to get trades', { error });
        res.status(500).json({ error: error.message });
      }
    });

    // Get open positions
    this.app.get('/api/positions', async (req, res) => {
      try {
        const positions = await this.getOpenPositions();
        res.json(positions);
      } catch (error) {
        logger.error('Failed to get positions', { error });
        res.status(500).json({ error: error.message });
      }
    });

    // Get agent status
    this.app.get('/api/agents', async (req, res) => {
      try {
        const agents = await this.getAgentStatus();
        res.json(agents);
      } catch (error) {
        logger.error('Failed to get agent status', { error });
        res.status(500).json({ error: error.message });
      }
    });

    // Get risk metrics
    this.app.get('/api/risk', async (req, res) => {
      try {
        const riskManager = getRiskManager();
        const risk = riskManager.getRiskStatus();
        res.json(risk);
      } catch (error) {
        logger.error('Failed to get risk metrics', { error });
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Send initial data
      this.sendInitialData(socket);

      // Subscribe to updates
      socket.on('subscribe', (channels) => {
        logger.info(`Client ${socket.id} subscribed to:`, channels);
        channels.forEach(channel => socket.join(channel));
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

    // Start broadcasting updates
    this.startBroadcasting();
  }

  async sendInitialData(socket) {
    try {
      const [status, portfolio, positions, agents] = await Promise.all([
        this.getSystemStatus(),
        this.getPortfolio(),
        this.getOpenPositions(),
        this.getAgentStatus(),
      ]);

      socket.emit('initial-data', {
        status,
        portfolio,
        positions,
        agents,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to send initial data', { error });
    }
  }

  startBroadcasting() {
    // Broadcast portfolio updates every 5 seconds
    setInterval(async () => {
      try {
        const portfolio = await this.getPortfolio();
        this.io.to('portfolio').emit('portfolio-update', portfolio);
      } catch (error) {
        logger.error('Failed to broadcast portfolio', { error });
      }
    }, 5000);

    // Broadcast positions every 3 seconds
    setInterval(async () => {
      try {
        const positions = await this.getOpenPositions();
        this.io.to('positions').emit('positions-update', positions);
      } catch (error) {
        logger.error('Failed to broadcast positions', { error });
      }
    }, 3000);

    // Broadcast agent status every 10 seconds
    setInterval(async () => {
      try {
        const agents = await this.getAgentStatus();
        this.io.to('agents').emit('agents-update', agents);
      } catch (error) {
        logger.error('Failed to broadcast agents', { error });
      }
    }, 10000);
  }

  async getSystemStatus() {
    const binance = getBinanceService();
    const riskManager = getRiskManager();

    return {
      mode: binance.isTestnet ? 'testnet' : 'production',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      risk: riskManager.getRiskStatus(),
      timestamp: new Date().toISOString(),
    };
  }

  async getPortfolio() {
    const binance = getBinanceService();
    const balance = await binance.fetchBalance();

    // Calculate total value in USDT
    let totalValue = balance.total.USDT || 0;

    return {
      balance: balance.total,
      free: balance.free,
      used: balance.used,
      totalValueUSDT: totalValue,
      timestamp: new Date().toISOString(),
    };
  }

  async getTradeHistory(limit = 50) {
    // Placeholder - implement actual trade history storage
    return {
      trades: [],
      total: 0,
      limit,
    };
  }

  async getOpenPositions() {
    const binance = getBinanceService();
    const openOrders = await binance.fetchOpenOrders();

    return {
      positions: openOrders,
      count: openOrders.length,
      timestamp: new Date().toISOString(),
    };
  }

  async getAgentStatus() {
    // Placeholder - implement actual agent status tracking
    return {
      agents: [
        { name: 'Analyst', status: 'active', lastActivity: new Date().toISOString() },
        { name: 'Strategist', status: 'active', lastActivity: new Date().toISOString() },
        { name: 'Executor', status: 'active', lastActivity: new Date().toISOString() },
        { name: 'Monitor', status: 'active', lastActivity: new Date().toISOString() },
        { name: 'Developer', status: 'active', lastActivity: new Date().toISOString() },
      ],
    };
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`Dashboard API server running on port ${this.port}`);
      logger.info(`WebSocket endpoint: ws://localhost:${this.port}`);
    });
  }

  // Method to emit custom events from agents
  emitEvent(channel, event, data) {
    this.io.to(channel).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = { DashboardServer };
```

### WebSocket Event Types

```typescript
// Types for WebSocket events

interface PortfolioUpdate {
  balance: Record<string, number>;
  free: Record<string, number>;
  used: Record<string, number>;
  totalValueUSDT: number;
  timestamp: string;
}

interface PositionUpdate {
  positions: Array<{
    orderId: string;
    symbol: string;
    side: string;
    amount: number;
    price: number;
    filled: number;
    remaining: number;
    status: string;
  }>;
  count: number;
  timestamp: string;
}

interface AgentUpdate {
  agents: Array<{
    name: string;
    status: 'active' | 'idle' | 'error';
    lastActivity: string;
    currentTask?: string;
  }>;
}

interface TradeEvent {
  type: 'order_placed' | 'order_filled' | 'order_cancelled';
  orderId: string;
  symbol: string;
  side: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: string;
}
```

---

*Continued in next part...*
