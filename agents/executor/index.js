const { OpenClawAgent } = require("../../shared/openclaw-agent");
const { SYSTEM_PROMPTS } = require("../../config/system-prompts");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("executor");

let executorAgent = null;

function initializeExecutorAgent() {
  executorAgent = new OpenClawAgent("executor", {
    name: "Executor",
    role: "Order Execution",
  });

  executorAgent.registerTool({
    name: "validate_order",
    description: "Validate order parameters before execution",
    input_schema: {
      type: "object",
      properties: {
        pair: { type: "string" },
        side: { type: "string", enum: ["BUY", "SELL"] },
        quantity: { type: "number" },
        price: { type: "number" },
      },
      required: ["pair", "side", "quantity", "price"],
    },
  });

  executorAgent.registerTool({
    name: "execute_binance_order",
    description: "Execute order on Binance (REAL TRADING - USE WITH CAUTION)",
    input_schema: {
      type: "object",
      properties: {
        pair: { type: "string" },
        side: { type: "string", enum: ["BUY", "SELL"] },
        order_type: { type: "string", enum: ["MARKET", "LIMIT"] },
        quantity: { type: "number" },
        price: { type: "number", description: "Required for LIMIT orders" },
      },
      required: ["pair", "side", "order_type", "quantity"],
    },
  });

  executorAgent.setToolHandlers({
    validate_order: async (input) => {
      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const ticker = await binance.fetchTicker(input.pair);

        // Validate price is within reasonable range (5% deviation)
        const priceDeviation = Math.abs(input.price - ticker.last) / ticker.last;
        if (priceDeviation > 0.05) {
          return {
            valid: false,
            message: `Price ${input.price} deviates ${(priceDeviation * 100).toFixed(2)}% from market (${ticker.last})`,
          };
        }

        // Get market info for min/max validation
        const marketInfo = await binance.getMarketInfo(input.pair);

        // Validate quantity
        if (input.quantity < marketInfo.limits.amount.min) {
          return {
            valid: false,
            message: `Quantity ${input.quantity} below minimum ${marketInfo.limits.amount.min}`,
          };
        }

        if (input.quantity > marketInfo.limits.amount.max) {
          return {
            valid: false,
            message: `Quantity ${input.quantity} above maximum ${marketInfo.limits.amount.max}`,
          };
        }

        return {
          valid: true,
          pair: input.pair,
          quantity: input.quantity,
          estimated_value: (input.quantity * input.price).toFixed(2),
          message: "Order validation OK",
          market_price: ticker.last,
        };
      } catch (error) {
        logger.error("Order validation failed", { error });
        return {
          valid: false,
          message: `Validation error: ${error.message}`,
        };
      }
    },

    execute_binance_order: async (input) => {
      logger.warn(
        `⚠️ ORDER EXECUTION REQUEST: ${input.pair} ${input.side} ${input.quantity}`,
      );

      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        let order;

        if (input.order_type === "MARKET") {
          order = await binance.createMarketOrder(
            input.pair,
            input.side.toLowerCase(),
            input.quantity
          );
        } else if (input.order_type === "LIMIT") {
          if (!input.price) {
            throw new Error("Price required for LIMIT orders");
          }
          order = await binance.createLimitOrder(
            input.pair,
            input.side.toLowerCase(),
            input.quantity,
            input.price
          );
        } else {
          throw new Error(`Unsupported order type: ${input.order_type}`);
        }

        logger.info("Order executed successfully", { orderId: order.orderId });

        return order;
      } catch (error) {
        logger.error("Order execution failed", { error });
        throw error;
      }
    },
  });

  logger.info("✓ Executor Agent initialized (TESTNET MODE)");
  return executorAgent;
}

async function executorHandler(context) {
  const { message, agentId, client, logger: contextLogger } = context;

  contextLogger.info(`Processing command from @${message.author.tag}`);

  try {
    if (!executorAgent) {
      initializeExecutorAgent();
    }

    const content = message.content.replace(/<@!?\d+>\s*/g, "").trim();
    const [command, ...args] = content.split(/\s+/);

    switch (command.toLowerCase()) {
      case "execute":
      case "exec":
        return await handleExecuteOrder(args, message, contextLogger);

      case "ping":
        return "🟢 Executor is alive! ⚠️ Has Binance API access (TESTNET)";

      case "help":
        return getExecutorHelp();

      default:
        return `❓ Unknown command: ${command}`;
    }
  } catch (error) {
    contextLogger.error("Error in executor handler", { error });
    throw error;
  }
}

async function handleExecuteOrder(args, message, contextLogger) {
  // Parse strategy JSON dari args atau dari history
  contextLogger.info(
    `Order execution request - waiting for phase 4 implementation`,
  );

  return `
⚡ **Order Execution (TESTNET MODE)**

Status: Awaiting Phase 4 Binance API integration

To execute in production:
1. @Strategist creates strategy
2. @Executor validates and executes via Binance API
3. @Monitor tracks position

Current mode: TESTNET/PLACEHOLDER ✅
Real execution: Phase 4 🚀
  `;
}

function getExecutorHelp() {
  return `
⚡ **Executor Commands:**
\`\`\`
@Executor execute <STRATEGY_JSON>       → Execute order from JSON
@Executor ping                          → Check if executor is online
@Executor help                          → Show this help message
\`\`\`

⚠️  **WARNING: Executor has Binance API access!**
Only execute orders from trusted sources.
  `;
}

module.exports = { executorHandler, initializeExecutorAgent };
