# PHASE 5: TESTING & DEPLOYMENT GUIDE

## Overview
Fase terakhir untuk membawa sistem Multi-Agent Trading dari development ke production-ready state dengan comprehensive testing, monitoring, dan deployment automation.

---

## 1. PRE-DEPLOYMENT CHECKLIST

### 1.1 Security Audit
```bash
# Check for exposed secrets
grep -r "sk-ant-" . --exclude-dir=node_modules
grep -r "API_KEY" . --exclude-dir=node_modules --exclude=".env*"

# Verify .gitignore
cat .gitignore | grep -E "\.env$|logs/|\.log$"

# Test encryption
node -e "const {encrypt, decrypt} = require('./utils/encryption'); const test = encrypt('test'); console.log(decrypt(test) === 'test' ? '✓ Encryption OK' : '✗ Failed')"
```

### 1.2 Environment Validation
```bash
# Run environment validator
node -e "require('./utils/env-validator').validateEnv()"

# Check all required variables
cat > check-env.js << 'EOF'
const required = [
  'DISCORD_BOT_TOKEN_ANALYST',
  'DISCORD_BOT_TOKEN_STRATEGIST',
  'DISCORD_BOT_TOKEN_EXECUTOR',
  'DISCORD_BOT_TOKEN_MONITOR',
  'DISCORD_BOT_TOKEN_DEVELOPER',
  'BINANCE_API_KEY',
  'BINANCE_API_SECRET',
  'LLM_PROVIDER'
];

require('dotenv').config();
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing variables:', missing);
  process.exit(1);
}
console.log('✅ All required environment variables present');
EOF

node check-env.js
```

---

## 2. COMPREHENSIVE TESTING

### 2.1 Unit Tests for Binance Service

**File: `tests/binance-service.test.js`**

```javascript
const { getBinanceService } = require('../shared/binance-service');

describe('BinanceService', () => {
  let binance;

  beforeAll(() => {
    process.env.BINANCE_TESTNET_ENABLED = 'true';
    binance = getBinanceService();
  });

  test('should fetch ticker data', async () => {
    const ticker = await binance.fetchTicker('BTC/USDT');
    expect(ticker).toHaveProperty('last');
    expect(ticker).toHaveProperty('symbol');
    expect(ticker.last).toBeGreaterThan(0);
  }, 10000);

  test('should fetch OHLCV data', async () => {
    const ohlcv = await binance.fetchOHLCV('BTC/USDT', '1h', 10);
    expect(ohlcv).toHaveLength(10);
    expect(ohlcv[0]).toHaveProperty('close');
  }, 10000);

  test('should calculate RSI correctly', () => {
    const closes = [44, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64];
    const rsi = binance.calculateRSI(closes, 14);
    expect(rsi).toBeGreaterThan(0);
    expect(rsi).toBeLessThan(100);
  });

  test('should calculate SMA correctly', () => {
    const data = [1, 2, 3, 4, 5];
    const sma = binance.calculateSMA(data, 5);
    expect(sma).toBe(3);
  });

  test('should fetch balance', async () => {
    const balance = await binance.fetchBalance();
    expect(balance).toHaveProperty('total');
    expect(balance).toHaveProperty('free');
  }, 10000);

  test('should validate market order parameters', async () => {
    const marketInfo = await binance.getMarketInfo('BTC/USDT');
    expect(marketInfo).toHaveProperty('limits');
    expect(marketInfo.limits.amount).toHaveProperty('min');
  }, 10000);
});
```

### 2.2 Integration Tests

**File: `tests/integration.test.js`**

```javascript
const { Client, GatewayIntentBits } = require('discord.js');
const { getBinanceService } = require('../shared/binance-service');

describe('Integration Tests', () => {
  test('Discord client should initialize', () => {
    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });
    expect(client).toBeDefined();
  });

  test('Binance service should connect', async () => {
    const binance = getBinanceService();
    const ticker = await binance.fetchTicker('BTC/USDT');
    expect(ticker.last).toBeGreaterThan(0);
  }, 15000);

  test('LLM provider should be configured', () => {
    const { createLLMProvider } = require('../shared/llm/llm-factory');
    const provider = createLLMProvider();
    expect(provider).toBeDefined();
  });
});
```

### 2.3 End-to-End Testing Script

**File: `tests/e2e-test.js`**

```javascript
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

runE2ETest();
```

**Run E2E tests:**
```bash
node tests/e2e-test.js
```

---

## 3. TESTNET VALIDATION

### 3.1 Testnet Order Execution Test

**File: `tests/testnet-order.js`**

```javascript
require('dotenv').config();
const { getBinanceService } = require('../shared/binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('testnet-order');

async function testOrderExecution() {
  logger.info('⚠️  TESTNET ORDER EXECUTION TEST\n');

  const binance = getBinanceService();

  if (!binance.isTestnet) {
    logger.error('❌ NOT IN TESTNET MODE! Aborting.');
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
    logger.info(`Available USDT: $${usdtBalance}`);

    if (usdtBalance < 20) {
      logger.warn('⚠️  Insufficient testnet balance. Request testnet funds from Binance.');
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

    // Step 5: Fetch open orders
    logger.info('\nStep 5: Fetching open orders...');
    const openOrders = await binance.fetchOpenOrders('BTC/USDT');
    logger.info(`Open orders: ${openOrders.length}`);

    // Step 6: Cancel the order
    logger.info('\nStep 6: Cancelling order...');
    await binance.cancelOrder(order.orderId, 'BTC/USDT');
    logger.info(`✓ Order cancelled`);

    logger.info('\n✅ TESTNET ORDER TEST PASSED');

  } catch (error) {
    logger.error('❌ Test failed', { error: error.message });
    process.exit(1);
  }
}

testOrderExecution();
```

**Run testnet order test:**
```bash
node tests/testnet-order.js
```

---

## 4. PRODUCTION DEPLOYMENT

### 4.1 PM2 Process Manager Setup

**Install PM2:**
```bash
npm install -g pm2
```

**File: `ecosystem.config.js`**

```javascript
module.exports = {
  apps: [
    {
      name: 'trading-multi-agent',
      script: './shared/discord-gateway-main.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

**PM2 Commands:**
```bash
# Start application
pm2 start ecosystem.config.js

# Monitor
pm2 monit

# View logs
pm2 logs trading-multi-agent

# Restart
pm2 restart trading-multi-agent

# Stop
pm2 stop trading-multi-agent

# Delete
pm2 delete trading-multi-agent

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 4.2 Docker Deployment (Optional)

**File: `Dockerfile`**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose webhook port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "shared/discord-gateway-main.js"]
```

**File: `docker-compose.yml`**

```yaml
version: '3.8'

services:
  trading-bot:
    build: .
    container_name: trading-multi-agent
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    ports:
      - "3000:3000"
    networks:
      - trading-network
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    container_name: trading-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - trading-network

networks:
  trading-network:
    driver: bridge

volumes:
  redis-data:
```

**Docker commands:**
```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f trading-bot

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build
```

---

## 5. MONITORING & ALERTING

### 5.1 Health Check Endpoint

**File: `shared/health-check.js`**

```javascript
const express = require('express');
const { getBinanceService } = require('./binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('health-check');
const app = express();

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
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  };

  res.status(health.status === 'ok' ? 200 : 503).json(health);
});

app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
  };
  res.json(metrics);
});

function startHealthServer(port = 3000) {
  app.listen(port, () => {
    logger.info(`Health check server running on port ${port}`);
  });
}

module.exports = { startHealthServer };
```

### 5.2 System Monitoring Script

**File: `scripts/monitor.sh`**

```bash
#!/bin/bash

echo "═══════════════════════════════════════"
echo "  Trading Multi-Agent System Monitor"
echo "═══════════════════════════════════════"
echo ""

# Check if process is running
if pm2 list | grep -q "trading-multi-agent"; then
  echo "✅ Application: RUNNING"
else
  echo "❌ Application: STOPPED"
fi

# Check health endpoint
if curl -s http://localhost:3000/health | grep -q "ok"; then
  echo "✅ Health Check: PASSED"
else
  echo "❌ Health Check: FAILED"
fi

# Check Binance connectivity
if node -e "require('dotenv').config(); const {getBinanceService} = require('./shared/binance-service'); getBinanceService().fetchTicker('BTC/USDT').then(() => console.log('✅ Binance API: CONNECTED')).catch(() => console.log('❌ Binance API: ERROR'))"; then
  :
fi

# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo "✅ Disk Space: ${DISK_USAGE}% used"
else
  echo "⚠️  Disk Space: ${DISK_USAGE}% used (WARNING)"
fi

# Check log file size
LOG_SIZE=$(du -sh logs/ | awk '{print $1}')
echo "📊 Log Size: $LOG_SIZE"

# Recent errors
ERROR_COUNT=$(grep -c "ERROR" logs/*.log 2>/dev/null || echo "0")
echo "⚠️  Recent Errors: $ERROR_COUNT"

echo ""
echo "═══════════════════════════════════════"
```

**Make executable:**
```bash
chmod +x scripts/monitor.sh
```

---

## 6. BACKUP & RECOVERY

### 6.1 Backup Script

**File: `scripts/backup.sh`**

```bash
#!/bin/bash

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" \
  --exclude='node_modules' \
  --exclude='logs' \
  --exclude='backups' \
  --exclude='.git' \
  .

echo "✅ Backup created: $BACKUP_FILE"

# Keep only last 7 backups
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +8 | xargs -r rm

echo "✅ Old backups cleaned"
```

### 6.2 Automated Backup with Cron

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/trading-multi-agent && ./scripts/backup.sh >> logs/backup.log 2>&1
```

---

## 7. PRODUCTION CHECKLIST

### Before Going Live:

- [ ] **Security**
  - [ ] All API keys encrypted
  - [ ] `.env` not in git
  - [ ] Firewall configured
  - [ ] Rate limiting enabled

- [ ] **Testing**
  - [ ] All unit tests pass
  - [ ] Integration tests pass
  - [ ] E2E tests pass
  - [ ] Testnet orders executed successfully

- [ ] **Configuration**
  - [ ] `BINANCE_TESTNET_ENABLED=false`
  - [ ] Production API keys configured
  - [ ] Risk limits set (`MAX_POSITION_SIZE`, `MAX_DAILY_LOSS`)
  - [ ] Discord channels configured

- [ ] **Monitoring**
  - [ ] Health check endpoint working
  - [ ] PM2 monitoring active
  - [ ] Log rotation configured
  - [ ] Backup automation enabled

- [ ] **Documentation**
  - [ ] README updated
  - [ ] Deployment guide reviewed
  - [ ] Emergency procedures documented

---

## 8. EMERGENCY PROCEDURES

### 8.1 Emergency Stop

```bash
# Stop all trading immediately
pm2 stop trading-multi-agent

# Cancel all open orders
node scripts/emergency-cancel-all.js
```

**File: `scripts/emergency-cancel-all.js`**

```javascript
require('dotenv').config();
const { getBinanceService } = require('../shared/binance-service');
const { createLogger } = require('../utils/logger');

const logger = createLogger('emergency-stop');

async function cancelAllOrders() {
  logger.warn('🚨 EMERGENCY: Cancelling all open orders');

  const binance = getBinanceService();
  const openOrders = await binance.fetchOpenOrders();

  logger.info(`Found ${openOrders.length} open orders`);

  for (const order of openOrders) {
    try {
      await binance.cancelOrder(order.orderId, order.symbol);
      logger.info(`✓ Cancelled: ${order.symbol} ${order.orderId}`);
    } catch (error) {
      logger.error(`✗ Failed to cancel: ${order.orderId}`, { error });
    }
  }

  logger.info('✅ Emergency stop completed');
}

cancelAllOrders().catch(console.error);
```

### 8.2 Rollback Procedure

```bash
# Stop current version
pm2 stop trading-multi-agent

# Restore from backup
tar -xzf backups/backup_YYYYMMDD_HHMMSS.tar.gz -C ./rollback/

# Start from backup
cd rollback && pm2 start ecosystem.config.js
```

---

## 9. PERFORMANCE OPTIMIZATION

### 9.1 Redis Caching (Optional)

**File: `shared/redis-cache.js`**

```javascript
const redis = require('redis');
const { createLogger } = require('../utils/logger');

const logger = createLogger('redis-cache');

let client = null;

async function getRedisClient() {
  if (!client) {
    client = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
    });

    client.on('error', (err) => logger.error('Redis error', { err }));
    await client.connect();
    logger.info('✓ Redis connected');
  }
  return client;
}

async function cacheGet(key) {
  const client = await getRedisClient();
  const value = await client.get(key);
  return value ? JSON.parse(value) : null;
}

async function cacheSet(key, value, ttl = 60) {
  const client = await getRedisClient();
  await client.setEx(key, ttl, JSON.stringify(value));
}

module.exports = { cacheGet, cacheSet };
```

---

## 10. FINAL DEPLOYMENT COMMANDS

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm ci --only=production

# 3. Run tests
npm test

# 4. Switch to production mode
# Edit .env: BINANCE_TESTNET_ENABLED=false

# 5. Start with PM2
pm2 start ecosystem.config.js

# 6. Save PM2 config
pm2 save

# 7. Monitor
pm2 monit

# 8. Check health
curl http://localhost:3000/health
```

---

## SUPPORT & MAINTENANCE

### Daily Tasks:
- Check PM2 status: `pm2 status`
- Review logs: `pm2 logs --lines 100`
- Monitor health: `./scripts/monitor.sh`

### Weekly Tasks:
- Review error logs
- Check disk space
- Verify backups
- Update dependencies: `npm outdated`

### Monthly Tasks:
- Security audit
- Performance review
- Cost analysis
- Documentation update

---

**🎉 DEPLOYMENT COMPLETE!**

Your Multi-Agent Trading System is now production-ready.
