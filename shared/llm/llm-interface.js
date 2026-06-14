/**
 * Abstract LLM Interface
 * Semua LLM provider harus implement interface ini
 */
class LLMProvider {
  /**
   * Execute LLM call dengan messages dan tools
   *
   * @param {Array} messages - [{ role, content }]
   * @param {string} systemPrompt - System prompt
   * @param {Array} tools - Tool definitions
   * @param {Object} options - Additional options (model, temperature, maxTokens)
   * @returns {Object} - { content, stop_reason, usage }
   */
  async call(messages, systemPrompt, tools = [], options = {}) {
    throw new Error("Not implemented");
  }

  /**
   * Get provider name (untuk logging)
   */
  getName() {
    throw new Error("Not implemented");
  }

  /**
   * Get pricing info
   */
  getPricing() {
    throw new Error("Not implemented");
  }

  /**
   * Check provider health/connectivity
   */
  async healthCheck() {
    throw new Error("Not implemented");
  }
}

module.exports = { LLMProvider };
