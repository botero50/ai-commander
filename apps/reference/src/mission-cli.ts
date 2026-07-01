#!/usr/bin/env node

import { MissionAgent } from './mission-agent.js';

// Default mission: move to (3, 2)
const targetX = 3;
const targetY = 2;

async function main(): Promise<number> {
  const agent = new MissionAgent(targetX, targetY);

  try {
    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    // Print execution metrics (summary)
    console.log('\n' + agent.formatMetrics());

    // Print execution trace (details)
    console.log('\n' + agent.formatTrace());

    console.log('\n✓ Mission completed successfully');
    return 0;
  } catch (error) {
    console.error('\n✗ Mission failed:');
    console.error(error);
    return 1;
  }
}

main().then((exitCode) => {
  process.exit(exitCode);
});
