require('dotenv').config();
const { getBinanceService } = require('../shared/binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('e2e-test');

async function runE2ETest() {
  logger.info('🧪 Starting End-to-End Test Suite\n');

  const tests = [
    testBinanceConnection,
    testMarketDataFetch,
    testTechnicalIndicators,
    testOrderValidation,
    testBalanceFetch,
    testMarketInfo,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (error) {
      logger.error(`Test failed: ${test.name}`, { error: error.message });
      failed++;
    }
  }

  logger.info('\n═══════════════════════════════════════');
  logger.info(`✅ Passed: ${passed}`);
  logger.info(`❌ Failed: ${failed}`);
  logger.info('═══════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

async function testBinanceConnection() {
  logger.info('Test 1: Binance Connection');
  const binance = getBinanceService();
  const ticker = await binance.fetchTicker('BTC/USDT');
  if (!ticker.last) throw new Error('No ticker data');
  logger.info(`✓ Connected (BTC: $${ticker.last})`);
}

async function testMarketDataFetch() {
  logger.info('Test 2: Market Data Fetch');
  const binance = getBinanceService();
  const ohlcv = await binance.fetchOHLCV('ETH/USDT', '1h', 20);
  if (ohlcv.length !== 20) throw new Error('Invalid OHLCV data');
  logger.info(`✓ Fetched ${ohlcv.length} candles`);
}

async function testTechnicalIndicators() {
  logger.info('Test 3: Technical Indicators');
  const binance = getBinanceService();
  const ohlcv = await binance.fetchOHLCV('BTC/USDT', '4h', 50);
  const closes = ohlcv.map(c => c.close);

  const rsi = binance.calculateRSI(closes, 14);
  const sma = binance.calculateSMA(closes, 20);
  const ema = binance.calculateEMA(closes, 12);

  if (rsi < 0 || rsi > 100) throw new Error('Invalid RSI');
  if (sma <= 0) throw new Error('Invalid SMA');
  if (ema <= 0) throw new Error('Invalid EMA');

  logger.info(`✓ RSI: ${rsi.toFixed(2)}, SMA: ${sma.toFixed(2)}, EMA: ${ema.toFixed(2)}`);
}

async function testOrderValidation() {
  logger.info('Test 4: Order Validation');
  const binance = getBinanceService();
  const marketInfo = await binance.getMarketInfo('BTC/USDT');

  if (!marketInfo.limits.amount.min) throw new Error('No market limits');
  logger.info(`✓ Min order: ${marketInfo.limits.amount.min} BTC`);
}

async function testBalanceFetch() {
  logger.info('Test 5: Balance Fetch');
  const binance = getBinanceService();
  const balance = await binance.fetchBalance();

  if (!balance.total) throw new Error('No balance data');
  logger.info(`✓ Balance fetched (${Object.keys(balance.total).length} assets)`);
}

async function testMarketInfo() {
  logger.info('Test 6: Market Info');
  const binance = getBinanceService();
  const marketInfo = await binance.getMarketInfo('BTC/USDT');

  if (!marketInfo.symbol) throw new Error('No market info');
  logger.info(`✓ Market: ${marketInfo.symbol} (${marketInfo.base}/${marketInfo.quote})`);
}

runE2ETest();
