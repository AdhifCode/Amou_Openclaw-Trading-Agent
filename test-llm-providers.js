require("dotenv").config();
const { LLMFactory } = require("./shared/llm/llm-factory");
const { createLogger } = require("./utils/logger");

const logger = createLogger("llm-test");

async function testProviders() {
  logger.info("🔍 Available LLM Providers:");

  const available = LLMFactory.listAvailableProviders();
  available.forEach((provider) => {
    logger.info(`  ✓ ${provider}`);
  });

  logger.info("\n🧪 Testing LLM call with Analyst...");

  try {
    const provider = LLMFactory.createProvider();

    logger.info(`Using provider: ${provider.getName()}`);
    logger.info(`Pricing: ${JSON.stringify(provider.getPricing())}`);

    const response = await provider.call(
      [{ role: "user", content: "What is the current trend of Bitcoin?" }],
      "You are a cryptocurrency analyst. Analyze market data and provide insights.",
      [],
    );

    logger.info(`\n✅ LLM Response:`);
    logger.info(`Provider: ${response.provider}`);
    logger.info(`Model: ${response.model}`);
    logger.info(
      `Tokens: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`,
    );
    logger.info(
      `Content preview: ${response.content[0]?.text?.substring(0, 100)}...`,
    );
  } catch (error) {
    logger.error("❌ LLM call failed", { error: error.message });
  }
}

testProviders();
