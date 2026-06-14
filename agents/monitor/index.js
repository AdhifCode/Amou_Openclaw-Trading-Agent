const { OpenClawAgent } = require("../../shared/openclaw-agent");
const { SYSTEM_PROMPTS } = require("../../config/system-prompts");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("monitor");

let monitorAgent = null;

function initializeMonitorAgent() {
  monitorAgent = new OpenClawAgent("monitor", {
    name: "Monitor",
    role: "Portfolio Monitoring",
  });

  monitorAgent.registerTool({
    name: "get_portfolio_status",
    description: "Get current portfolio status and positions",
    input_schema: { type: "object", properties: {} },
  });

  monitorAgent.registerTool({
    name: "check_alert_conditions",
    description: "Check for alert conditions (loss, TP/SL proximity)",
    input_schema: { type: "object", properties: {} },
  });

  monitorAgent.registerTool({
    name: "get_open_orders",
    description: "Get all open orders",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Optional: filter by symbol" },
      },
    },
  });

  monitorAgent.setToolHandlers({
    get_portfolio_status: async () => {
      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const balance = await binance.fetchBalance();
        const openOrders = await binance.fetchOpenOrders();

        // Calculate total value
        const totalUSDT = balance.total.USDT || 0;
        const freeUSDT = balance.free.USDT || 0;
        const usedUSDT = balance.used.USDT || 0;

        return {
          balance: {
            total: totalUSDT,
            free: freeUSDT,
            used: usedUSDT,
          },
          open_orders_count: openOrders.length,
          positions: openOrders.map(o => ({
            symbol: o.symbol,
            side: o.side,
            amount: o.amount,
            price: o.price,
            filled: o.filled,
            status: o.status,
          })),
        };
      } catch (error) {
        logger.error("Failed to get portfolio status", { error });
        throw error;
      }
    },

    check_alert_conditions: async () => {
      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const openOrders = await binance.fetchOpenOrders();
        const alerts = [];

        // Check for orders close to execution
        for (const order of openOrders) {
          try {
            const ticker = await binance.fetchTicker(order.symbol);
            const priceDistance = Math.abs(ticker.last - order.price) / order.price;

            if (priceDistance < 0.02) {
              alerts.push({
                type: "PRICE_PROXIMITY",
                symbol: order.symbol,
                orderId: order.orderId,
                message: `Price ${ticker.last} is within 2% of order price ${order.price}`,
                severity: "medium",
              });
            }
          } catch (err) {
            logger.warn(`Failed to check alert for ${order.symbol}`, { error: err.message });
          }
        }

        return {
          alerts,
          critical: alerts.some(a => a.severity === "critical"),
          alert_count: alerts.length,
        };
      } catch (error) {
        logger.error("Failed to check alert conditions", { error });
        throw error;
      }
    },

    get_open_orders: async (input) => {
      const { getBinanceService } = require("../../shared/binance-service");
      const binance = getBinanceService();

      try {
        const orders = await binance.fetchOpenOrders(input.symbol);

        return {
          count: orders.length,
          orders: orders,
        };
      } catch (error) {
        logger.error("Failed to get open orders", { error });
        throw error;
      }
    },
  });

  logger.info("✓ Monitor Agent initialized");
  return monitorAgent;
}

async function monitorHandler(context) {
  const { message } = context;
  const content = message.content.replace(/<@!?\d+>\s*/g, "").trim();
  const [command] = content.split(/\s+/);

  if (!monitorAgent) {
    initializeMonitorAgent();
  }

  if (command.toLowerCase() === "status") {
    const { getBinanceService } = require("../../shared/binance-service");
    const binance = getBinanceService();

    try {
      const balance = await binance.fetchBalance();
      const openOrders = await binance.fetchOpenOrders();

      const totalUSDT = balance.total.USDT || 0;
      const freeUSDT = balance.free.USDT || 0;
      const usedUSDT = balance.used.USDT || 0;

      return `
📊 **Portfolio Status:**
💰 Balance: $${totalUSDT.toFixed(2)} USDT
  ├─ Free: $${freeUSDT.toFixed(2)}
  └─ Used: $${usedUSDT.toFixed(2)}

📈 Open Positions: ${openOrders.length}
${openOrders.length > 0 ? openOrders.map(o => `  • ${o.symbol}: ${o.side} ${o.amount} @ $${o.price}`).join('\n') : '  (No open orders)'}

${binance.isTestnet ? '⚠️  TESTNET MODE' : '🔴 PRODUCTION MODE'}
      `.trim();
    } catch (error) {
      logger.error("Failed to get status", { error });
      return `❌ Failed to get portfolio status: ${error.message}`;
    }
  }

  return `🟢 Monitor is alive!`;
}

module.exports = { monitorHandler, initializeMonitorAgent };
