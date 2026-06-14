const OpenAI = require("openai");
const { LLMProvider } = require("../llm-interface");
const { createLogger } = require("../../utils/logger");

const logger = createLogger("llm-openai");

class OpenAIProvider extends LLMProvider {
  constructor() {
    super();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not set in environment");
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.model = "gpt-4-turbo";
    this.maxTokens = 2048;

    logger.info(`✓ OpenAI provider initialized (${this.model})`);
  }

  async call(messages, systemPrompt, tools = []) {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        tools: tools.length > 0 ? this.formatTools(tools) : undefined,
        messages: messages,
      });

      // Convert OpenAI format to standard format
      return {
        content: [{ type: "text", text: response.choices[0].message.content }],
        stop_reason:
          response.choices[0].finish_reason === "tool_calls"
            ? "tool_use"
            : "end_turn",
        usage: {
          input_tokens: response.usage.prompt_tokens,
          output_tokens: response.usage.completion_tokens,
        },
        provider: "openai",
        model: this.model,
      };
    } catch (error) {
      logger.error("OpenAI API call failed", { error });
      throw error;
    }
  }

  formatTools(tools) {
    // OpenAI expects different tool format
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }

  getName() {
    return "OpenAI GPT-4";
  }

  getPricing() {
    return {
      input_1k_tokens: 0.01,
      output_1k_tokens: 0.03,
      currency: "USD",
    };
  }

  async healthCheck() {
    try {
      const response = await this.client.chat.completions.create({
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

module.exports = { OpenAIProvider };
