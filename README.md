# Trading Multi-Agent System

Sistem trading otomatis berbasis AI dengan 5 agent Discord yang terintegrasi menggunakan OpenClaw framework dan Binance API.

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Server                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ @Analyst │  │@Strategist│ │@Executor │  │ @Monitor │   │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │             │          │
└───────┼──────────────┼──────────────┼─────────────┼──────────┘
        │              │              │             │
        └──────────────┴──────────────┴─────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │   Discord Gateway (Node.js)     │
        │   - Message Routing             │
        │   - Agent Handler Registry      │
        └──────────────┬──────────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │   OpenClaw Agent Framework      │
        │   - LLM Provider (Custom/Claude)│
        │   - Tool Execution              │
        │   - Conversation Management     │
        └──────────────┬──────────────────┘
                       │
        ┌──────────────▼──────────────────┐
        │   External Services             │
        │   - Binance API (CCXT)          │
        │   - Redis (State Management)    │
        │   - Custom LLM Endpoint         │
        └─────────────────────────────────┘
```

## 🤖 Agent Roles

### 1. @Analyst (Biru)
**Role**: Technical & Fundamental Analysis
- Mengambil data market dari Binance
- Analisis indikator teknikal (RSI, MACD, BB, MA)
- Identifikasi trend dan support/resistance
- Output: JSON analysis dengan sentiment dan confidence

**Commands**:
```
@Analyst analyze BTC/USDT [timeframe]
@Analyst ping
@Analyst help
```

### 2. @Strategist (Hijau)
**Role**: Strategy Formulation
- Menerima analysis dari @Analyst
- Menghitung entry/exit points
- Risk management (position sizing, R:R ratio)
- Output: JSON strategy siap eksekusi

**Commands**:
```
@Strategist strategy BTC/USDT
@Strategist ping
@Strategist help
```

### 3. @Executor (Merah) ⚠️
**Role**: Order Execution
- **MEMILIKI AKSES BINANCE API**
- Validasi strategy parameters
- Eksekusi order (Market/Limit)
- Konfirmasi order status

**Commands**:
```
@Executor execute <STRATEGY_JSON>
@Executor ping
@Executor help
```

### 4. @Monitor (Orange)
**Role**: Portfolio Monitoring
- Track open positions
- Monitor PnL (realized/unrealized)
- Alert pada kondisi kritis
- Portfolio risk metrics

**Commands**:
```
@Monitor status
@Monitor ping
```

### 5. @Developer (Purple)
**Role**: System Maintenance
- System health check
- Service connectivity monitoring
- Debugging dan troubleshooting
- Log analysis

**Commands**:
```
@Developer status
@Developer ping
```

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
File `.env` sudah dikonfigurasi dengan:
- ✅ 5 Discord Bot Tokens
- ✅ Binance API Keys (Testnet)
- ✅ Custom LLM Provider (9router)
- ✅ Redis Configuration

### 3. Start System
```bash
npm start
```

Atau untuk development dengan auto-reload:
```bash
npm run dev
```

### 4. Test di Discord
1. Buka Discord server (Guild ID: `1510568457597616158`)
2. Mention salah satu bot:
   ```
   @Analyst ping
   @Strategist ping
   @Executor ping
   @Monitor ping
   @Developer ping
   ```

## 📁 Struktur Folder

```
trading-multi-agent/
├── agents/                    # Agent implementations
│   ├── analyst/
│   │   └── index.js          # Analyst agent logic
│   ├── strategist/
│   │   └── index.js          # Strategist agent logic
│   ├── executor/
│   │   └── index.js          # Executor agent logic
│   ├── monitor/
│   │   └── index.js          # Monitor agent logic
│   └── developer/
│       └── index.js          # Developer agent logic
│
├── shared/                    # Shared modules
│   ├── discord-gateway.js    # Discord bot routing
│   ├── discord-gateway-main.js  # Main entry point
│   ├── openclaw-agent.js     # OpenClaw base class
│   ├── discord-logger.js     # Discord logging utility
│   └── llm/                  # LLM provider abstraction
│       ├── llm-factory.js    # Provider factory
│       ├── llm-interface.js  # Abstract interface
│       └── providers/
│           ├── anthropic-provider.js
│           ├── openai-provider.js
│           └── custom-provider.js
│
├── config/                    # Configuration files
│   ├── discord.config.js     # Discord bot configs
│   └── system-prompts.js     # Agent system prompts
│
├── utils/                     # Utility functions
│   ├── logger.js             # Winston logger
│   ├── env-validator.js      # Environment validation
│   └── encryption.js         # API key encryption
│
├── logs/                      # Log files (auto-generated)
├── .env                       # Environment variables
└── package.json              # Dependencies
```

## 🔧 Configuration

### LLM Provider
Sistem mendukung 3 LLM providers:

1. **Anthropic Claude** (Default jika `LLM_PROVIDER=anthropic`)
   ```env
   ANTHROPIC_API_KEY=sk-ant-xxxxx
   ```

2. **OpenAI GPT-4** (Set `LLM_PROVIDER=openai`)
   ```env
   OPENAI_API_KEY=sk-proj-xxxxx
   ```

3. **Custom/Self-hosted** (Set `LLM_PROVIDER=custom`) ✅ Currently Active
   ```env
   CUSTOM_LLM_BASE_URL=http://localhost:20128/v1
   CUSTOM_LLM_MODEL=kr/claude-sonnet-4.5
   CUSTOM_LLM_API_KEY=sk-xxxxx
   ```

### Discord Channels
```env
DISCORD_LOG_CHANNEL_ID=1510568458323103806      # System logs
DISCORD_ALERT_CHANNEL_ID=1510701959923896391    # Critical alerts
DISCORD_TRADE_LOG_CHANNEL_ID=1510702094095745152 # Trade execution logs
```

## 🧪 Testing

### Test LLM Providers
```bash
node test-llm-providers.js
```

### Test Individual Agent
```bash
npm run start:analyst
npm run start:strategist
npm run start:executor
npm run start:monitor
npm run start:developer
```

## 📊 Workflow Example

### Complete Trading Flow:
```
1. User: @Analyst analyze BTC/USDT 4h
   → Analyst fetches data, calculates indicators
   → Returns: JSON analysis with sentiment

2. User: @Strategist strategy BTC/USDT
   → Strategist receives analysis context
   → Calculates entry/TP/SL with position sizing
   → Returns: JSON strategy

3. User: @Executor execute <strategy_json>
   → Executor validates parameters
   → Executes order on Binance
   → Returns: Order confirmation

4. @Monitor (auto-triggered)
   → Tracks position PnL
   → Sends alerts if TP/SL proximity
```

## ⚠️ Security Notes

1. **Executor Agent** memiliki akses penuh ke Binance API
2. Gunakan **Testnet** untuk development (`BINANCE_TESTNET_ENABLED=true`)
3. Jangan commit file `.env` ke git
4. API keys di-encrypt menggunakan `utils/encryption.js`
5. Rate limiting sudah diimplementasi untuk Binance API

## 🐛 Troubleshooting

### Bot tidak merespon mention
- Pastikan **Message Content Intent** enabled di Discord Developer Portal
- Check logs: `tail -f logs/*.log`

### LLM call failed
- Test provider: `node test-llm-providers.js`
- Check API key validity
- Verify custom LLM endpoint: `curl http://localhost:20128/v1/models`

### Binance API error
- Verify API key permissions (Spot Trading enabled)
- Check testnet status: `BINANCE_TESTNET_ENABLED=true`
- Review rate limits

## 📝 Development Roadmap

### ✅ Phase 1-3: Completed
- [x] Discord Gateway dengan 5 bots
- [x] OpenClaw integration
- [x] Multi-LLM provider support
- [x] Basic agent handlers

### 🚧 Phase 4: Binance Integration (Next)
- [ ] Real CCXT implementation untuk market data
- [ ] Live order execution
- [ ] Position tracking
- [ ] PnL calculation

### 📅 Phase 5: Production Ready
- [ ] Redis state management
- [ ] Webhook untuk price alerts
- [ ] Web dashboard monitoring
- [ ] Backtesting framework

## 📄 License

MIT

## 👨‍💻 Author

Trading Multi-Agent System
Built with OpenClaw, Discord.js, and Claude AI
