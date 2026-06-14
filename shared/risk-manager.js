const { createLogger } = require('../utils/logger');
const { getBinanceService } = require('./binance-service');

const logger = createLogger('risk-manager');

class RiskManager {
  constructor() {
    this.maxPositionSize = parseFloat(process.env.MAX_POSITION_SIZE || 100);
    this.maxDailyLoss = parseFloat(process.env.MAX_DAILY_LOSS || -15);
    this.leverage = parseFloat(process.env.LEVERAGE || 1);
    this.dailyPnL = 0;
    this.dailyTradeCount = 0;
    this.lastResetDate = new Date().toDateString();

    logger.info('Risk Manager initialized', {
      maxPositionSize: this.maxPositionSize,
      maxDailyLoss: this.maxDailyLoss,
      leverage: this.leverage,
    });
  }

  /**
   * Reset daily counters at midnight
   */
  checkDailyReset() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      logger.info('Daily reset triggered', {
        previousPnL: this.dailyPnL,
        previousTrades: this.dailyTradeCount,
      });
      this.dailyPnL = 0;
      this.dailyTradeCount = 0;
      this.lastResetDate = today;
    }
  }

  /**
   * Validate order before execution
   */
  async validateOrder(order) {
    this.checkDailyReset();

    const validation = {
      allowed: true,
      reasons: [],
      warnings: [],
    };

    // Check daily loss limit
    if (this.dailyPnL <= this.maxDailyLoss) {
      validation.allowed = false;
      validation.reasons.push(
        `Daily loss limit reached: $${this.dailyPnL.toFixed(2)} (limit: $${this.maxDailyLoss})`
      );
    }

    // Check position size
    const orderValue = order.quantity * (order.price || 0);
    if (orderValue > this.maxPositionSize) {
      validation.allowed = false;
      validation.reasons.push(
        `Position size $${orderValue.toFixed(2)} exceeds limit $${this.maxPositionSize}`
      );
    }

    // Check if price is reasonable (not too far from market)
    if (order.price && order.price > 0) {
      try {
        const binance = getBinanceService();
        const ticker = await binance.fetchTicker(order.pair);
        const priceDeviation = Math.abs(order.price - ticker.last) / ticker.last;

        if (priceDeviation > 0.1) {
          validation.warnings.push(
            `Price deviates ${(priceDeviation * 100).toFixed(2)}% from market`
          );
        }
      } catch (error) {
        logger.error('Failed to fetch market price for validation', { error: error.message });
      }
    }

    // Check risk/reward ratio
    if (order.stopLoss && order.takeProfit && order.price) {
      const risk = Math.abs(order.price - order.stopLoss);
      const reward = Math.abs(order.takeProfit - order.price);
      const rrRatio = reward / risk;

      if (rrRatio < 1.5) {
        validation.warnings.push(
          `Low R:R ratio: ${rrRatio.toFixed(2)} (recommended: >1.5)`
        );
      }
    }

    logger.info('Order validation result', {
      pair: order.pair,
      allowed: validation.allowed,
      reasons: validation.reasons,
      warnings: validation.warnings,
    });

    return validation;
  }

  /**
   * Calculate position size based on risk percentage
   */
  calculatePositionSize(accountBalance, riskPercent, entryPrice, stopLoss) {
    const riskAmount = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entryPrice - stopLoss);

    if (priceRisk === 0) {
      throw new Error('Stop loss cannot be equal to entry price');
    }

    const positionSize = riskAmount / priceRisk;

    logger.info('Position size calculated', {
      accountBalance,
      riskPercent,
      riskAmount,
      priceRisk,
      positionSize,
    });

    return positionSize;
  }

  /**
   * Update daily PnL after trade
   */
  updateDailyPnL(pnl) {
    this.checkDailyReset();
    this.dailyPnL += pnl;
    this.dailyTradeCount++;

    logger.info('Daily PnL updated', {
      tradePnL: pnl,
      dailyPnL: this.dailyPnL,
      dailyTradeCount: this.dailyTradeCount,
    });
  }

  /**
   * Get current risk status
   */
  getRiskStatus() {
    this.checkDailyReset();

    return {
      dailyPnL: this.dailyPnL,
      dailyTradeCount: this.dailyTradeCount,
      maxDailyLoss: this.maxDailyLoss,
      maxPositionSize: this.maxPositionSize,
      remainingLossAllowance: this.maxDailyLoss - this.dailyPnL,
      tradingAllowed: this.dailyPnL > this.maxDailyLoss,
      lastResetDate: this.lastResetDate,
    };
  }

  /**
   * Force reset (for testing or manual intervention)
   */
  forceReset() {
    logger.warn('Force reset triggered');
    this.dailyPnL = 0;
    this.dailyTradeCount = 0;
    this.lastResetDate = new Date().toDateString();
  }
}

// Singleton
let instance = null;

function getRiskManager() {
  if (!instance) {
    instance = new RiskManager();
  }
  return instance;
}

module.exports = {
  RiskManager,
  getRiskManager,
};
