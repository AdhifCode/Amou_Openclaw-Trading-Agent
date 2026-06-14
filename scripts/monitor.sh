#!/bin/bash

echo "═══════════════════════════════════════"
echo "  Trading Multi-Agent System Monitor"
echo "═══════════════════════════════════════"
echo ""

# Check if process is running
if pm2 list | grep -q "trading-multi-agent"; then
  echo "✅ Application: RUNNING"
  pm2 list | grep "trading-multi-agent"
else
  echo "❌ Application: STOPPED"
fi

echo ""

# Check health endpoint
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  HEALTH_STATUS=$(curl -s http://localhost:3000/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  if [ "$HEALTH_STATUS" = "ok" ]; then
    echo "✅ Health Check: PASSED"
  else
    echo "⚠️  Health Check: DEGRADED"
  fi
else
  echo "❌ Health Check: FAILED (endpoint not responding)"
fi

# Check Binance connectivity
echo -n "🔗 Binance API: "
node -e "
require('dotenv').config();
const {getBinanceService} = require('./shared/binance-service');
getBinanceService().fetchTicker('BTC/USDT')
  .then(() => console.log('CONNECTED ✅'))
  .catch(() => console.log('ERROR ❌'));
" 2>/dev/null

# Check disk space
DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  echo "✅ Disk Space: ${DISK_USAGE}% used"
else
  echo "⚠️  Disk Space: ${DISK_USAGE}% used (WARNING)"
fi

# Check log file size
if [ -d "logs" ]; then
  LOG_SIZE=$(du -sh logs/ 2>/dev/null | awk '{print $1}')
  echo "📊 Log Size: $LOG_SIZE"
else
  echo "📊 Log Size: N/A (no logs directory)"
fi

# Recent errors
if [ -d "logs" ]; then
  ERROR_COUNT=$(grep -c "ERROR" logs/*.log 2>/dev/null || echo "0")
  echo "⚠️  Recent Errors: $ERROR_COUNT"
fi

# Memory usage
MEM_USAGE=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')
echo "💾 Memory Usage: $MEM_USAGE"

# Uptime
UPTIME=$(uptime -p)
echo "⏱️  System Uptime: $UPTIME"

echo ""
echo "═══════════════════════════════════════"
echo "Last updated: $(date '+%Y-%m-%d %H:%M:%S')"
echo "═══════════════════════════════════════"
