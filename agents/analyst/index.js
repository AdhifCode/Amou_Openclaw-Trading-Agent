const { OpenClawAgent } = require("../../shared/openclaw-agent");
const { SYSTEM_PROMPTS } = require("../../config/system-prompts");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("analyst");

let analyzeAgent = null;

/**
 * Initialize Analyst Agent
 */
function initializeAnalystAgent() {
  analyzeAgent = new OpenClawAgent("analyst", {
    name: "Analyst",
    role: "Technical & Fundamental Analysis",
  });

  // Register tools
  analyzeAgent.registerTool({
    name: "fetch_market_data",
    description:
      "Fetch real-time market data for a trading pair (price, volume, etc)",
    input_schema: {
      type: "object",
      properties: {
        pair: {
          type: "string",
          description: "Trading pair (e.g., BTC/USDT, ETH/USDT)",
        },
        timeframe: {
          type: "string",
          enum: ["1m", "5m", "15m", "1h", "4h", "1d"],
          description: "Candle timeframe",
        },
      },
      required: ["pair", "timeframe"],
    },
  });

  analyzeAgent.registerTool({
    name: "analyze_technicals",
    description: "Analyze technical indicators (RSI, MACD, MA) for a pair",
    input_schema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair" },
        timeframe: { type: "string", description: "Timeframe" },
        indicators: {
          type: "array",
          items: { type: "string", enum: ["RSI", "MACD", "BB", "SMA", "EMA"] },
          description: "Indicators to calculate",
        },
      },
      required: ["pair", "timeframe", "indicators"],
    },
  });

  // Set tool handlers with real Binance integration
  analyzeAgent.setToolHandlers({
    fetch_market_data: async (input) => {
      logger.info(
        `Fetching market data for ${input.pair} (${input.timeframe})`,
      );

      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const ticker = await binance.fetchTicker(input.pair);

        return {
          pair: input.pair,
          timeframe: input.timeframe,
          current_price: ticker.last,
          high_24h: ticker.high,
          low_24h: ticker.low,
          volume_24h: ticker.volume,
          change_24h: ticker.change,
          bid: ticker.bid,
          ask: ticker.ask,
          timestamp: ticker.timestamp,
        };
      } catch (error) {
        logger.error("Failed to fetch market data", { error });
        throw error;
      }
    },

    analyze_technicals: async (input) => {
      logger.info(`Analyzing ${input.indicators.join(",")} for ${input.pair}`);

      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const ohlcv = await binance.fetchOHLCV(input.pair, input.timeframe, 100);
        const closes = ohlcv.map(c => c.close);
        const highs = ohlcv.map(c => c.high);
        const lows = ohlcv.map(c => c.low);

        const result = {
          pair: input.pair,
          timeframe: input.timeframe,
        };

        if (input.indicators.includes("RSI")) {
          result.RSI = binance.calculateRSI(closes, 14);
        }

        if (input.indicators.includes("MACD")) {
          const macd = binance.calculateMACD(closes);
          result.MACD = macd;
        }

        if (input.indicators.includes("BB")) {
          const bb = binance.calculateBollingerBands(closes, 20, 2);
          result.BB = bb;
        }

        if (input.indicators.includes("SMA")) {
          result.SMA_20 = binance.calculateSMA(closes, 20);
          result.SMA_50 = binance.calculateSMA(closes, 50);
        }

        if (input.indicators.includes("EMA")) {
          result.EMA_12 = binance.calculateEMA(closes, 12);
          result.EMA_26 = binance.calculateEMA(closes, 26);
        }

        return result;
      } catch (error) {
        logger.error("Failed to analyze technicals", { error });
        throw error;
      }
    },
  });

  logger.info("✓ Analyst Agent initialized");
  return analyzeAgent;
}

/**
 * Discord Handler untuk @Analyst
 */
async function analyzerHandler(context) {
  const { message, agentId, client, logger: contextLogger } = context;

  contextLogger.info(`Processing command from @${message.author.tag}`);

  try {
    // Initialize agent jika belum
    if (!analyzeAgent) {
      initializeAnalystAgent();
    }

    const content = message.content.replace(/<@!?\d+>\s*/g, "").trim();
    const [command, ...args] = content.split(/\s+/);

    switch (command.toLowerCase()) {
      case "analyze":
      case "analyze-market":
        return await handleAnalyzeMarket(args, contextLogger);

      case "ping":
        return "🟢 Analyst is alive!";

      case "help":
        return getAnalystHelp();

      default:
        return `❓ Unknown command: ${command}`;
    }
  } catch (error) {
    contextLogger.error("Error in analyzer handler", { error });
    throw error;
  }
}

/**
 * Handle analyze-market command dengan OpenClaw
 */
async function handleAnalyzeMarket(args, contextLogger) {
  if (args.length === 0) {
    return "❌ Usage: `@Analyst analyze BTC/USDT [4h]`";
  }

  const pair = args[0].toUpperCase();
  const timeframe = args[1] || "4h";

  contextLogger.info(`Analyzing ${pair} on ${timeframe} timeframe`);

  try {
    if (!analyzeAgent) {
      initializeAnalystAgent();
    }

    // Execute agent dengan Claude
    const userPrompt = `
Analyze the cryptocurrency market for ${pair} on ${timeframe} timeframe.

Please:
1. Fetch current market data
2. Analyze technical indicators (RSI, MACD)
3. Identify trend and key levels
4. Provide trading sentiment (bullish/bearish/neutral)
5. Return analysis in JSON format

Focus on actionable insights for traders.
    `.trim();

    const analysis = await analyzeAgent.execute(
      userPrompt,
      SYSTEM_PROMPTS.analyst,
    );

    // Parse response sebagai JSON
    let parsedAnalysis = null;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedAnalysis = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      contextLogger.warn("Could not parse analysis as JSON, returning raw");
    }

    // Format response
    if (parsedAnalysis) {
      return `
📊 **Market Analysis: ${pair}**
⏱️ Timeframe: ${timeframe}

**Trend**: ${parsedAnalysis.trend || "N/A"}
**Sentiment**: ${parsedAnalysis.sentiment || "N/A"}
**Confidence**: ${(parsedAnalysis.confidence * 100 || 0).toFixed(0)}%

**Technical Indicators:**
- RSI: ${parsedAnalysis.rsi || "N/A"} ${getRSIStatus(parsedAnalysis.rsi)}
- MACD: ${parsedAnalysis.macd_status || "N/A"}
- Volume: ${parsedAnalysis.volume_status || "N/A"}

**Key Levels:**
- Support: $${parsedAnalysis.support_level || "N/A"}
- Resistance: $${parsedAnalysis.resistance_level || "N/A"}

**Summary:**
${parsedAnalysis.summary || "N/A"}
      `.trim();
    } else {
      return `📊 **Analysis for ${pair}:**\n\n${analysis}`;
    }
  } catch (error) {
    contextLogger.error("Error analyzing market", { error });
    return `❌ Analysis failed: ${error.message}`;
  }
}

function getRSIStatus(rsi) {
  if (!rsi) return "";
  if (rsi > 70) return "(Overbought 🔴)";
  if (rsi < 30) return "(Oversold 🟢)";
  return "(Neutral 🟡)";
}

function getAnalystHelp() {
  return `
📊 **Analyst Commands:**
\`\`\`
@Analyst analyze <PAIR> [TIMEFRAME]    → Analyze market for pair
@Analyst ping                          → Check if analyst is online
@Analyst help                          → Show this help message
\`\`\`

**Examples:**
- \`@Analyst analyze BTC/USDT\`
- \`@Analyst analyze ETH/USDT 1h\`
- \`@Analyst analyze BNB/USDT 4h\`

**Default timeframe: 4h**
  `;
}

module.exports = {
  analyzerHandler,
  initializeAnalystAgent,
  getAgent: () => analyzeAgent,
};
