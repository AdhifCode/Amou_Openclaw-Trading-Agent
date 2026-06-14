const express = require('express');
const { getBinanceService } = require('./binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('health-check');
const app = express();

app.use(express.json());

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  try {
    // Check Binance connectivity
    const binance = getBinanceService();
    await binance.fetchTicker('BTC/USDT');
    health.checks.binance = 'ok';
  } catch (error) {
    health.checks.binance = 'error';
    health.status = 'degraded';
    logger.error('Binance health check failed', { error: error.message });
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
  };

  // Check if memory usage is critical (>80% of heap)
  const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  if (heapUsagePercent > 80) {
    health.checks.memory.status = 'warning';
    health.status = 'degraded';
  }

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString(),
  };
  res.json(metrics);
});

app.get('/ping', (req, res) => {
  res.json({ status: 'pong', timestamp: new Date().toISOString() });
});

function startHealthServer(port = 3000) {
  app.listen(port, () => {
    logger.info(`Health check server running on port ${port}`);
    logger.info(`  - Health: http://localhost:${port}/health`);
    logger.info(`  - Metrics: http://localhost:${port}/metrics`);
    logger.info(`  - Ping: http://localhost:${port}/ping`);
  });
}

module.exports = { startHealthServer };
