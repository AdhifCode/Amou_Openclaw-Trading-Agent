require('dotenv').config();
const { getBinanceService } = require('../shared/binance-service');
const { createLogger } = require('../utils/logger');
const readline = require('readline');

const logger = createLogger('emergency-stop');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function confirmAction() {
  return new Promise((resolve) => {
    rl.question('⚠️  Are you sure you want to cancel ALL open orders? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function cancelAllOrders() {
  logger.warn('🚨 EMERGENCY STOP INITIATED');
  logger.warn('This will cancel ALL open orders on your Binance account\n');

  const binance = getBinanceService();

  // Show current mode
  if (binance.isTestnet) {
    logger.info('Mode: TESTNET ✅');
  } else {
    logger.warn('Mode: PRODUCTION 🔴');
  }

  // Confirm action
  const confirmed = await confirmAction();
  if (!confirmed) {
    logger.info('❌ Operation cancelled by user');
    process.exit(0);
  }

  try {
    logger.info('\nFetching all open orders...');
    const openOrders = await binance.fetchOpenOrders();

    if (openOrders.length === 0) {
      logger.info('✓ No open orders found');
      process.exit(0);
    }

    logger.info(`Found ${openOrders.length} open orders\n`);

    let cancelled = 0;
    let failed = 0;

    for (const order of openOrders) {
      try {
        logger.info(`Cancelling: ${order.symbol} ${order.side} ${order.amount} @ $${order.price}`);
        await binance.cancelOrder(order.orderId, order.symbol);
        logger.info(`✓ Cancelled: ${order.orderId}`);
        cancelled++;
      } catch (error) {
        logger.error(`✗ Failed to cancel: ${order.orderId}`, { error: error.message });
        failed++;
      }
    }

    logger.info('\n═══════════════════════════════════════');
    logger.info(`✅ Successfully cancelled: ${cancelled}`);
    if (failed > 0) {
      logger.warn(`❌ Failed to cancel: ${failed}`);
    }
    logger.info('═══════════════════════════════════════');
    logger.info('🚨 Emergency stop completed');

  } catch (error) {
    logger.error('❌ Emergency stop failed', { error: error.message });
    process.exit(1);
  }
}

cancelAllOrders().catch(console.error);
