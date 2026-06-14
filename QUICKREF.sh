#!/bin/bash

# Quick Command Reference for Trading Multi-Agent System

cat << 'EOF'
╔════════════════════════════════════════════════════════════════╗
║        TRADING MULTI-AGENT SYSTEM - QUICK REFERENCE           ║
╚════════════════════════════════════════════════════════════════╝

📋 SYSTEM MANAGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ./START.sh              Start all 5 Discord agents
  ./STOP.sh               Stop all agents gracefully
  ./STATUS.sh             Check system health
  npm start               Start system (alternative)
  npm run dev             Start with auto-reload

📊 MONITORING & LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  tail -f logs/*.log      Watch all logs in real-time
  tail -f logs/gateway.log    Watch gateway logs only
  tail -f logs/analyst.log    Watch analyst logs only
  ls -lh logs/            List all log files

🧪 TESTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  node test-llm-providers.js  Test LLM provider connection
  npm test                Run test suite
  npm run lint            Check code quality

🤖 DISCORD COMMANDS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  @Analyst Commands:
    @Analyst ping
    @Analyst analyze BTC/USDT [timeframe]
    @Analyst help

  @Strategist Commands:
    @Strategist ping
    @Strategist strategy BTC/USDT
    @Strategist help

  @Executor Commands:
    @Executor ping
    @Executor execute <strategy_json>
    @Executor help

  @Monitor Commands:
    @Monitor ping
    @Monitor status

  @Developer Commands:
    @Developer ping
    @Developer status

🔧 TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Bot tidak merespon:
    1. Check process: ps aux | grep discord-gateway
    2. Check logs: tail -f logs/gateway.log
    3. Restart: ./STOP.sh && ./START.sh

  LLM error:
    1. Test provider: node test-llm-providers.js
    2. Check endpoint: curl http://localhost:20128/v1/models
    3. Verify .env: cat .env | grep LLM

  Permission denied:
    chmod +x START.sh STOP.sh STATUS.sh

📁 IMPORTANT FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  .env                    Environment variables (DO NOT COMMIT!)
  README.md               Complete documentation
  PHASE4_GUIDE.md         Binance integration guide
  IMPLEMENTATION_SUMMARY.md   System summary

🔐 SECURITY REMINDERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠️  @Executor has Binance API access
  ⚠️  Currently using TESTNET (safe for testing)
  ⚠️  Never commit .env to git
  ⚠️  Always test on TESTNET before production

📞 SUPPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Documentation: README.md
  Issues: Check logs/ directory
  Phase 4: See PHASE4_GUIDE.md

╚════════════════════════════════════════════════════════════════╝
EOF
