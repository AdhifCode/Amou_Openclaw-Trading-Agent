const { LLMFactory } = require('./llm/llm-factory');
const { getModelManager } = require('./model-manager');
const { createLogger } = require('../utils/logger');

/**
 * OpenClawAgent: Base class untuk semua AI agents
 * Supports multiple LLM providers (Anthropic, OpenAI, Custom)
 * Now supports per-agent model selection via ModelManager
 */
class OpenClawAgent {
  constructor(agentId, agentConfig) {
    this.agentId = agentId;
    this.agentConfig = agentConfig;
    this.logger = createLogger(agentId);

    // Get model configuration for this agent
    try {
      const modelManager = getModelManager();
      const modelAgentName = agentConfig?.modelAgentName || agentConfig?.name || agentId.split('-')[0];
      this.modelConfig = modelManager.getAgentModel(modelAgentName);
    } catch (error) {
      this.logger.warn('Model manager not available, using defaults');
      this.modelConfig = {
        model: process.env.CUSTOM_LLM_MODEL || 'claude-sonnet-4.6',
        provider: process.env.LLM_PROVIDER || 'custom',
        temperature: 0.5,
        maxTokens: 2000,
      };
    }

    // Initialize LLM provider based on environment
    try {
      this.llmProvider = LLMFactory.createProvider();
      this.logger.info(`✓ LLM Provider: ${this.llmProvider.getName()}`);
      this.logger.info(`✓ Model: ${this.modelConfig.model}`, {
        provider: this.modelConfig.provider,
        temperature: this.modelConfig.temperature,
      });
    } catch (error) {
      this.logger.error('Failed to initialize LLM provider', { error });
      throw error;
    }

    this.conversationHistory = [];
    this.tools = [];

    this.logger.info(`✓ OpenClaw Agent initialized: ${agentId}`);
  }

  registerTool(toolDefinition) {
    if (!toolDefinition.name || !toolDefinition.description) {
      throw new Error('Tool must have name and description');
    }

    this.tools.push(toolDefinition);
    this.logger.debug(`Tool registered: ${toolDefinition.name}`);
  }

  async execute(userInput, systemPrompt) {
    if (!this.llmProvider) {
      throw new Error('LLM provider not initialized');
    }

    this.logger.info(`Executing agent with input: "${userInput.substring(0, 50)}..."`);

    try {
      this.conversationHistory = [];

      const messages = [
        {
          role: 'user',
          content: userInput,
        },
      ];

      let response = await this._callLLM(messages, systemPrompt);
      let iterations = 0;
      const maxIterations = 10;

      while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
        iterations++;
        this.logger.debug(`Tool use loop iteration ${iterations}`);

        const toolUseBlocks = response.content.filter(block => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) break;

        const toolResults = [];

        for (const toolUse of toolUseBlocks) {
          this.logger.info(`Tool called: ${toolUse.name}`);

          try {
            const toolResult = await this._executeTool(toolUse.name, toolUse.input);

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(toolResult),
            });
          } catch (error) {
            this.logger.error(`Tool execution failed: ${toolUse.name}`, { error });

            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Error: ${error.message}`,
              is_error: true,
            });
          }
        }

        const nextMessages = [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ];

        response = await this._callLLM(nextMessages, systemPrompt);
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
      }

      const finalResponse = this._extractFinalResponse(response);
      this.logger.info(`Agent execution complete (iterations: ${iterations})`);

      return finalResponse;

    } catch (error) {
      this.logger.error('Agent execution failed', { error });
      throw error;
    }
  }

  async _callLLM(messages, systemPrompt) {
    try {
      const options = {
        model: this.modelConfig.model,
        temperature: this.modelConfig.temperature,
        maxTokens: this.modelConfig.maxTokens,
      };

      const response = await this.llmProvider.call(
        messages,
        systemPrompt,
        this.tools,
        options
      );

      return response;
    } catch (error) {
      this.logger.error('LLM API call failed', { error });
      throw error;
    }
  }

  async _executeTool(toolName, toolInput) {
    const toolHandler = this.toolHandlers?.[toolName];

    if (!toolHandler) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const result = await Promise.race([
      toolHandler(toolInput),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), 30000)
      ),
    ]);

    return result;
  }

  _extractFinalResponse(response) {
    const textBlocks = response.content.filter(block => block.type === 'text');
    
    if (textBlocks.length === 0) {
      return null;
    }

    return textBlocks.map(block => block.text).join('\n');
  }

  setToolHandlers(handlers) {
    this.toolHandlers = handlers;
    this.logger.info(`Registered ${Object.keys(handlers).length} tool handlers`);
  }

  async getProviderInfo() {
    return {
      name: this.llmProvider.getName(),
      pricing: this.llmProvider.getPricing(),
      health: await this.llmProvider.healthCheck(),
    };
  }
}

module.exports = { OpenClawAgent };
