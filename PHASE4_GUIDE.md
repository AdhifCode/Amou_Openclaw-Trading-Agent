# IMPLEMENTATION GUIDE - Phase 4: Binance Integration

## Overview
Phase 4 mengintegrasikan Binance API untuk real market data dan order execution menggunakan CCXT library.

## Prerequisites
- ✅ Phase 1-3 completed (Discord Gateway + OpenClaw)
- ✅ Binance API Key dengan Trading permission
- ✅ CCXT library installed (`npm install ccxt`)

---

## 1. Binance Service Module

### File: `shared/binance-service.js`

```javascript
const ccxt = require('ccxt');
const { createLogger } = require('../utils/logger');

const logger = createLogger('binance-service');

class BinanceService {
  constructor() {
    this.isTestnet = process.env.BINANCE_TESTNET_ENABLED === 'true';
    
    const apiKey = this.isTestnet 
      ? process.env.BINANCE_TESTNET_API_KEY 
      : process.env.BINANCE_API_KEY;
    
    const apiSecret = this.isTestnet 
      ? process.env.BINANCE_TESTNET_API_SECRET 
      : process.env.BINANCE_API_SECRET;

    this.exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'future', // 'spot' or 'future'
        adjustForTimeDifference: true,
      },
    });

    if (this.isTestnet) {
      this.exchange.setSandboxMode(true);
      logger.info('✓ Binance Service initialized (TESTNET MODE)');
    } else {
      logger.warn('⚠️  Binance Service initialized (PRODUCTION MODE)');
    }
  }

  /**
   * Fetch OHLCV data for technical analysis
   */
  async fetchOHLCV(symbol, timeframe = '4h', limit = 100) {
    try {
      const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
      
      return ohlcv.map(candle => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      }));
    } catch (error) {
      logger.error('Failed to fetch OHLCV', { symbol, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch current ticker (price, volume, etc)
   */
  async fetchTicker(symbol) {
    try {
      const ticker = await this.exchange.fetchTicker(symbol);
      
      return {
        symbol: ticker.symbol,
        last: ticker.last,
        bid: ticker.bid,
        ask: ticker.ask,
        high: ticker.high,
        low: ticker.low,
        volume: ticker.quoteVolume,
        change: ticker.percentage,
        timestamp: ticker.timestamp,
      };
    } catch (error) {
      logger.error('Failed to fetch ticker', { symbol, error: error.message });
      throw error;
    }
  }

  /**
   * Calculate technical indicators
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) {
      throw new Error('Not enough data for RSI calculation');
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI for remaining periods
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  calculateSMA(data, period) {
    if (data.length < period) {
      throw new Error('Not enough data for SMA calculation');
    }

    const slice = data.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  calculateEMA(data, period) {
    if (data.length < period) {
      throw new Error('Not enough data for EMA calculation');
    }

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Create market order
   */
  async createMarketOrder(symbol, side, amount) {
    try {
      logger.info(`Creating MARKET order: ${side} ${amount} ${symbol}`);

      const order = await this.exchange.createMarketOrder(symbol, side, amount);

      logger.info('Order created successfully', { orderId: order.id });

      return {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        amount: order.amount,
        filled: order.filled,
        price: order.average,
        status: order.status,
        timestamp: order.timestamp,
      };
    } catch (error) {
      logger.error('Failed to create market order', { symbol, side, amount, error: error.message });
      throw error;
    }
  }

  /**
   * Create limit order
   */
  async createLimitOrder(symbol, side, amount, price) {
    try {
      logger.info(`Creating LIMIT order: ${side} ${amount} ${symbol} @ ${price}`);

      const order = await this.exchange.createLimitOrder(symbol, side, amount, price);

      logger.info('Order created successfully', { orderId: order.id });

      return {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        amount: order.amount,
        price: order.price,
        status: order.status,
        timestamp: order.timestamp,
      };
    } catch (error) {
      logger.error('Failed to create limit order', { symbol, side, amount, price, error: error.message });
      throw error;
    }
  }

  /**
   * Fetch account balance
   */
  async fetchBalance() {
    try {
      const balance = await this.exchange.fetchBalance();

      return {
        total: balance.total,
        free: balance.free,
        used: balance.used,
      };
    } catch (error) {
      logger.error('Failed to fetch balance', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch open orders
   */
  async fetchOpenOrders(symbol = undefined) {
    try {
      const orders = await this.exchange.fetchOpenOrders(symbol);

      return orders.map(order => ({
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        amount: order.amount,
        price: order.price,
        filled: order.filled,
        remaining: order.remaining,
        status: order.status,
        timestamp: order.timestamp,
      }));
    } catch (error) {
      logger.error('Failed to fetch open orders', { error: error.message });
      throw error;
    }
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId, symbol) {
    try {
      logger.info(`Cancelling order: ${orderId} for ${symbol}`);

      const result = await this.exchange.cancelOrder(orderId, symbol);

      logger.info('Order cancelled successfully', { orderId });

      return result;
    } catch (error) {
      logger.error('Failed to cancel order', { orderId, symbol, error: error.message });
      throw error;
    }
  }
}

// Singleton
let instance = null;

function getBinanceService() {
  if (!instance) {
    instance = new BinanceService();
  }
  return instance;
}

module.exports = {
  BinanceService,
  getBinanceService,
};
```

---

## 2. Update Analyst Agent

### File: `agents/analyst/index.js`

Update tool handlers untuk menggunakan real Binance data:

```javascript
const { getBinanceService } = require('../../shared/binance-service');

// Di dalam initializeAnalystAgent():
analyzeAgent.setToolHandlers({
  fetch_market_data: async (input) => {
    logger.info(`Fetching market data for ${input.pair} (${input.timeframe})`);

    const binance = getBinanceService();
    const ticker = await binance.fetchTicker(input.pair);

    return {
      pair: input.pair,
      timeframe: input.timeframe,
      current_price: ticker.last,
      high_24h: ticker.high,
      low_24h: ticker.low,
      volume_24h: ticker.volume,
      change_24h: ticker.change,
    };
  },

  analyze_technicals: async (input) => {
    logger.info(`Analyzing ${input.indicators.join(',')} for ${input.pair}`);

    const binance = getBinanceService();
    const ohlcv = await binance.fetchOHLCV(input.pair, input.timeframe, 100);
    const closes = ohlcv.map(c => c.close);

    const result = {
      pair: input.pair,
      timeframe: input.timeframe,
    };

    if (input.indicators.includes('RSI')) {
      result.RSI = binance.calculateRSI(closes, 14);
    }

    if (input.indicators.includes('SMA')) {
      result.SMA_20 = binance.calculateSMA(closes, 20);
      result.SMA_50 = binance.calculateSMA(closes, 50);
    }

    if (input.indicators.includes('EMA')) {
      result.EMA_12 = binance.calculateEMA(closes, 12);
      result.EMA_26 = binance.calculateEMA(closes, 26);
    }

    return result;
  },
});
```

---

## 3. Update Executor Agent

### File: `agents/executor/index.js`

Update untuk real order execution:

```javascript
const { getBinanceService } = require('../../shared/binance-service');

executorAgent.setToolHandlers({
  validate_order: async (input) => {
    const binance = getBinanceService();
    const ticker = await binance.fetchTicker(input.pair);

    // Validate price is within reasonable range
    const priceDeviation = Math.abs(input.price - ticker.last) / ticker.last;
    if (priceDeviation > 0.05) {
      return {
        valid: false,
        message: `Price ${input.price} deviates ${(priceDeviation * 100).toFixed(2)}% from market (${ticker.last})`,
      };
    }

    return {
      valid: true,
      pair: input.pair,
      quantity: input.quantity,
      estimated_value: (input.quantity * input.price).toFixed(2),
      message: 'Order validation OK',
    };
  },

  execute_binance_order: async (input) => {
    logger.warn(`⚠️ REAL ORDER EXECUTION: ${input.pair} ${input.side} ${input.quantity}`);

    const binance = getBinanceService();

    let order;
    if (input.order_type === 'MARKET') {
      order = await binance.createMarketOrder(input.pair, input.side.toLowerCase(), input.quantity);
    } else if (input.order_type === 'LIMIT') {
      order = await binance.createLimitOrder(input.pair, input.side.toLowerCase(), input.quantity, input.price);
    } else {
      throw new Error(`Unsupported order type: ${input.order_type}`);
    }

    return order;
  },
});
```

---

## 4. Update Monitor Agent

### File: `agents/monitor/index.js`

```javascript
const { getBinanceService } = require('../../shared/binance-service');

monitorAgent.setToolHandlers({
  get_portfolio_status: async () => {
    const binance = getBinanceService();
    const balance = await binance.fetchBalance();
    const openOrders = await binance.fetchOpenOrders();

    return {
      balance: balance.total,
      free: balance.free,
      used: balance.used,
      open_orders: openOrders.length,
      positions: openOrders,
    };
  },

  check_alert_conditions: async () => {
    const binance = getBinanceService();
    const openOrders = await binance.fetchOpenOrders();

    const alerts = [];

    // Check for orders close to TP/SL
    for (const order of openOrders) {
      const ticker = await binance.fetchTicker(order.symbol);
      const priceDistance = Math.abs(ticker.last - order.price) / order.price;

      if (priceDistance < 0.02) {
        alerts.push({
          type: 'PRICE_PROXIMITY',
          symbol: order.symbol,
          message: `Price ${ticker.last} is within 2% of order price ${order.price}`,
        });
      }
    }

    return {
      alerts,
      critical: alerts.length > 0,
    };
  },
});
```

---

## 5. Testing Phase 4

### Test Script: `test-binance.js`

```javascript
const { getBinanceService } = require('./shared/binance-service');

async function testBinance() {
  const binance = getBinanceService();

  console.log('Testing Binance Integration...\n');

  // Test 1: Fetch ticker
  console.log('1. Fetching BTC/USDT ticker...');
  const ticker = await binance.fetchTicker('BTC/USDT');
  console.log('✓ Ticker:', ticker);

  // Test 2: Fetch OHLCV
  console.log('\n2. Fetching OHLCV data...');
  const ohlcv = await binance.fetchOHLCV('BTC/USDT', '1h', 10);
  console.log('✓ OHLCV:', ohlcv.slice(0, 3));

  // Test 3: Calculate RSI
  console.log('\n3. Calculating RSI...');
  const closes = ohlcv.map(c => c.close);
  const rsi = binance.calculateRSI(closes, 14);
  console.log('✓ RSI:', rsi.toFixed(2));

  // Test 4: Fetch balance
  console.log('\n4. Fetching account balance...');
  const balance = await binance.fetchBalance();
  console.log('✓ Balance:', balance);

  console.log('\n✅ All tests passed!');
}

testBinance().catch(console.error);
```

Run: `node test-binance.js`

---

## 6. Safety Checklist

Before going to production:

- [ ] Test all functions on TESTNET first
- [ ] Implement position size limits
- [ ] Add daily loss limits
- [ ] Implement emergency stop mechanism
- [ ] Set up monitoring alerts
- [ ] Test error handling (network failures, API errors)
- [ ] Implement order confirmation prompts
- [ ] Add logging for all trades
- [ ] Set up backup API keys
- [ ] Document all trading parameters

---

## 7. Environment Variables for Phase 4

Add to `.env`:

```env
# Risk Management
MAX_POSITION_SIZE_USD=1000
MAX_DAILY_LOSS_USD=500
MAX_OPEN_POSITIONS=3
REQUIRE_CONFIRMATION=true

# Trading Parameters
DEFAULT_LEVERAGE=1
SLIPPAGE_TOLERANCE=0.005
MIN_PROFIT_TARGET=0.02
```

---

## Next Steps

1. Implement `shared/binance-service.js`
2. Update all agent tool handlers
3. Test on TESTNET extensively
4. Add risk management checks
5. Deploy to production with monitoring

**CRITICAL**: Always test on TESTNET before production!
