const { OpenClawAgent } = require("../../shared/openclaw-agent");
const { SYSTEM_PROMPTS } = require("../../config/system-prompts");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("strategist");

let strategyAgent = null;

function initializeStrategistAgent() {
  strategyAgent = new OpenClawAgent("strategist", {
    name: "Strategist",
    role: "Strategy Formulation",
  });

  // Register tools
  strategyAgent.registerTool({
    name: "calculate_position_size",
    description: "Calculate position size based on risk parameters",
    input_schema: {
      type: "object",
      properties: {
        account_balance: {
          type: "number",
          description: "Total account balance (USD)",
        },
        risk_percent: {
          type: "number",
          description: "Risk percentage per trade (1-2)",
        },
        entry_price: { type: "number", description: "Entry price" },
        stop_loss: { type: "number", description: "Stop loss price" },
      },
      required: ["account_balance", "risk_percent", "entry_price", "stop_loss"],
    },
  });

  strategyAgent.registerTool({
    name: "validate_strategy",
    description: "Validate strategy parameters (risk/reward, levels, etc)",
    input_schema: {
      type: "object",
      properties: {
        entry: { type: "number" },
        take_profit: { type: "number" },
        stop_loss: { type: "number" },
        side: { type: "string", enum: ["LONG", "SHORT"] },
      },
      required: ["entry", "take_profit", "stop_loss", "side"],
    },
  });

  strategyAgent.registerTool({
    name: "get_current_price",
    description: "Get current market price for a trading pair",
    input_schema: {
      type: "object",
      properties: {
        pair: { type: "string", description: "Trading pair (e.g., BTC/USDT)" },
      },
      required: ["pair"],
    },
  });

  // Tool handlers with real calculations
  strategyAgent.setToolHandlers({
    calculate_position_size: async (input) => {
      const riskAmount = input.account_balance * (input.risk_percent / 100);
      const priceDiff = Math.abs(input.entry_price - input.stop_loss);
      const positionSize = riskAmount / priceDiff;

      return {
        risk_amount_usd: riskAmount.toFixed(2),
        position_size_crypto: positionSize.toFixed(6),
        position_size_usd: (positionSize * input.entry_price).toFixed(2),
      };
    },

    validate_strategy: async (input) => {
      const isLong = input.side === "LONG";
      const valid = isLong
        ? input.entry < input.take_profit && input.stop_loss < input.entry
        : input.entry > input.take_profit && input.stop_loss > input.entry;

      const rr =
        Math.abs(input.take_profit - input.entry) /
        Math.abs(input.entry - input.stop_loss);

      return {
        valid,
        risk_reward_ratio: rr.toFixed(2),
        issues: valid ? [] : ["Invalid level configuration for " + input.side],
      };
    },

    get_current_price: async (input) => {
      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const ticker = await binance.fetchTicker(input.pair);
        return {
          pair: input.pair,
          price: ticker.last,
          bid: ticker.bid,
          ask: ticker.ask,
        };
      } catch (error) {
        logger.error("Failed to get current price", { error });
        throw error;
      }
    },
  });

  logger.info("✓ Strategist Agent initialized");
  return strategyAgent;
}

/**
 * Discord Handler untuk @Strategist
 */
async function strategistHandler(context) {
  const { message, agentId, client, logger: contextLogger } = context;

  contextLogger.info(`Processing command from @${message.author.tag}`);

  try {
    if (!strategyAgent) {
      initializeStrategistAgent();
    }

    const content = message.content.replace(/<@!?\d+>\s*/g, "").trim();
    const [command, ...args] = content.split(/\s+/);

    switch (command.toLowerCase()) {
      case "strategy":
      case "make-strategy":
        return await handleMakeStrategy(args, message, contextLogger);

      case "ping":
        return "🟢 Strategist is alive!";

      case "help":
        return getStrategistHelp();

      default:
        return `❓ Unknown command: ${command}`;
    }
  } catch (error) {
    contextLogger.error("Error in strategist handler", { error });
    throw error;
  }
}

/**
 * Handle strategy creation dengan OpenClaw
 */
async function handleMakeStrategy(args, message, contextLogger) {
  if (args.length === 0) {
    return "❌ Usage: `@Strategist strategy BTC/USDT --analysis <data>`";
  }

  const pair = args[0].toUpperCase();

  contextLogger.info(`Creating strategy for ${pair}`);

  try {
    if (!strategyAgent) {
      initializeStrategistAgent();
    }

    const userPrompt = `
Create a trading strategy for ${pair}.

Assume current price is $43,500 (based on recent technical analysis showing bullish signals).
Account balance: $10,000

Please:
1. Define entry point and logic
2. Calculate take profit level (min 2:1 risk/reward)
3. Set stop loss with proper market structure
4. Calculate position size (risk 1% of account)
5. Return strategy in JSON format
    `.trim();

    const strategy = await strategyAgent.execute(
      userPrompt,
      SYSTEM_PROMPTS.strategist,
    );

    // Parse as JSON
    let parsedStrategy = null;
    try {
      const jsonMatch = strategy.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedStrategy = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      contextLogger.warn("Could not parse strategy as JSON");
    }

    // Format response
    if (parsedStrategy) {
      return `
📋 **Strategy: ${pair}**

**Entry**: $${parsedStrategy.entry_price}
**Take Profit**: $${parsedStrategy.take_profit}
**Stop Loss**: $${parsedStrategy.stop_loss}
**Side**: ${parsedStrategy.side}

**Position Details:**
- Size: ${parsedStrategy.position_size_crypto} crypto
- Value: $${parsedStrategy.position_size_usd}
- Risk: $${parsedStrategy.risk_per_trade_usd}

**Risk/Reward**: 1:${parsedStrategy.risk_reward_ratio.split(":")[1] || "2"}
**Confidence**: ${(parsedStrategy.confidence * 100 || 0).toFixed(0)}%

**Entry Logic:** ${parsedStrategy.entry_logic}
**Exit Logic:** ${parsedStrategy.exit_logic}

✅ Ready for execution via @Executor
      `.trim();
    } else {
      return `📋 **Strategy for ${pair}:**\n\n${strategy}`;
    }
  } catch (error) {
    contextLogger.error("Error creating strategy", { error });
    return `❌ Strategy creation failed: ${error.message}`;
  }
}

function getStrategistHelp() {
  return `
📋 **Strategist Commands:**
\`\`\`
@Strategist strategy <PAIR>             → Create trading strategy
@Strategist ping                        → Check if strategist is online
@Strategist help                        → Show this help message
\`\`\`
  `;
}

module.exports = { strategistHandler, initializeStrategistAgent };
