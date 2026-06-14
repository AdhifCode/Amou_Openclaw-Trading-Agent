## 🏗️ FEATURE 3: FULLY AUTONOMOUS INTER-AGENT COMMUNICATION

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                   Orchestrator Agent                         │
│  • Manages watchlist                                         │
│  • Triggers analysis cycles                                  │
│  • Coordinates agent communication                           │
│  • Prevents infinite loops                                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  Agent Communication Flow                     │
│                                                              │
│  1. Orchestrator → Analyst: "Analyze BTC/USDT"             │
│     Analyst → Orchestrator: Analysis Result                 │
│                                                              │
│  2. Orchestrator → Strategist: "Create strategy for BTC"    │
│     (includes Analyst result)                               │
│     Strategist → Orchestrator: Strategy JSON                │
│                                                              │
│  3. Orchestrator → Executor: "Validate & Execute"           │
│     (includes Strategy JSON)                                │
│     Executor → Orchestrator: Execution Result               │
│                                                              │
│  4. Orchestrator → Monitor: "Track position"                │
│     Monitor → Orchestrator: Position updates                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Key Principles

1. **Central Orchestrator**: Single source of truth for workflow
2. **Message Queue**: Prevents race conditions and loops
3. **State Machine**: Each analysis cycle has clear states
4. **Timeout Mechanism**: Prevents hanging operations
5. **Circuit Breaker**: Stops execution on repeated failures

### Implementation

**File: `shared/orchestrator.js`**

```javascript
const EventEmitter = require('events');
const { createLogger } = require('../utils/logger');
const { DynamicAnalystAgent } = require('../agents/analyst/dynamic-analyzer');
const { getStrategyManager } = require('./strategy-manager');
const { getRiskManager } = require('./risk-manager');

const logger = createLogger('orchestrator');

class Orchestrator extends EventEmitter {
  constructor() {
    super();
    this.watchlist = [];
    this.analysisQueue = [];
    this.activeAnalysis = new Map();
    this.cycleInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
    this.maxConcurrentAnalysis = 3;
    this.circuitBreaker = new Map(); // Track failures per pair
    this.maxFailures = 3;
  }

  /**
   * Start autonomous operation
   */
  start(watchlist) {
    if (this.isRunning) {
      logger.warn('Orchestrator already running');
      return;
    }

    this.watchlist = watchlist;
    this.isRunning = true;

    logger.info('Orchestrator started', {
      watchlist: this.watchlist,
      cycleInterval: this.cycleInterval,
    });

    // Start analysis cycle
    this.runAnalysisCycle();

    // Schedule periodic cycles
    this.cycleTimer = setInterval(() => {
      this.runAnalysisCycle();
    }, this.cycleInterval);

    this.emit('started', { watchlist: this.watchlist });
  }

  /**
   * Stop autonomous operation
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    clearInterval(this.cycleTimer);

    logger.info('Orchestrator stopped');
    this.emit('stopped');
  }

  /**
   * Main analysis cycle
   */
  async runAnalysisCycle() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Starting analysis cycle', {
      watchlist: this.watchlist,
      activeAnalysis: this.activeAnalysis.size,
    });

    for (const pair of this.watchlist) {
      // Check circuit breaker
      if (this.isCircuitOpen(pair)) {
        logger.warn(`Circuit breaker open for ${pair}, skipping`);
        continue;
      }

      // Check if already analyzing this pair
      if (this.activeAnalysis.has(pair)) {
        logger.debug(`${pair} already being analyzed, skipping`);
        continue;
      }

      // Check concurrent limit
      if (this.activeAnalysis.size >= this.maxConcurrentAnalysis) {
        logger.debug('Max concurrent analysis reached, queuing');
        this.analysisQueue.push(pair);
        continue;
      }

      // Start analysis
      this.startPairAnalysis(pair);
    }
  }

  /**
   * Analyze a single pair through the full workflow
   */
  async startPairAnalysis(pair) {
    const analysisId = `${pair}-${Date.now()}`;
    this.activeAnalysis.set(pair, analysisId);

    logger.info(`Starting analysis workflow for ${pair}`, { analysisId });

    const workflow = {
      id: analysisId,
      pair,
      state: 'started',
      startTime: Date.now(),
      steps: [],
    };

    try {
      // Step 1: Analyst
      workflow.state = 'analyzing';
      const analysis = await this.runAnalyst(pair);
      workflow.steps.push({ step: 'analyst', result: analysis, timestamp: Date.now() });

      // Check if analysis suggests action
      if (!this.shouldProceed(analysis)) {
        logger.info(`No action needed for ${pair}`, { confidence: analysis.analysis.confidence });
        workflow.state = 'completed-no-action';
        this.completeAnalysis(pair, workflow);
        return;
      }

      // Step 2: Strategist
      workflow.state = 'strategizing';
      const strategy = await this.runStrategist(pair, analysis);
      workflow.steps.push({ step: 'strategist', result: strategy, timestamp: Date.now() });

      // Step 3: Risk Check
      workflow.state = 'risk-checking';
      const riskCheck = await this.checkRisk(strategy);
      workflow.steps.push({ step: 'risk-check', result: riskCheck, timestamp: Date.now() });

      if (!riskCheck.allowed) {
        logger.warn(`Risk check failed for ${pair}`, { reasons: riskCheck.reasons });
        workflow.state = 'completed-risk-rejected';
        this.completeAnalysis(pair, workflow);
        return;
      }

      // Step 4: Executor
      workflow.state = 'executing';
      const execution = await this.runExecutor(strategy);
      workflow.steps.push({ step: 'executor', result: execution, timestamp: Date.now() });

      // Step 5: Monitor
      workflow.state = 'monitoring';
      await this.startMonitoring(pair, execution);
      workflow.steps.push({ step: 'monitor', result: { started: true }, timestamp: Date.now() });

      workflow.state = 'completed-success';
      this.completeAnalysis(pair, workflow);

      // Reset circuit breaker on success
      this.circuitBreaker.delete(pair);

    } catch (error) {
      logger.error(`Analysis workflow failed for ${pair}`, {
        analysisId,
        error: error.message,
        state: workflow.state,
      });

      workflow.state = 'failed';
      workflow.error = error.message;
      this.completeAnalysis(pair, workflow);

      // Increment circuit breaker
      this.incrementCircuitBreaker(pair);
    }
  }

  async runAnalyst(pair) {
    logger.info(`[Analyst] Analyzing ${pair}`);

    const analyst = new DynamicAnalystAgent();
    const analysis = await analyst.analyze(pair);

    logger.info(`[Analyst] Analysis complete for ${pair}`, {
      sentiment: analysis.analysis.sentiment,
      confidence: analysis.analysis.confidence,
    });

    return analysis;
  }

  async runStrategist(pair, analysis) {
    logger.info(`[Strategist] Creating strategy for ${pair}`);

    // Simulate strategist logic
    // In real implementation, this would call the actual Strategist agent
    const strategy = {
      pair,
      action: analysis.analysis.signals.entry ? 'BUY' : 'HOLD',
      entryPrice: analysis.marketData.ticker.last,
      quantity: 0.001, // Calculate based on risk
      stopLoss: analysis.marketData.ticker.last * 0.98,
      takeProfit: analysis.marketData.ticker.last * 1.05,
      confidence: analysis.analysis.confidence,
      reasoning: analysis.analysis.reasoning,
    };

    logger.info(`[Strategist] Strategy created for ${pair}`, {
      action: strategy.action,
      entryPrice: strategy.entryPrice,
    });

    return strategy;
  }

  async checkRisk(strategy) {
    logger.info(`[Risk Manager] Checking risk for ${strategy.pair}`);

    const riskManager = getRiskManager();
    const validation = await riskManager.validateOrder({
      pair: strategy.pair,
      quantity: strategy.quantity,
      price: strategy.entryPrice,
      stopLoss: strategy.stopLoss,
      takeProfit: strategy.takeProfit,
    });

    logger.info(`[Risk Manager] Risk check complete`, {
      allowed: validation.allowed,
      warnings: validation.warnings,
    });

    return validation;
  }

  async runExecutor(strategy) {
    if (strategy.action === 'HOLD') {
      logger.info(`[Executor] No execution needed for ${strategy.pair}`);
      return { executed: false, reason: 'HOLD signal' };
    }

    logger.info(`[Executor] Executing order for ${strategy.pair}`);

    // Simulate execution
    // In real implementation, this would call the actual Executor agent
    const execution = {
      executed: true,
      orderId: `ORDER-${Date.now()}`,
      pair: strategy.pair,
      side: strategy.action,
      quantity: strategy.quantity,
      price: strategy.entryPrice,
      timestamp: new Date().toISOString(),
    };

    logger.info(`[Executor] Order executed`, { orderId: execution.orderId });

    return execution;
  }

  async startMonitoring(pair, execution) {
    logger.info(`[Monitor] Starting monitoring for ${pair}`);

    // Emit event for Monitor agent to start tracking
    this.emit('position-opened', {
      pair,
      execution,
      timestamp: new Date().toISOString(),
    });
  }

  shouldProceed(analysis) {
    // Check if analysis confidence is high enough
    const minConfidence = 0.7;
    const hasEntrySignal = analysis.analysis.signals.entry;
    const confidence = analysis.analysis.confidence;

    return hasEntrySignal && confidence >= minConfidence;
  }

  completeAnalysis(pair, workflow) {
    this.activeAnalysis.delete(pair);

    logger.info(`Analysis workflow completed for ${pair}`, {
      id: workflow.id,
      state: workflow.state,
      duration: Date.now() - workflow.startTime,
      steps: workflow.steps.length,
    });

    this.emit('workflow-completed', workflow);

    // Process queue
    if (this.analysisQueue.length > 0) {
      const nextPair = this.analysisQueue.shift();
      this.startPairAnalysis(nextPair);
    }
  }

  isCircuitOpen(pair) {
    const failures = this.circuitBreaker.get(pair) || 0;
    return failures >= this.maxFailures;
  }

  incrementCircuitBreaker(pair) {
    const failures = (this.circuitBreaker.get(pair) || 0) + 1;
    this.circuitBreaker.set(pair, failures);

    if (failures >= this.maxFailures) {
      logger.error(`Circuit breaker opened for ${pair}`, { failures });
      this.emit('circuit-breaker-opened', { pair, failures });
    }
  }

  resetCircuitBreaker(pair) {
    this.circuitBreaker.delete(pair);
    logger.info(`Circuit breaker reset for ${pair}`);
  }

  updateWatchlist(watchlist) {
    this.watchlist = watchlist;
    logger.info('Watchlist updated', { watchlist });
    this.emit('watchlist-updated', { watchlist });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      watchlist: this.watchlist,
      activeAnalysis: Array.from(this.activeAnalysis.keys()),
      queueLength: this.analysisQueue.length,
      circuitBreakers: Array.from(this.circuitBreaker.entries()).map(([pair, failures]) => ({
        pair,
        failures,
        isOpen: failures >= this.maxFailures,
      })),
    };
  }
}

// Singleton
let instance = null;

function getOrchestrator() {
  if (!instance) {
    instance = new Orchestrator();
  }
  return instance;
}

module.exports = {
  Orchestrator,
  getOrchestrator,
};
```

### Orchestrator Control API

**File: `api/orchestrator-routes.js`**

```javascript
const express = require('express');
const { getOrchestrator } = require('../shared/orchestrator');
const { createLogger } = require('../utils/logger');

const router = express.Router();
const logger = createLogger('orchestrator-api');

// Start orchestrator
router.post('/start', (req, res) => {
  try {
    const { watchlist } = req.body;

    if (!watchlist || !Array.isArray(watchlist)) {
      return res.status(400).json({ error: 'Invalid watchlist' });
    }

    const orchestrator = getOrchestrator();
    orchestrator.start(watchlist);

    res.json({
      success: true,
      message: 'Orchestrator started',
      watchlist,
    });
  } catch (error) {
    logger.error('Failed to start orchestrator', { error });
    res.status(500).json({ error: error.message });
  }
});

// Stop orchestrator
router.post('/stop', (req, res) => {
  try {
    const orchestrator = getOrchestrator();
    orchestrator.stop();

    res.json({
      success: true,
      message: 'Orchestrator stopped',
    });
  } catch (error) {
    logger.error('Failed to stop orchestrator', { error });
    res.status(500).json({ error: error.message });
  }
});

// Get status
router.get('/status', (req, res) => {
  try {
    const orchestrator = getOrchestrator();
    const status = orchestrator.getStatus();

    res.json(status);
  } catch (error) {
    logger.error('Failed to get orchestrator status', { error });
    res.status(500).json({ error: error.message });
  }
});

// Update watchlist
router.put('/watchlist', (req, res) => {
  try {
    const { watchlist } = req.body;

    if (!watchlist || !Array.isArray(watchlist)) {
      return res.status(400).json({ error: 'Invalid watchlist' });
    }

    const orchestrator = getOrchestrator();
    orchestrator.updateWatchlist(watchlist);

    res.json({
      success: true,
      message: 'Watchlist updated',
      watchlist,
    });
  } catch (error) {
    logger.error('Failed to update watchlist', { error });
    res.status(500).json({ error: error.message });
  }
});

// Reset circuit breaker
router.post('/circuit-breaker/reset/:pair', (req, res) => {
  try {
    const { pair } = req.params;
    const orchestrator = getOrchestrator();
    orchestrator.resetCircuitBreaker(pair);

    res.json({
      success: true,
      message: `Circuit breaker reset for ${pair}`,
    });
  } catch (error) {
    logger.error('Failed to reset circuit breaker', { error });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## 🏗️ FEATURE 4: PER-AGENT MODEL SELECTION

### Architecture Design

```
┌─────────────────────────────────────────────────────────────┐
│                  Agent Configuration                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Analyst    │  │  Strategist  │  │   Executor   │     │
│  │ Haiku 4.6    │  │ Sonnet 4.6   │  │  Opus 4.8    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Configuration Structure

**File: `config/agent-models.json`**

```json
{
  "agents": {
    "analyst": {
      "model": "claude-haiku-4.6",
      "provider": "anthropic",
      "temperature": 0.3,
      "maxTokens": 2000,
      "reasoning": "Fast analysis, lower cost for frequent operations"
    },
    "strategist": {
      "model": "claude-sonnet-4.6",
      "provider": "anthropic",
      "temperature": 0.5,
      "maxTokens": 3000,
      "reasoning": "Balanced performance for strategy formulation"
    },
    "executor": {
      "model": "claude-opus-4.8",
      "provider": "anthropic",
      "temperature": 0.1,
      "maxTokens": 1500,
      "reasoning": "Highest accuracy for critical execution decisions"
    },
    "monitor": {
      "model": "claude-haiku-4.6",
      "provider": "anthropic",
      "temperature": 0.2,
      "maxTokens": 1500,
      "reasoning": "Fast monitoring, frequent updates"
    },
    "developer": {
      "model": "claude-sonnet-4.6",
      "provider": "anthropic",
      "temperature": 0.4,
      "maxTokens": 4000,
      "reasoning": "Complex debugging and system analysis"
    }
  },
  "modelCatalog": {
    "claude-opus-4.8": {
      "name": "Claude Opus 4.8",
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kTokens": {
        "input": 0.015,
        "output": 0.075
      },
      "capabilities": ["highest-intelligence", "complex-reasoning"]
    },
    "claude-sonnet-4.6": {
      "name": "Claude Sonnet 4.6",
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kTokens": {
        "input": 0.003,
        "output": 0.015
      },
      "capabilities": ["balanced", "fast", "cost-effective"]
    },
    "claude-haiku-4.6": {
      "name": "Claude Haiku 4.6",
      "provider": "anthropic",
      "contextWindow": 200000,
      "costPer1kTokens": {
        "input": 0.0008,
        "output": 0.004
      },
      "capabilities": ["fastest", "lowest-cost", "frequent-use"]
    }
  }
}
```

### Implementation

**File: `shared/model-manager.js`**

```javascript
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
        models: Object.keys(config.modelCatalog).length,
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
    return this.config.modelCatalog[modelId];
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
    return this.config.modelCatalog;
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

// Singleton
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
```

**Update OpenClaw Agent to use Model Manager:**

**File: `shared/openclaw-agent.js` (Updated)**

```javascript
const { getModelManager } = require('./model-manager');
const { createLLMProvider } = require('./llm/llm-factory');

class OpenClawAgent {
  constructor(agentId, config = {}) {
    this.agentId = agentId;
    this.config = config;
    
    // Get model configuration for this agent
    const modelManager = getModelManager();
    const modelConfig = modelManager.getAgentModel(config.name || agentId);
    
    this.modelConfig = modelConfig;
    this.llmProvider = createLLMProvider(modelConfig.provider);
    
    logger.info(`Agent initialized: ${agentId}`, {
      model: modelConfig.model,
      provider: modelConfig.provider,
    });
  }

  async callLLM(messages, options = {}) {
    const mergedOptions = {
      model: this.modelConfig.model,
      temperature: this.modelConfig.temperature,
      maxTokens: this.modelConfig.maxTokens,
      ...options,
    };

    return await this.llmProvider.complete(messages, mergedOptions);
  }

  // ... rest of the class
}
```

---

*Continued in next part...*
