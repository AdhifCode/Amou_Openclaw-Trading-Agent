const { AnthropicProvider } = require("./providers/anthropic-provider");
const { OpenAIProvider } = require("./providers/openai-provider");
const { CustomProvider } = require("./providers/custom-provider");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("llm-factory");

/**
 * LLM Factory: Create provider instance based on environment
 */
class LLMFactory {
  static createProvider(providerName = null) {
    const selectedProvider =
      providerName || process.env.LLM_PROVIDER || "anthropic";

    logger.info(`Creating LLM provider: ${selectedProvider}`);

    switch (selectedProvider.toLowerCase()) {
      case "anthropic":
      case "claude":
        return new AnthropicProvider();

      case "openai":
      case "gpt":
        return new OpenAIProvider();

      case "custom":
      case "ollama":
      case "9router":
      case "self-hosted":
        return new CustomProvider();

      default:
        throw new Error(`Unknown LLM provider: ${selectedProvider}`);
    }
  }

  static getAllProviders() {
    return {
      anthropic: {
        name: "Claude (Anthropic)",
        available: !!process.env.ANTHROPIC_API_KEY,
      },
      openai: {
        name: "GPT-4 (OpenAI)",
        available: !!process.env.OPENAI_API_KEY,
      },
      custom: {
        name: "Custom/Self-hosted",
        available: !!process.env.CUSTOM_LLM_BASE_URL,
      },
    };
  }

  static listAvailableProviders() {
    const all = this.getAllProviders();
    const available = Object.entries(all)
      .filter(([_, config]) => config.available)
      .map(([key, config]) => `${key} (${config.name})`);

    return available.length > 0 ? available : ["No providers configured"];
  }
}

module.exports = { LLMFactory };
