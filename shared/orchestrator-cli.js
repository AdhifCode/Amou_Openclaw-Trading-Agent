require('dotenv').config();
const { getOrchestrator } = require('./orchestrator');
const { createLogger } = require('../utils/logger');

const logger = createLogger('orchestrator-cli');

async function main() {
  const watchlistEnv = process.env.WATCHLIST || 'BTC/USDT,ETH/USDT,SOL/USDT';
  const watchlist = watchlistEnv.split(',').map(s => s.trim());

  logger.info('Orchestrator CLI starting', { watchlist });

  const orchestrator = getOrchestrator();

  orchestrator.on('started', (data) => {
    logger.info('Orchestrator started event', data);
  });

  orchestrator.on('stopped', () => {
    logger.info('Orchestrator stopped event');
  });

  orchestrator.on('workflow-completed', (workflow) => {
    logger.info(`Workflow completed: ${workflow.pair}`, {
      state: workflow.state,
      duration: workflow.duration,
    });
  });

  orchestrator.on('circuit-breaker-opened', ({ pair, failures }) => {
    logger.warn(`Circuit breaker opened for ${pair}`, { failures });
  });

  orchestrator.start(watchlist);

  const shutdown = () => {
    logger.info('Shutting down...');
    orchestrator.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Orchestrator CLI failed', { error });
  process.exit(1);
});
