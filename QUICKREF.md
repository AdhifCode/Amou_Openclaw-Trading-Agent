# 🎯 QUICK REFERENCE GUIDE

## Essential Commands

### Starting the System
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode with PM2
pm2 start ecosystem.config.js

# Using deployment script
./scripts/deploy.sh
```

### Monitoring
```bash
# System health check
./scripts/monitor.sh

# PM2 monitoring
pm2 monit

# View logs
pm2 logs trading-multi-agent

# Check health endpoint
curl http://localhost:3000/health
```

### Testing
```bash
# Quick validation
./scripts/quick-test.sh

# Test Binance connection
node test-binance.js

# End-to-end tests
node tests/e2e-test.js

# Testnet order execution
node tests/testnet-order.js
```

### Emergency
```bash
# Stop all trading
pm2 stop trading-multi-agent

# Cancel all open orders
node scripts/emergency-cancel-all.js

# View recent errors
grep "ERROR" logs/*.log | tail -20
```

### Maintenance
```bash
# Create backup
./scripts/backup.sh

# Restart application
pm2 restart trading-multi-agent

# Update dependencies
npm update

# Clean logs
rm -rf logs/*.log
```

---

## Discord Commands

### @Analyst
```
@Analyst analyze BTC/USDT 4h
@Analyst ping
@Analyst help
```

### @Strategist
```
@Strategist strategy BTC/USDT
@Strategist ping
@Strategist help
```

### @Executor
```
@Executor execute <STRATEGY_JSON>
@Executor status
@Executor ping
@Executor help
```

### @Monitor
```
@Monitor status
@Monitor portfolio
@Monitor alerts
@Monitor ping
```

### @Developer
```
@Developer status
@Developer health
@Developer logs
@Developer ping
```

---

## Environment Variables

### Critical Settings
```env
# Binance Mode
BINANCE_TESTNET_ENABLED=true    # ALWAYS use testnet first!

# Risk Management
MAX_POSITION_SIZE=100           # Max position in USD
MAX_DAILY_LOSS=-15             # Max daily loss in USD
LEVERAGE=1                      # Leverage multiplier

# LLM Provider
LLM_PROVIDER=custom            # anthropic, openai, or custom
```

---

## File Locations

### Logs
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- PM2 logs: `logs/pm2-*.log`

### Configuration
- Environment: `.env`
- PM2 config: `ecosystem.config.js`
- Discord config: `config/discord.config.js`
- System prompts: `config/system-prompts.js`

### Backups
- Location: `backups/`
- Format: `backup_YYYYMMDD_HHMMSS.tar.gz`
- Retention: Last 7 backups

---

## Troubleshooting

### Bot Not Responding
```bash
# Check if running
pm2 status

# Check logs
pm2 logs --lines 50

# Restart
pm2 restart trading-multi-agent
```

### Binance API Errors
```bash
# Test connection
node test-binance.js

# Check API key in .env
grep BINANCE_API_KEY .env

# Verify testnet mode
grep BINANCE_TESTNET_ENABLED .env
```

### LLM Errors
```bash
# Test LLM provider
node test-llm-providers.js

# Check API key
grep LLM_PROVIDER .env
grep ANTHROPIC_API_KEY .env
```

### High Memory Usage
```bash
# Check memory
pm2 monit

# Restart to clear memory
pm2 restart trading-multi-agent

# Check for memory leaks
node --inspect shared/discord-gateway-main.js
```

---

## Health Check Endpoints

### GET /health
```bash
curl http://localhost:3000/health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2026-06-01T17:51:41.431Z",
  "uptime": 3600,
  "checks": {
    "binance": "ok",
    "memory": {
      "heapUsed": "150.23 MB",
      "heapTotal": "200.45 MB"
    }
  }
}
```

### GET /metrics
```bash
curl http://localhost:3000/metrics
```

### GET /ping
```bash
curl http://localhost:3000/ping
```

---

## Risk Management

### Check Risk Status
```javascript
const { getRiskManager } = require('./shared/risk-manager');
const rm = getRiskManager();
console.log(rm.getRiskStatus());
```

### Calculate Position Size
```javascript
const positionSize = rm.calculatePositionSize(
  1000,  // Account balance
  2,     // Risk 2%
  50000, // Entry price
  49000  // Stop loss
);
```

---

## PM2 Commands

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop trading-multi-agent

# Restart
pm2 restart trading-multi-agent

# Delete
pm2 delete trading-multi-agent

# Logs
pm2 logs trading-multi-agent

# Monitor
pm2 monit

# Save config
pm2 save

# Startup script
pm2 startup
```

---

## Docker Commands

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f trading-bot

# Stop
docker-compose down

# Rebuild
docker-compose up -d --build

# Shell access
docker exec -it trading-multi-agent sh
```

---

## Git Workflow

```bash
# Check status
git status

# Commit changes
git add .
git commit -m "Description"

# Push to remote
git push origin main

# Pull latest
git pull origin main

# Create branch
git checkout -b feature/new-feature
```

---

## Performance Optimization

### Clear Logs
```bash
# Rotate logs
pm2 flush

# Clear old logs
find logs/ -name "*.log" -mtime +7 -delete
```

### Database Cleanup (if using Redis)
```bash
# Connect to Redis
redis-cli

# Clear cache
FLUSHDB

# Check memory
INFO memory
```

---

## Security Checklist

- [ ] `.env` not in git
- [ ] API keys encrypted
- [ ] Testnet mode enabled
- [ ] Rate limiting active
- [ ] Firewall configured
- [ ] Logs don't contain secrets
- [ ] Backup encryption enabled
- [ ] SSH keys configured

---

## Support Resources

- **Documentation**: `/docs` folder
- **Phase Guides**: `PHASE4_GUIDE.md`, `PHASE5_DEPLOYMENT.md`
- **Risk Management**: `docs/RISK_MANAGEMENT.md`
- **Final Summary**: `FINAL_SUMMARY.md`

---

## Quick Links

- Health: http://localhost:3000/health
- Metrics: http://localhost:3000/metrics
- Logs: `./logs/`
- Backups: `./backups/`

---

**Last Updated**: 2026-06-01  
**Version**: 1.0.0
