const { DiscordGateway } = require("./discord-gateway");
const { getDiscordLogger } = require("./discord-logger");
const { createLogger } = require("../utils/logger");
const { validateEnvironment } = require("../utils/env-validator");
const { startHealthServer } = require("./health-check");

const logger = createLogger("gateway-main");

async function main() {
  try {
    validateEnvironment();

    const gateway = new DiscordGateway();
    const discordLogger = getDiscordLogger();

    await gateway.initialize();

    const firstClient = gateway.getClient("analyst");
    discordLogger.setDiscordClient(firstClient);

    // Start health check server
    const healthPort = process.env.WEBHOOK_PORT || 3000;
    startHealthServer(healthPort);

    await discordLogger.sendLog(
      "System Startup",
      "✅ Trading system with OpenClaw integration started",
      "system",
      "info",
    );

    // ✨ Import dengan OpenClaw initialization
    const { analyzerHandler } = require("../agents/analyst");
    const { strategistHandler } = require("../agents/strategist");
    const { executorHandler } = require("../agents/executor");
    const { monitorHandler } = require("../agents/monitor");
    const { developerHandler } = require("../agents/developer");

    gateway.registerAgentHandler("analyst", analyzerHandler);
    gateway.registerAgentHandler("strategist", strategistHandler);
    gateway.registerAgentHandler("executor", executorHandler);
    gateway.registerAgentHandler("monitor", monitorHandler);
    gateway.registerAgentHandler("developer", developerHandler);

    logger.info("✅ All agents with OpenClaw initialized!");

    process.on("SIGINT", async () => {
      logger.info("Shutting down...");
      await discordLogger.sendLog(
        "System Shutdown",
        "⛔ System shutting down",
        "system",
        "warn",
      );
      await gateway.shutdown();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      logger.info("Received SIGTERM, shutting down gracefully...");
      await gateway.shutdown();
      process.exit(0);
    });

    logger.info("🚀 Discord Gateway with OpenClaw ready!");
  } catch (error) {
    logger.error("Fatal error", { error });
    process.exit(1);
  }
}

main();
