const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('model-manager');

class ModelManager {
  constructor() {
    this.configPath = path.join(__dirname, '../config/agent-models.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(data);
      logger.info('Model configuration loaded', {
        agents: Object.keys(config.agents).length,
        models: Object.keys(config.modelCatalog || {}).length,
      });
      return config;
    } catch (error) {
      logger.error('Failed to load model config', { error: error.message });
      return { agents: {}, modelCatalog: {} };
    }
  }

  reloadConfig() {
    this.config = this.loadConfig();
    logger.info('Model configuration reloaded');
  }

  getAgentModel(agentName) {
    const agentConfig = this.config.agents[agentName.toLowerCase()];
    if (!agentConfig) {
      logger.warn(`No model config for agent: ${agentName}, using default`);
      return this.getDefaultModel();
    }
    return agentConfig;
  }

  getModelInfo(modelId) {
    return this.config.modelCatalog ? this.config.modelCatalog[modelId] : null;
  }

  getDefaultModel() {
    return {
      model: 'claude-sonnet-4.6',
      provider: 'anthropic',
      temperature: 0.5,
      maxTokens: 2000,
    };
  }

  updateAgentModel(agentName, modelConfig) {
    this.config.agents[agentName.toLowerCase()] = modelConfig;
    this.saveConfig();
    logger.info(`Model updated for agent: ${agentName}`, { model: modelConfig.model });
  }

  saveConfig() {
    try {
      fs.writeFileSync(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf8'
      );
      logger.info('Model configuration saved');
    } catch (error) {
      logger.error('Failed to save model config', { error: error.message });
    }
  }

  getAllAgentModels() {
    return this.config.agents;
  }

  getModelCatalog() {
    return this.config.modelCatalog || {};
  }

  estimateCost(agentName, inputTokens, outputTokens) {
    const agentConfig = this.getAgentModel(agentName);
    const modelInfo = this.getModelInfo(agentConfig.model);

    if (!modelInfo || !modelInfo.costPer1kTokens) {
      return null;
    }

    const inputCost = (inputTokens / 1000) * modelInfo.costPer1kTokens.input;
    const outputCost = (outputTokens / 1000) * modelInfo.costPer1kTokens.output;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      currency: 'USD',
    };
  }
}

let instance = null;

function getModelManager() {
  if (!instance) {
    instance = new ModelManager();
  }
  return instance;
}

module.exports = {
  ModelManager,
  getModelManager,
};
