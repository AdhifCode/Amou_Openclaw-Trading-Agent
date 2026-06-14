require('dotenv').config();
const { getBinanceService } = require('../shared/binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('testnet-order');

async function testOrderExecution() {
  logger.info('⚠️  TESTNET ORDER EXECUTION TEST\n');

  const binance = getBinanceService();

  if (!binance.isTestnet) {
    logger.error('❌ NOT IN TESTNET MODE! Aborting.');
    logger.error('Set BINANCE_TESTNET_ENABLED=true in .env');
    process.exit(1);
  }

  try {
    // Step 1: Get current price
    logger.info('Step 1: Fetching current BTC/USDT price...');
    const ticker = await binance.fetchTicker('BTC/USDT');
    logger.info(`Current price: $${ticker.last}`);

    // Step 2: Get market info
    logger.info('\nStep 2: Getting market info...');
    const marketInfo = await binance.getMarketInfo('BTC/USDT');
    logger.info(`Min order size: ${marketInfo.limits.amount.min} BTC`);

    // Step 3: Check balance
    logger.info('\nStep 3: Checking balance...');
    const balance = await binance.fetchBalance();
    const usdtBalance = balance.free.USDT || 0;
    logger.info(`Available USDT: $${usdtBalance.toFixed(2)}`);

    if (usdtBalance < 20) {
      logger.warn('⚠️  Insufficient testnet balance.');
      logger.warn('Request testnet funds from: https://testnet.binance.vision/');
      return;
    }

    // Step 4: Place LIMIT BUY order (below market price, won't fill immediately)
    const orderPrice = (ticker.last * 0.95).toFixed(2); // 5% below market
    const orderAmount = marketInfo.limits.amount.min;

    logger.info(`\nStep 4: Placing LIMIT BUY order...`);
    logger.info(`  Pair: BTC/USDT`);
    logger.info(`  Side: BUY`);
    logger.info(`  Amount: ${orderAmount} BTC`);
    logger.info(`  Price: $${orderPrice}`);

    const order = await binance.createLimitOrder('BTC/USDT', 'buy', orderAmount, parseFloat(orderPrice));
    logger.info(`✓ Order placed! ID: ${order.orderId}`);
    logger.info(`  Status: ${order.status}`);

    // Step 5: Fetch open orders
    logger.info('\nStep 5: Fetching open orders...');
    const openOrders = await binance.fetchOpenOrders('BTC/USDT');
    logger.info(`Open orders: ${openOrders.length}`);

    if (openOrders.length > 0) {
      openOrders.forEach((o, i) => {
        logger.info(`  ${i + 1}. ${o.symbol} ${o.side} ${o.amount} @ $${o.price} (${o.status})`);
      });
    }

    // Step 6: Cancel the order
    logger.info('\nStep 6: Cancelling order...');
    await binance.cancelOrder(order.orderId, 'BTC/USDT');
    logger.info(`✓ Order cancelled`);

    // Step 7: Verify cancellation
    logger.info('\nStep 7: Verifying cancellation...');
    const openOrdersAfter = await binance.fetchOpenOrders('BTC/USDT');
    logger.info(`Open orders after cancel: ${openOrdersAfter.length}`);

    logger.info('\n═══════════════════════════════════════');
    logger.info('✅ TESTNET ORDER TEST PASSED');
    logger.info('═══════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Test failed', { error: error.message });
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testOrderExecution();
