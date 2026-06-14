require('dotenv').config();
const { getStrategyManager } = require('../shared/strategy-manager');

async function testStrategies() {
  console.log('Testing Strategy Manager...\n');

  const manager = getStrategyManager();

  // Test 1: Load strategies
  console.log('1. Loading strategies...');
  const strategies = manager.getAllStrategies();
  console.log(`✓ Loaded ${Object.keys(strategies).length} strategies`);

  // Test 2: Get specific strategy
  console.log('\n2. Getting BTC/USDT strategy...');
  const btcStrategy = manager.getStrategy('BTC/USDT');
  console.log('✓ Strategy:', btcStrategy.name);
  console.log('  Indicators:', btcStrategy.indicators.join(', '));
  console.log('  Timeframe:', btcStrategy.timeframe);

  // Test 3: Get system prompt
  console.log('\n3. Getting system prompt...');
  const prompt = manager.getSystemPrompt(btcStrategy.systemPrompt);
  console.log('✓ Prompt role:', prompt.role);
  console.log('  Risk tolerance:', prompt.riskTolerance);

  console.log('\n✅ All strategy tests passed!');
}

testStrategies().catch(console.error);
