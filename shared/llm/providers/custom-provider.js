const axios = require("axios");
const { LLMProvider } = require("../llm-interface");
const { createLogger } = require("../../../utils/logger");

const logger = createLogger("llm-custom");

class CustomProvider extends LLMProvider {
  constructor(config = {}) {
    super();

    this.baseUrl = config.baseUrl || process.env.CUSTOM_LLM_BASE_URL;
    this.model = config.model || process.env.CUSTOM_LLM_MODEL || "mistral-7b";
    this.apiKey = config.apiKey || process.env.CUSTOM_LLM_API_KEY;
    this.maxTokens = config.maxTokens || 2048;

    if (!this.baseUrl) {
      throw new Error("CUSTOM_LLM_BASE_URL not set in environment");
    }

    logger.info(
      `✓ Custom provider initialized (${this.baseUrl}, model: ${this.model})`,
    );
  }

  async call(messages, systemPrompt, tools = [], options = {}) {
    try {
      const payload = {
        model: options.model || this.model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: options.maxTokens || this.maxTokens,
        temperature: options.temperature ?? 0.7,
        stream: false,
      };

      if (tools.length > 0) {
        payload.tools = this.formatTools(tools);
      }

      const url = this.baseUrl.endsWith('/v1')
        ? `${this.baseUrl}/chat/completions`
        : `${this.baseUrl}/v1/chat/completions`;

      const response = await axios.post(url, payload, {
        headers: {
          "Content-Type": "application/json",
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        timeout: 60000,
      });

      const choice = response.data.choices[0];

      return {
        content: [{ type: "text", text: choice.message.content }],
        stop_reason:
          choice.finish_reason === "tool_calls" ? "tool_use" : "end_turn",
        usage: response.data.usage || { input_tokens: 0, output_tokens: 0 },
        provider: "custom",
        model: this.model,
      };
    } catch (error) {
      logger.error("Custom provider API call failed", {
        error: error.message,
        url: this.baseUrl,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  formatTools(tools) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    }));
  }

  getName() {
    return `Custom LLM (${this.model})`;
  }

  getPricing() {
    return {
      pricing: "Tergantung provider",
      currency: "Varies",
    };
  }

  async healthCheck() {
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 5000,
        ...(this.apiKey && {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }),
      });

      return {
        status: "healthy",
        latency_ms: response.status === 200 ? 0 : -1,
      };
    } catch (error) {
      return { status: "unhealthy", error: error.message };
    }
  }
}

module.exports = { CustomProvider };
