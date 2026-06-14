require('dotenv').config();
const { getBinanceService } = require('./shared/binance-service');
const { createLogger } = require('./utils/logger');

const logger = createLogger('test-binance');

async function testBinance() {
  logger.info('🧪 Testing Binance Integration...\n');

  try {
    const binance = getBinanceService();

    // Test 1: Fetch ticker
    logger.info('1️⃣  Fetching BTC/USDT ticker...');
    const ticker = await binance.fetchTicker('BTC/USDT');
    logger.info(`✓ Ticker: ${ticker.symbol}`);
    logger.info(`  Price: $${ticker.last}`);
    logger.info(`  24h High: $${ticker.high}`);
    logger.info(`  24h Low: $${ticker.low}`);
    logger.info(`  24h Volume: $${ticker.volume.toFixed(0)}`);
    logger.info(`  24h Change: ${ticker.change?.toFixed(2)}%\n`);

    // Test 2: Fetch OHLCV
    logger.info('2️⃣  Fetching OHLCV data (last 50 candles, 1h)...');
    const ohlcv = await binance.fetchOHLCV('BTC/USDT', '1h', 50);
    logger.info(`✓ Fetched ${ohlcv.length} candles`);
    logger.info(`  Latest candle:`);
    logger.info(`    Open: $${ohlcv[ohlcv.length - 1].open}`);
    logger.info(`    High: $${ohlcv[ohlcv.length - 1].high}`);
    logger.info(`    Low: $${ohlcv[ohlcv.length - 1].low}`);
    logger.info(`    Close: $${ohlcv[ohlcv.length - 1].close}\n`);

    // Test 3: Calculate technical indicators
    logger.info('3️⃣  Calculating technical indicators...');
    const closes = ohlcv.map(c => c.close);

    const rsi = binance.calculateRSI(closes, 14);
    logger.info(`✓ RSI(14): ${rsi.toFixed(2)}`);

    const sma20 = binance.calculateSMA(closes, 20);
    logger.info(`✓ SMA(20): $${sma20.toFixed(2)}`);

    const ema12 = binance.calculateEMA(closes, 12);
    logger.info(`✓ EMA(12): $${ema12.toFixed(2)}`);

    const bb = binance.calculateBollingerBands(closes, 20, 2);
    logger.info(`✓ Bollinger Bands:`);
    logger.info(`    Upper: $${bb.upper.toFixed(2)}`);
    logger.info(`    Middle: $${bb.middle.toFixed(2)}`);
    logger.info(`    Lower: $${bb.lower.toFixed(2)}\n`);

    // Test 4: Fetch balance
    logger.info('4️⃣  Fetching account balance...');
    const balance = await binance.fetchBalance();
    logger.info(`✓ Balance fetched`);

    if (balance.total.USDT) {
      logger.info(`  USDT Total: $${balance.total.USDT.toFixed(2)}`);
      logger.info(`  USDT Free: $${balance.free.USDT.toFixed(2)}`);
      logger.info(`  USDT Used: $${balance.used.USDT.toFixed(2)}`);
    } else {
      logger.info(`  No USDT balance found`);
    }
    logger.info('');

    // Test 5: Fetch open orders
    logger.info('5️⃣  Fetching open orders...');
    const openOrders = await binance.fetchOpenOrders();
    logger.info(`✓ Open orders: ${openOrders.length}`);

    if (openOrders.length > 0) {
      openOrders.forEach((order, i) => {
        logger.info(`  ${i + 1}. ${order.symbol} ${order.side} ${order.amount} @ $${order.price}`);
      });
    } else {
      logger.info(`  (No open orders)`);
    }
    logger.info('');

    // Test 6: Get market info
    logger.info('6️⃣  Getting market info for BTC/USDT...');
    const marketInfo = await binance.getMarketInfo('BTC/USDT');
    logger.info(`✓ Market info:`);
    logger.info(`  Symbol: ${marketInfo.symbol}`);
    logger.info(`  Base: ${marketInfo.base}`);
    logger.info(`  Quote: ${marketInfo.quote}`);
    logger.info(`  Min amount: ${marketInfo.limits.amount.min}`);
    logger.info(`  Max amount: ${marketInfo.limits.amount.max}`);
    logger.info('');

    // Summary
    logger.info('═══════════════════════════════════════════════════');
    logger.info('✅ All Binance integration tests passed!');
    logger.info(`Mode: ${binance.isTestnet ? 'TESTNET ⚠️' : 'PRODUCTION 🔴'}`);
    logger.info('═══════════════════════════════════════════════════');

  } catch (error) {
    logger.error('❌ Binance test failed');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testBinance().catch(error => {
  logger.error('Fatal error', { error });
  process.exit(1);
});
