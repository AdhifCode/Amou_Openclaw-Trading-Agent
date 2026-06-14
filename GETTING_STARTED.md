# 🚀 GETTING STARTED - Trading Multi-Agent System

Panduan cepat untuk memulai sistem Trading Multi-Agent dari nol hingga running.

---

## 📋 Prerequisites

Sebelum memulai, pastikan Anda memiliki:

- [x] Node.js v18+ installed
- [x] npm atau yarn
- [x] Git
- [x] Discord account
- [x] Binance account (testnet)
- [x] LLM API key (Anthropic/OpenAI/Custom)

---

## 🎯 Quick Start (5 Menit)

### 1. Clone & Install
```bash
cd /home/adhif/Documents/trading-multi-agent
npm install
```

### 2. Configure Environment
```bash
# File .env sudah ada dan dikonfigurasi
# Verifikasi konfigurasi:
cat .env | grep -E "DISCORD_BOT_TOKEN|BINANCE_API_KEY|LLM_PROVIDER"
```

### 3. Run Tests
```bash
# Quick validation
./scripts/quick-test.sh

# Full test suite
./scripts/test-all.sh
```

### 4. Start System
```bash
# Development mode (recommended untuk testing)
npm run dev

# Production mode dengan PM2
pm2 start ecosystem.config.js
```

### 5. Test di Discord
Buka Discord server dan test setiap bot:
```
@Analyst ping
@Strategist ping
@Executor ping
@Monitor ping
@Developer ping
```

---

## 📖 Detailed Setup Guide

### Step 1: Environment Configuration

File `.env` sudah dikonfigurasi dengan:

```env
# Discord Bots (5 bots)
DISCORD_BOT_TOKEN_ANALYST=...
DISCORD_BOT_TOKEN_STRATEGIST=...
DISCORD_BOT_TOKEN_EXECUTOR=...
DISCORD_BOT_TOKEN_MONITOR=...
DISCORD_BOT_TOKEN_DEVELOPER=...

# Binance API (TESTNET)
BINANCE_TESTNET_ENABLED=true
BINANCE_TESTNET_API_KEY=...
BINANCE_TESTNET_API_SECRET=...

# LLM Provider
LLM_PROVIDER=custom
CUSTOM_LLM_BASE_URL=http://localhost:20128/v1
CUSTOM_LLM_MODEL=kr/claude-sonnet-4.5
CUSTOM_LLM_API_KEY=...

# Risk Management
MAX_POSITION_SIZE=100
MAX_DAILY_LOSS=-15
LEVERAGE=1
```

### Step 2: Verify Configuration

```bash
# Test Binance connection
node test-binance.js

# Test LLM provider
node test-llm-providers.js

# Run complete test suite
./scripts/test-all.sh
```

### Step 3: Start the System

**Option A: Development Mode (Recommended)**
```bash
npm run dev
```
- Auto-reload on file changes
- Detailed logging
- Easy debugging

**Option B: Production Mode with PM2**
```bash
pm2 start ecosystem.config.js
pm2 monit
```
- Auto-restart on crash
- Process monitoring
- Log management

**Option C: Docker**
```bash
docker-compose up -d
docker-compose logs -f
```
- Isolated environment
- Easy deployment
- Includes Redis

---

## 🤖 Using the Agents

### @Analyst - Market Analysis
```
@Analyst analyze BTC/USDT 4h
```
Output: Technical analysis dengan RSI, MACD, trend

### @Strategist - Strategy Formulation
```
@Strategist strategy BTC/USDT
```
Output: JSON strategy dengan entry/exit points

### @Executor - Order Execution
```
@Executor execute {"pair":"BTC/USDT","side":"BUY","quantity":0.001,"order_type":"MARKET"}
```
Output: Order confirmation

### @Monitor - Portfolio Status
```
@Monitor status
```
Output: Current balance, open positions, PnL

### @Developer - System Health
```
@Developer status
```
Output: System health, connectivity status

---

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:3000/health
```

### System Monitor
```bash
./scripts/monitor.sh
```

### PM2 Monitoring
```bash
pm2 monit
pm2 logs trading-multi-agent
```

### View Logs
```bash
tail -f logs/combined.log
tail -f logs/error.log
```

---

## 🛠️ Common Tasks

### Restart System
```bash
pm2 restart trading-multi-agent
```

### Stop System
```bash
pm2 stop trading-multi-agent
```

### Create Backup
```bash
./scripts/backup.sh
```

### Emergency Stop
```bash
pm2 stop trading-multi-agent
node scripts/emergency-cancel-all.js
```

---

## 🐛 Troubleshooting

### Bot tidak merespon di Discord
```bash
# Check if running
pm2 status

# Check logs
pm2 logs --lines 50

# Restart
pm2 restart trading-multi-agent
```

### Binance API error
```bash
# Test connection
node test-binance.js

# Verify testnet mode
grep BINANCE_TESTNET_ENABLED .env

# Check API key permissions
```

### LLM error
```bash
# Test provider
node test-llm-providers.js

# Check API key
grep LLM_PROVIDER .env
```

---

## 📊 Understanding the Workflow

### Complete Trading Flow:

1. **Analysis Phase**
   ```
   User: @Analyst analyze BTC/USDT 4h
   → Analyst fetches data from Binance
   → Calculates RSI, MACD, SMA, EMA
   → Returns JSON analysis
   ```

2. **Strategy Phase**
   ```
   User: @Strategist strategy BTC/USDT
   → Strategist reads Analyst's analysis
   → Calculates entry/exit points
   → Determines position size
   → Returns JSON strategy
   ```

3. **Execution Phase**
   ```
   User: @Executor execute <strategy_json>
   → Executor validates parameters
   → Checks risk limits
   → Executes order on Binance
   → Returns order confirmation
   ```

4. **Monitoring Phase**
   ```
   @Monitor (auto-triggered)
   → Tracks position PnL
   → Monitors for TP/SL proximity
   → Sends alerts if needed
   ```

---

## ⚠️ Important Safety Notes

### ALWAYS Use Testnet First
```env
BINANCE_TESTNET_ENABLED=true  # Keep this enabled!
```

### Risk Limits
- Start with small position sizes ($10-$50)
- Set tight daily loss limits (-$5 to -$15)
- Never use leverage initially (LEVERAGE=1)

### Before Production
- [ ] Test for 1-2 weeks on testnet
- [ ] Verify all agents work correctly
- [ ] Test emergency stop procedures
- [ ] Set up monitoring alerts
- [ ] Document your trading strategy

---

## 📚 Next Steps

### Learn More
- Read `README.md` for detailed overview
- Check `QUICKREF.md` for command reference
- Review `docs/RISK_MANAGEMENT.md` for risk settings

### Customize
- Modify system prompts in `config/system-prompts.js`
- Adjust risk limits in `.env`
- Add custom indicators in `shared/binance-service.js`

### Deploy
- Follow `PHASE5_DEPLOYMENT.md` for production deployment
- Use `./scripts/deploy.sh` for automated deployment

---

## 🎉 You're Ready!

Sistem Anda sekarang siap digunakan. Mulai dengan testing di Discord:

```
@Analyst ping
@Strategist ping
@Executor ping
@Monitor ping
@Developer ping
```

Jika semua bot merespon, sistem Anda berjalan dengan baik! 🚀

---

**Need Help?**
- Check logs: `pm2 logs`
- Run monitor: `./scripts/monitor.sh`
- Review docs: `/docs` folder

**Happy Trading! 📈**
