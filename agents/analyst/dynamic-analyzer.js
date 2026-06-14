const { OpenClawAgent } = require('../../shared/openclaw-agent');
const { getBinanceService } = require('../../shared/binance-service');
const { getStrategyManager } = require('../../shared/strategy-manager');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('dynamic-analyzer');

class DynamicAnalystAgent {
  constructor() {
    this.strategyManager = getStrategyManager();
    this.binance = getBinanceService();
  }

  async analyze(pair, options = {}) {
    logger.info(`Starting dynamic analysis for ${pair}`);

    const strategy = this.strategyManager.getStrategy(pair);
    const systemPrompt = this.strategyManager.getSystemPrompt(strategy.systemPrompt);

    logger.info(`Using strategy: ${strategy.name}`, {
      indicators: strategy.indicators,
      timeframe: strategy.timeframe,
    });

    const marketData = await this.fetchMarketData(pair, strategy);

    const indicators = await this.calculateIndicators(pair, strategy, marketData);

    const agent = this.createDynamicAgent(pair, strategy, systemPrompt);

    const analysis = await agent.execute(
      this.buildAnalysisPrompt(pair, strategy, marketData, indicators),
      systemPrompt.instructions
    );

    let parsed = null;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      logger.warn('Could not parse analysis as JSON, returning raw text');
      parsed = {
        sentiment: 'neutral',
        confidence: 0.5,
        signals: { entry: false, exit: false },
        reasoning: analysis,
        recommendations: []
      };
    }

    return {
      pair,
      strategy: strategy.name,
      riskProfile: strategy.riskProfile,
      analysis: parsed || {
        sentiment: 'neutral',
        confidence: 0.5,
        signals: { entry: false, exit: false },
        reasoning: 'Analysis failed to parse',
        recommendations: []
      },
      marketData,
      indicators,
      timestamp: new Date().toISOString(),
    };
  }

  async fetchMarketData(pair, strategy) {
    const timeframe = strategy.timeframe || '4h';
    const limit = 100;

    const [ticker, ohlcv] = await Promise.all([
      this.binance.fetchTicker(pair),
      this.binance.fetchOHLCV(pair, timeframe, limit),
    ]);

    return {
      ticker,
      ohlcv,
      timeframe,
    };
  }

  async calculateIndicators(pair, strategy, marketData) {
    const closes = marketData.ohlcv.map(c => c.close);
    const volumes = marketData.ohlcv.map(c => c.volume);
    const indicators = {};

    for (const indicator of strategy.indicators) {
      try {
        switch (indicator) {
          case 'RSI':
            indicators.RSI = this.binance.calculateRSI(closes, 14);
            break;

          case 'MACD':
            indicators.MACD = this.binance.calculateMACD(closes);
            break;

          case 'SMA_20':
            indicators.SMA_20 = this.binance.calculateSMA(closes, 20);
            break;

          case 'SMA_50':
            indicators.SMA_50 = this.binance.calculateSMA(closes, 50);
            break;

          case 'EMA_12':
            indicators.EMA_12 = this.binance.calculateEMA(closes, 12);
            break;

          case 'EMA_26':
            indicators.EMA_26 = this.binance.calculateEMA(closes, 26);
            break;

          case 'BB':
            indicators.BB = this.binance.calculateBollingerBands(closes, 20, 2);
            break;

          case 'ATR':
            indicators.ATR = this.calculateATR(marketData.ohlcv, 14);
            break;

          case 'ADX':
            indicators.ADX = this.calculateADX(marketData.ohlcv, 14);
            break;

          case 'Volume':
            indicators.Volume = {
              current: volumes[volumes.length - 1],
              average: volumes.reduce((a, b) => a + b, 0) / volumes.length,
              spike: volumes[volumes.length - 1] / (volumes.reduce((a, b) => a + b, 0) / volumes.length),
            };
            break;

          default:
            logger.warn(`Unknown indicator: ${indicator}`);
        }
      } catch (error) {
        logger.error(`Failed to calculate ${indicator}`, { error: error.message });
      }
    }

    return indicators;
  }

  createDynamicAgent(pair, strategy, systemPrompt) {
    const agent = new OpenClawAgent(`analyst-${pair}`, {
      name: `Analyst (${strategy.name})`,
      role: systemPrompt.role || 'Market Analyst',
      modelAgentName: 'analyst',
    });
    return agent;
  }

  buildAnalysisPrompt(pair, strategy, marketData, indicators) {
    return `
You are analyzing ${pair} using the "${strategy.name}" strategy.

Risk Profile: ${strategy.riskProfile}
Minimum Confidence Required: ${strategy.minConfidence || 0.7}

Indicators Available:
${strategy.indicators.map(ind => `- ${ind}`).join('\n')}

Strategy Parameters:
${JSON.stringify(strategy.parameters, null, 2)}

Current Market Data:
- Price: $${marketData.ticker?.last || 'N/A'}
- 24h High: $${marketData.ticker?.high || 'N/A'}
- 24h Low: $${marketData.ticker?.low || 'N/A'}
- 24h Volume: ${marketData.ticker?.volume || 'N/A'}
- 24h Change: ${marketData.ticker?.change || 'N/A'}%

Calculated Indicators:
${JSON.stringify(indicators, null, 2)}

Your task:
1. Analyze the provided market data and indicators
2. Determine market sentiment (bullish/bearish/neutral)
3. Identify entry/exit signals based on the strategy
4. Provide confidence score (0-1)
5. Return analysis in JSON format

Output Format:
{
  "sentiment": "bullish|bearish|neutral",
  "confidence": 0.85,
  "signals": {
    "entry": true/false,
    "exit": true/false
  },
  "reasoning": "Detailed explanation",
  "recommendations": ["action1", "action2"]
}
    `.trim();
  }

  calculateATR(ohlcv, period = 14) {
    const trs = [];
    for (let i = 1; i < ohlcv.length; i++) {
      const high = ohlcv[i].high;
      const low = ohlcv[i].low;
      const prevClose = ohlcv[i - 1].close;

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }

    const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
    return atr;
  }

  calculateADX(ohlcv, period = 14) {
    return 25;
  }
}

module.exports = { DynamicAnalystAgent };
