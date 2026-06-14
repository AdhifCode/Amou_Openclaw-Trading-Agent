const Anthropic = require("@anthropic-ai/sdk");
const { LLMProvider } = require("../llm-interface");
const { createLogger } = require("../../../utils/logger");

const logger = createLogger("llm-anthropic");

class AnthropicProvider extends LLMProvider {
  constructor() {
    super();

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set in environment");
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    this.model = "claude-3-5-sonnet-20241022";
    this.maxTokens = 2048;

    logger.info(`✓ Anthropic provider initialized (${this.model})`);
  }

  async call(messages, systemPrompt, tools = [], options = {}) {
    try {
      const response = await this.client.messages.create({
        model: options.model || this.model,
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? undefined,
        system: systemPrompt,
        tools: tools.length > 0 ? this.formatTools(tools) : undefined,
        messages: messages,
      });

      return {
        content: response.content,
        stop_reason: response.stop_reason,
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
        },
        provider: "anthropic",
        model: this.model,
      };
    } catch (error) {
      logger.error("Anthropic API call failed", { error });
      throw error;
    }
  }

  formatTools(tools) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema,
    }));
  }

  getName() {
    return "Anthropic Claude";
  }

  getPricing() {
    return {
      input_1k_tokens: 0.003,
      output_1k_tokens: 0.015,
      currency: "USD",
    };
  }

  async healthCheck() {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 10,
        messages: [{ role: "user", content: "ping" }],
      });

      return { status: "healthy", latency_ms: 0 };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }
}

module.exports = { AnthropicProvider };
