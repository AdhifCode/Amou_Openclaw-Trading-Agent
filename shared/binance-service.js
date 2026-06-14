const ccxt = require('ccxt');
const { createLogger } = require('../utils/logger');

const logger = createLogger('binance-service');

/**
 * BinanceService: Wrapper untuk CCXT Binance API
 * Supports: Market data, Technical indicators, Order execution
 */
class BinanceService {
  constructor() {
    this.isTestnet = process.env.BINANCE_TESTNET_ENABLED === 'true';

    const apiKey = this.isTestnet
      ? process.env.BINANCE_TESTNET_API_KEY
      : process.env.BINANCE_API_KEY;

    const apiSecret = this.isTestnet
      ? process.env.BINANCE_TESTNET_API_SECRET
      : process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error('Binance API credentials not found in environment');
    }

    this.exchange = new ccxt.binance({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: {
        defaultType: 'spot', // Use 'spot' for testnet compatibility
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
      logger.debug(`Fetching OHLCV: ${symbol} ${timeframe} (${limit} candles)`);

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
      logger.debug(`Fetching ticker: ${symbol}`);

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
   * Calculate RSI (Relative Strength Index)
   */
  calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) {
      throw new Error(`Not enough data for RSI calculation (need ${period + 1}, got ${closes.length})`);
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

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  /**
   * Calculate SMA (Simple Moving Average)
   */
  calculateSMA(data, period) {
    if (data.length < period) {
      throw new Error(`Not enough data for SMA calculation (need ${period}, got ${data.length})`);
    }

    const slice = data.slice(-period);
    const sum = slice.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }

  /**
   * Calculate EMA (Exponential Moving Average)
   */
  calculateEMA(data, period) {
    if (data.length < period) {
      throw new Error(`Not enough data for EMA calculation (need ${period}, got ${data.length})`);
    }

    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);

    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }

    return ema;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (closes.length < slowPeriod + signalPeriod) {
      throw new Error(`Not enough data for MACD calculation`);
    }

    const emaFast = this.calculateEMA(closes, fastPeriod);
    const emaSlow = this.calculateEMA(closes, slowPeriod);
    const macdLine = emaFast - emaSlow;

    // Calculate signal line (EMA of MACD line)
    // For simplicity, we'll return the current MACD value
    return {
      macd: macdLine,
      signal: macdLine, // Simplified
      histogram: 0,
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(closes, period = 20, stdDev = 2) {
    if (closes.length < period) {
      throw new Error(`Not enough data for Bollinger Bands calculation`);
    }

    const sma = this.calculateSMA(closes, period);
    const slice = closes.slice(-period);

    // Calculate standard deviation
    const squaredDiffs = slice.map(val => Math.pow(val - sma, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
    const standardDeviation = Math.sqrt(variance);

    return {
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation),
    };
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

  /**
   * Get market info (min/max order size, price precision, etc)
   */
  async getMarketInfo(symbol) {
    try {
      await this.exchange.loadMarkets();
      const market = this.exchange.market(symbol);

      return {
        symbol: market.symbol,
        base: market.base,
        quote: market.quote,
        precision: {
          amount: market.precision.amount,
          price: market.precision.price,
        },
        limits: {
          amount: market.limits.amount,
          price: market.limits.price,
          cost: market.limits.cost,
        },
      };
    } catch (error) {
      logger.error('Failed to get market info', { symbol, error: error.message });
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
