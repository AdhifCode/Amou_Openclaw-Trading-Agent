const fs = require('fs');
const path = require('path');
const { createLogger } = require('../utils/logger');

const logger = createLogger('strategy-manager');

class StrategyManager {
  constructor() {
    this.strategiesPath = path.join(__dirname, '../config/strategies.json');
    this.strategies = this.loadStrategies();
  }

  loadStrategies() {
    try {
      const data = fs.readFileSync(this.strategiesPath, 'utf8');
      const config = JSON.parse(data);
      logger.info(`Loaded ${Object.keys(config.strategies).length} strategies`);
      return config;
    } catch (error) {
      logger.error('Failed to load strategies', { error: error.message });
      return { strategies: {}, systemPrompts: {} };
    }
  }

  reloadStrategies() {
    this.strategies = this.loadStrategies();
    logger.info('Strategies reloaded');
  }

  getStrategy(pair) {
    const strategy = this.strategies.strategies[pair];
    if (!strategy) {
      logger.warn(`No strategy found for ${pair}, using default`);
      return this.getDefaultStrategy();
    }
    return strategy;
  }

  getSystemPrompt(promptName) {
    return this.strategies.systemPrompts[promptName] || this.getDefaultPrompt();
  }

  getDefaultStrategy() {
    return {
      name: "Default Strategy",
      indicators: ["RSI", "MACD", "SMA_20"],
      timeframe: "4h",
      systemPrompt: "default",
      parameters: {},
      riskProfile: "moderate"
    };
  }

  getDefaultPrompt() {
    return {
      role: "General Market Analyst",
      instructions: "Analyze the market using standard technical indicators.",
      riskTolerance: "medium",
      minConfidence: 0.7
    };
  }

  getAllStrategies() {
    return this.strategies.strategies;
  }

  getStrategyForPair(pair) {
    return this.getStrategy(pair);
  }

  updateStrategy(pair, strategyConfig) {
    this.strategies.strategies[pair] = strategyConfig;
    this.saveStrategies();
    logger.info(`Strategy updated for ${pair}`);
  }

  addStrategy(pair, strategyConfig) {
    this.strategies.strategies[pair] = strategyConfig;
    this.saveStrategies();
    logger.info(`Strategy added for ${pair}`);
  }

  deleteStrategy(pair) {
    delete this.strategies.strategies[pair];
    this.saveStrategies();
    logger.info(`Strategy deleted for ${pair}`);
  }

  saveStrategies() {
    try {
      fs.writeFileSync(
        this.strategiesPath,
        JSON.stringify(this.strategies, null, 2),
        'utf8'
      );
      logger.info('Strategies saved');
    } catch (error) {
      logger.error('Failed to save strategies', { error: error.message });
    }
  }
}

let instance = null;

function getStrategyManager() {
  if (!instance) {
    instance = new StrategyManager();
  }
  return instance;
}

module.exports = {
  StrategyManager,
  getStrategyManager,
};
