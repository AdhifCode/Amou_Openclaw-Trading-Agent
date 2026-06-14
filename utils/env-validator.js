const fs = require("fs");
const path = require("path");
require("dotenv").config();

const REQUIRED_VARS = {
  // Discord
  DISCORD_BOT_TOKEN_ANALYST: "string",
  DISCORD_BOT_TOKEN_STRATEGIST: "string",
  DISCORD_BOT_TOKEN_EXECUTOR: "string",
  DISCORD_BOT_TOKEN_MONITOR: "string",
  DISCORD_BOT_TOKEN_DEVELOPER: "string",
  DISCORD_GUILD_ID: "string",

  // Binance
  BINANCE_API_KEY: "string",
  BINANCE_API_SECRET: "string",

  // Anthropic
  ANTHROPIC_API_KEY: "string",

  // Redis
  REDIS_HOST: "string",
  REDIS_PORT: "number",

  // General
  NODE_ENV: "string",
  LOG_LEVEL: "string",
  WEBHOOK_PORT: "number",
};

function validateEnvironment() {
  const errors = [];

  Object.entries(REQUIRED_VARS).forEach(([key, type]) => {
    const value = process.env[key];

    if (!value) {
      errors.push(`❌ Missing required variable: ${key}`);
      return;
    }

    if (type === "number" && isNaN(value)) {
      errors.push(`❌ ${key} must be a number, got: ${value}`);
    }

    if (type === "string" && typeof value !== "string") {
      errors.push(`❌ ${key} must be a string`);
    }

    // Extra validations
    if (key.includes("TOKEN") && value.length < 50) {
      errors.push(
        `⚠️  ${key} seems suspiciously short (${value.length} chars)`,
      );
    }

    if (key.includes("API_KEY") && value.length < 20) {
      errors.push(
        `⚠️  ${key} seems suspiciously short (${value.length} chars)`,
      );
    }
  });

  if (errors.length > 0) {
    console.error("\n🔴 ENVIRONMENT VALIDATION FAILED:\n");
    errors.forEach((err) => console.error(err));
    console.error("\n📋 Please check your .env file and try again.\n");
    process.exit(1);
  }

  console.log("✅ Environment variables validated successfully!\n");
  return true;
}

module.exports = { validateEnvironment };
