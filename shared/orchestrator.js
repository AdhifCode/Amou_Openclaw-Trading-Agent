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
    this.cycleInterval = parseInt(process.env.ORCHESTRATOR_CYCLE_INTERVAL || '300000');
    this.isRunning = false;
    this.maxConcurrentAnalysis = parseInt(process.env.ORCHESTRATOR_MAX_CONCURRENT || '3');
    this.circuitBreaker = new Map();
    this.maxFailures = parseInt(process.env.ORCHESTRATOR_MAX_FAILURES || '3');
    this._cycleTimer = null;
  }

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

    this.runAnalysisCycle();

    this._cycleTimer = setInterval(() => {
      this.runAnalysisCycle();
    }, this.cycleInterval);

    this.emit('started', { watchlist: this.watchlist });
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this._cycleTimer) {
      clearInterval(this._cycleTimer);
      this._cycleTimer = null;
    }

    logger.info('Orchestrator stopped');
    this.emit('stopped');
  }

  async runAnalysisCycle() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Starting analysis cycle', {
      watchlist: this.watchlist,
      activeAnalysis: this.activeAnalysis.size,
    });

    for (const pair of this.watchlist) {
      if (this.isCircuitOpen(pair)) {
        logger.warn(`Circuit breaker open for ${pair}, skipping`);
        continue;
      }

      if (this.activeAnalysis.has(pair)) {
        logger.debug(`${pair} already being analyzed, skipping`);
        continue;
      }

      if (this.activeAnalysis.size >= this.maxConcurrentAnalysis) {
        logger.debug('Max concurrent analysis reached, queuing');
        this.analysisQueue.push(pair);
        continue;
      }

      this.startPairAnalysis(pair);
    }
  }

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
      workflow.state = 'analyzing';
      const analysis = await this.runAnalyst(pair);
      workflow.steps.push({ step: 'analyst', result: analysis, timestamp: Date.now() });

      if (!this.shouldProceed(analysis)) {
        logger.info(`No action needed for ${pair}`, { confidence: analysis.analysis?.confidence });
        workflow.state = 'completed-no-action';
        this.completeAnalysis(pair, workflow);
        return;
      }

      workflow.state = 'strategizing';
      const strategy = await this.runStrategist(pair, analysis);
      workflow.steps.push({ step: 'strategist', result: strategy, timestamp: Date.now() });

      workflow.state = 'risk-checking';
      const riskCheck = await this.checkRisk(strategy);
      workflow.steps.push({ step: 'risk-check', result: riskCheck, timestamp: Date.now() });

      if (!riskCheck.allowed) {
        logger.warn(`Risk check failed for ${pair}`, { reasons: riskCheck.reasons });
        workflow.state = 'completed-risk-rejected';
        this.completeAnalysis(pair, workflow);
        return;
      }

      workflow.state = 'executing';
      const execution = await this.runExecutor(strategy);
      workflow.steps.push({ step: 'executor', result: execution, timestamp: Date.now() });

      workflow.state = 'monitoring';
      await this.startMonitoring(pair, execution);
      workflow.steps.push({ step: 'monitor', result: { started: true }, timestamp: Date.now() });

      workflow.state = 'completed-success';
      this.completeAnalysis(pair, workflow);

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

      this.incrementCircuitBreaker(pair);
    }
  }

  async runAnalyst(pair) {
    logger.info(`[Analyst] Analyzing ${pair}`);

    const analyst = new DynamicAnalystAgent();
    const analysis = await analyst.analyze(pair);

    logger.info(`[Analyst] Analysis complete for ${pair}`, {
      sentiment: analysis.analysis?.sentiment,
      confidence: analysis.analysis?.confidence,
    });

    return analysis;
  }

  async runStrategist(pair, analysis) {
    logger.info(`[Strategist] Creating strategy for ${pair}`);

    const lastPrice = analysis.marketData?.ticker?.last || 0;

    const strategy = {
      pair,
      action: analysis.analysis?.signals?.entry ? 'BUY' : 'HOLD',
      entryPrice: lastPrice,
      quantity: 0.001,
      stopLoss: lastPrice * 0.98,
      takeProfit: lastPrice * 1.05,
      confidence: analysis.analysis?.confidence || 0,
      reasoning: analysis.analysis?.reasoning || '',
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

    this.emit('position-opened', {
      pair,
      execution,
      timestamp: new Date().toISOString(),
    });
  }

  shouldProceed(analysis) {
    const minConfidence = 0.7;
    const hasEntrySignal = analysis.analysis?.signals?.entry;
    const confidence = analysis.analysis?.confidence || 0;

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
