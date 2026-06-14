const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createLogger } = require('../utils/logger');
const { getBinanceService } = require('../shared/binance-service');
const { getRiskManager } = require('../shared/risk-manager');
const { getStrategyManager } = require('../shared/strategy-manager');
const { getModelManager } = require('../shared/model-manager');
const { getOrchestrator } = require('../shared/orchestrator');

const logger = createLogger('dashboard-api');

class DashboardServer {
  constructor(port = parseInt(process.env.API_PORT || '4000')) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.DASHBOARD_URL || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();

    this.tradeHistory = [];
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  setupRoutes() {
    this.setupHealthRoutes();
    this.setupDashboardRoutes();
    this.setupStrategyRoutes();
    this.setupModelRoutes();
    this.setupOrchestratorRoutes();
  }

  setupHealthRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  setupDashboardRoutes() {
    this.app.get('/api/status', async (req, res) => {
      try {
        const status = await this.getSystemStatus();
        res.json(status);
      } catch (error) {
        logger.error('Failed to get system status', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/portfolio', async (req, res) => {
      try {
        const portfolio = await this.getPortfolio();
        res.json(portfolio);
      } catch (error) {
        logger.error('Failed to get portfolio', { error });
        res.status(500).json({ error: error.message });
      }
    });

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

    this.app.get('/api/positions', async (req, res) => {
      try {
        const positions = await this.getOpenPositions();
        res.json(positions);
      } catch (error) {
        logger.error('Failed to get positions', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/agents', async (req, res) => {
      try {
        const agents = await this.getAgentStatus();
        res.json(agents);
      } catch (error) {
        logger.error('Failed to get agent status', { error });
        res.status(500).json({ error: error.message });
      }
    });

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

  setupStrategyRoutes() {
    this.app.get('/api/strategies', (req, res) => {
      try {
        const strategyManager = getStrategyManager();
        const strategies = strategyManager.getAllStrategies();
        res.json(strategies);
      } catch (error) {
        logger.error('Failed to get strategies', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/strategies/:pair', (req, res) => {
      try {
        const strategyManager = getStrategyManager();
        const strategy = strategyManager.getStrategy(req.params.pair);
        res.json(strategy);
      } catch (error) {
        logger.error(`Failed to get strategy for ${req.params.pair}`, { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/strategies/:pair', (req, res) => {
      try {
        const strategyManager = getStrategyManager();
        strategyManager.updateStrategy(req.params.pair, req.body);
        res.json({ success: true, message: `Strategy updated for ${req.params.pair}` });
      } catch (error) {
        logger.error(`Failed to update strategy for ${req.params.pair}`, { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/strategies/:pair', (req, res) => {
      try {
        const strategyManager = getStrategyManager();
        strategyManager.addStrategy(req.params.pair, req.body);
        res.json({ success: true, message: `Strategy added for ${req.params.pair}` });
      } catch (error) {
        logger.error(`Failed to add strategy for ${req.params.pair}`, { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.delete('/api/strategies/:pair', (req, res) => {
      try {
        const strategyManager = getStrategyManager();
        strategyManager.deleteStrategy(req.params.pair);
        res.json({ success: true, message: `Strategy deleted for ${req.params.pair}` });
      } catch (error) {
        logger.error(`Failed to delete strategy for ${req.params.pair}`, { error });
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupModelRoutes() {
    this.app.get('/api/models', (req, res) => {
      try {
        const modelManager = getModelManager();
        const models = modelManager.getAllAgentModels();
        res.json(models);
      } catch (error) {
        logger.error('Failed to get models', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/models/catalog', (req, res) => {
      try {
        const modelManager = getModelManager();
        const catalog = modelManager.getModelCatalog();
        res.json(catalog);
      } catch (error) {
        logger.error('Failed to get model catalog', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/models/costs', (req, res) => {
      try {
        const modelManager = getModelManager();
        const agents = modelManager.getAllAgentModels();
        const costs = {};
        for (const [agent, config] of Object.entries(agents)) {
          costs[agent] = modelManager.estimateCost(agent, 1000, 500);
        }
        res.json(costs);
      } catch (error) {
        logger.error('Failed to get model costs', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/models/:agent', (req, res) => {
      try {
        const modelManager = getModelManager();
        const model = modelManager.getAgentModel(req.params.agent);
        res.json(model);
      } catch (error) {
        logger.error(`Failed to get model for ${req.params.agent}`, { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/models/:agent', (req, res) => {
      try {
        const modelManager = getModelManager();
        modelManager.updateAgentModel(req.params.agent, req.body);
        res.json({ success: true, message: `Model updated for ${req.params.agent}` });
      } catch (error) {
        logger.error(`Failed to update model for ${req.params.agent}`, { error });
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupOrchestratorRoutes() {
    this.app.post('/api/orchestrator/start', (req, res) => {
      try {
        const { watchlist } = req.body;

        if (!watchlist || !Array.isArray(watchlist)) {
          return res.status(400).json({ error: 'Invalid watchlist' });
        }

        const orchestrator = getOrchestrator();
        orchestrator.start(watchlist);

        res.json({
          success: true,
          message: 'Orchestrator started',
          watchlist,
        });
      } catch (error) {
        logger.error('Failed to start orchestrator', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/orchestrator/stop', (req, res) => {
      try {
        const orchestrator = getOrchestrator();
        orchestrator.stop();

        res.json({
          success: true,
          message: 'Orchestrator stopped',
        });
      } catch (error) {
        logger.error('Failed to stop orchestrator', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/orchestrator/status', (req, res) => {
      try {
        const orchestrator = getOrchestrator();
        const status = orchestrator.getStatus();
        res.json(status);
      } catch (error) {
        logger.error('Failed to get orchestrator status', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.put('/api/orchestrator/watchlist', (req, res) => {
      try {
        const { watchlist } = req.body;

        if (!watchlist || !Array.isArray(watchlist)) {
          return res.status(400).json({ error: 'Invalid watchlist' });
        }

        const orchestrator = getOrchestrator();
        orchestrator.updateWatchlist(watchlist);

        res.json({
          success: true,
          message: 'Watchlist updated',
          watchlist,
        });
      } catch (error) {
        logger.error('Failed to update watchlist', { error });
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/orchestrator/circuit-breaker/reset/:pair', (req, res) => {
      try {
        const { pair } = req.params;
        const orchestrator = getOrchestrator();
        orchestrator.resetCircuitBreaker(pair);

        res.json({
          success: true,
          message: `Circuit breaker reset for ${pair}`,
        });
      } catch (error) {
        logger.error('Failed to reset circuit breaker', { error });
        res.status(500).json({ error: error.message });
      }
    });
  }

  setupWebSocket() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      this.sendInitialData(socket);

      socket.on('subscribe', (channels) => {
        logger.info(`Client ${socket.id} subscribed to:`, channels);
        channels.forEach(channel => socket.join(channel));
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

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
    setInterval(async () => {
      try {
        const portfolio = await this.getPortfolio();
        this.io.to('portfolio').emit('portfolio-update', portfolio);
      } catch (error) {
        logger.error('Failed to broadcast portfolio', { error });
      }
    }, 5000);

    setInterval(async () => {
      try {
        const positions = await this.getOpenPositions();
        this.io.to('positions').emit('positions-update', positions);
      } catch (error) {
        logger.error('Failed to broadcast positions', { error });
      }
    }, 3000);

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
    return {
      trades: this.tradeHistory.slice(-limit),
      total: this.tradeHistory.length,
      limit,
    };
  }

  addTrade(trade) {
    this.tradeHistory.push({
      ...trade,
      timestamp: new Date().toISOString(),
    });
    this.io.emit('trade-event', trade);
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
    const orchestrator = getOrchestrator();
    const orchStatus = orchestrator.getStatus();

    return {
      agents: [
        {
          name: 'Analyst',
          status: orchStatus.isRunning ? 'active' : 'idle',
          lastActivity: new Date().toISOString(),
          currentTask: orchStatus.activeAnalysis.length > 0
            ? `Analyzing: ${orchStatus.activeAnalysis.join(', ')}`
            : 'Idle',
        },
        {
          name: 'Strategist',
          status: 'active',
          lastActivity: new Date().toISOString(),
          currentTask: 'Awaiting analysis results',
        },
        {
          name: 'Executor',
          status: 'active',
          lastActivity: new Date().toISOString(),
          currentTask: orchStatus.watchlist.length > 0 ? 'Monitoring watchlist' : 'Idle',
        },
        {
          name: 'Monitor',
          status: 'active',
          lastActivity: new Date().toISOString(),
          currentTask: `Tracking ${orchStatus.watchlist.length} pairs`,
        },
        {
          name: 'Developer',
          status: 'active',
          lastActivity: new Date().toISOString(),
          currentTask: 'System monitoring',
        },
      ],
    };
  }

  emitEvent(channel, event, data) {
    this.io.to(channel).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  start() {
    this.server.listen(this.port, () => {
      logger.info(`Dashboard API server running on port ${this.port}`);
      logger.info(`WebSocket endpoint: ws://localhost:${this.port}`);
      logger.info(`REST API endpoint: http://localhost:${this.port}/api`);
    });
  }

  stop() {
    this.server.close();
    logger.info('Dashboard API server stopped');
  }
}

const server = new DashboardServer();

if (require.main === module) {
  server.start();
}

module.exports = { DashboardServer, server };
