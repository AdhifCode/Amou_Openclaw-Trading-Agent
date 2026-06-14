require('dotenv').config();
const { getOrchestrator } = require('../shared/orchestrator');

async function testOrchestrator() {
  console.log('Testing Orchestrator...\n');

  const orchestrator = getOrchestrator();

  // Test 1: Start orchestrator
  console.log('1. Starting orchestrator...');
  const watchlist = ['BTC/USDT', 'ETH/USDT'];
  orchestrator.start(watchlist);
  console.log('✓ Orchestrator started');

  // Test 2: Get status
  console.log('\n2. Getting status...');
  const status = orchestrator.getStatus();
  console.log('✓ Status:', status);

  // Test 3: Stop orchestrator
  console.log('\n3. Stopping orchestrator...');
  orchestrator.stop();
  console.log('✓ Orchestrator stopped');

  console.log('\n✅ All orchestrator tests passed!');
}

testOrchestrator().catch(console.error);
