# RISK MANAGEMENT MODULE

## Overview
Module untuk mengelola risk management pada setiap eksekusi order, mencegah over-trading dan kerugian berlebihan.

---

## Implementation

**File: `shared/risk-manager.js`**

```javascript
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
    const orderValue = order.quantity * order.price;
    if (orderValue > this.maxPositionSize) {
      validation.allowed = false;
      validation.reasons.push(
        `Position size $${orderValue.toFixed(2)} exceeds limit $${this.maxPositionSize}`
      );
    }

    // Check if price is reasonable (not too far from market)
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
      logger.error('Failed to fetch market price for validation', { error });
    }

    // Check risk/reward ratio
    if (order.stopLoss && order.takeProfit) {
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
    };
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
```

---

## Integration with Executor Agent

Update `agents/executor/index.js`:

```javascript
const { getRiskManager } = require('../../shared/risk-manager');

// In execute_binance_order handler:
execute_binance_order: async (input) => {
  const riskManager = getRiskManager();
  
  // Validate with risk manager
  const validation = await riskManager.validateOrder({
    pair: input.pair,
    quantity: input.quantity,
    price: input.price || 0,
    stopLoss: input.stop_loss,
    takeProfit: input.take_profit,
  });

  if (!validation.allowed) {
    logger.error('Order rejected by risk manager', { reasons: validation.reasons });
    return {
      success: false,
      message: 'Order rejected by risk manager',
      reasons: validation.reasons,
    };
  }

  if (validation.warnings.length > 0) {
    logger.warn('Order has warnings', { warnings: validation.warnings });
  }

  // Execute order...
  const binance = getBinanceService();
  const order = await binance.createMarketOrder(input.pair, input.side.toLowerCase(), input.quantity);

  // Update risk manager after successful execution
  // (PnL will be calculated later by Monitor agent)

  return order;
},
```

---

## Environment Variables

Add to `.env`:

```env
# Risk Management
MAX_POSITION_SIZE=100        # Maximum position size in USD
MAX_DAILY_LOSS=-15          # Maximum daily loss in USD (negative value)
LEVERAGE=1                   # Leverage multiplier (1 = no leverage)
RISK_PERCENT_PER_TRADE=2    # Risk percentage per trade (2% recommended)
```

---

## Testing Risk Manager

**File: `tests/risk-manager.test.js`**

```javascript
const { RiskManager } = require('../shared/risk-manager');

describe('RiskManager', () => {
  let riskManager;

  beforeEach(() => {
    process.env.MAX_POSITION_SIZE = '100';
    process.env.MAX_DAILY_LOSS = '-15';
    riskManager = new RiskManager();
  });

  test('should reject order exceeding position size', async () => {
    const order = {
      pair: 'BTC/USDT',
      quantity: 0.01,
      price: 50000, // $500 position
    };

    const validation = await riskManager.validateOrder(order);
    expect(validation.allowed).toBe(false);
    expect(validation.reasons).toContain(expect.stringContaining('exceeds limit'));
  });

  test('should reject order when daily loss limit reached', async () => {
    riskManager.dailyPnL = -20; // Already lost $20

    const order = {
      pair: 'BTC/USDT',
      quantity: 0.001,
      price: 50000,
    };

    const validation = await riskManager.validateOrder(order);
    expect(validation.allowed).toBe(false);
  });

  test('should calculate position size correctly', () => {
    const positionSize = riskManager.calculatePositionSize(
      1000,  // $1000 account
      2,     // 2% risk
      50000, // Entry price
      49000  // Stop loss
    );

    expect(positionSize).toBeCloseTo(0.02, 2); // Should risk $20 on $1000 move
  });

  test('should update daily PnL', () => {
    riskManager.updateDailyPnL(5);
    expect(riskManager.dailyPnL).toBe(5);
    expect(riskManager.dailyTradeCount).toBe(1);

    riskManager.updateDailyPnL(-3);
    expect(riskManager.dailyPnL).toBe(2);
    expect(riskManager.dailyTradeCount).toBe(2);
  });
});
```

---

## Usage in Discord

```
User: @Executor execute {"pair":"BTC/USDT","side":"BUY","quantity":0.01,"price":50000}

Executor: ❌ Order rejected by risk manager
Reasons:
- Position size $500.00 exceeds limit $100.00
```

```
User: @Executor status

Executor: 📊 Risk Status:
Daily PnL: -$8.50
Daily Trades: 3
Max Daily Loss: -$15.00
Remaining Loss Allowance: $6.50
Trading Allowed: ✅ Yes
```

---

## Best Practices

1. **Start Conservative**: Begin with small position sizes and tight loss limits
2. **Monitor Daily**: Check risk status regularly throughout the day
3. **Adjust Gradually**: Increase limits only after consistent profitability
4. **Never Override**: Don't bypass risk manager checks manually
5. **Review Weekly**: Analyze risk metrics and adjust parameters

---

## Advanced Features (Future)

- [ ] Per-symbol position limits
- [ ] Correlation-based exposure limits
- [ ] Volatility-adjusted position sizing
- [ ] Time-based trading restrictions
- [ ] Drawdown-based circuit breakers
