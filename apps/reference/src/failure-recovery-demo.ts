import { MissionAgent } from './mission-agent.js';
import { formatTrace } from './execution-trace.js';

/**
 * Failure Recovery Demonstration
 *
 * Demonstrates how AI Commander diagnoses failures and adapts recovery strategy.
 *
 * This demo shows three scenarios:
 * 1. Normal mission completion (no failures)
 * 2. Goal already achieved detection
 * 3. Failure diagnosis and recovery
 */

async function runFailureRecoveryDemo(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║  AI Commander: Failure Diagnosis & Adaptive Recovery            ║');
  console.log('║  Story 094 Demonstration                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Scenario 1: Normal mission completion
  console.log('┌────────────────────────────────────────────────────────────────┐');
  console.log('│ SCENARIO 1: Normal Mission Execution                            │');
  console.log('│ Target: (2, 1) - Short distance, no failure expected            │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const agent1 = new MissionAgent(2, 1);
  await agent1.initialize();
  await agent1.run();
  await agent1.shutdown();

  const trace1 = agent1.getTrace();

  // Count diagnosis and recovery events
  const diagnosis1 = trace1.events.filter((e) => e.eventType === 'diagnosis_generated').length;
  const recovery1 = trace1.events.filter((e) => e.eventType === 'recovery_completed').length;

  console.log(`\n📊 Results:`);
  console.log(`   Status: ${trace1.status}`);
  console.log(`   Total Events: ${trace1.events.length}`);
  console.log(`   Diagnoses: ${diagnosis1}`);
  console.log(`   Recoveries: ${recovery1}`);
  console.log(`   Ticks: ${trace1.events.filter((e) => e.eventType === 'mission_tick').length}`);

  // Scenario 2: Slightly longer mission
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ SCENARIO 2: Longer Mission Path                                │');
  console.log('│ Target: (3, 3) - Longer distance, tests adaptation             │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  const agent2 = new MissionAgent(3, 3);
  await agent2.initialize();
  await agent2.run();
  await agent2.shutdown();

  const trace2 = agent2.getTrace();

  const diagnosis2 = trace2.events.filter((e) => e.eventType === 'diagnosis_generated').length;
  const recovery2 = trace2.events.filter((e) => e.eventType === 'recovery_completed').length;

  console.log(`\n📊 Results:`);
  console.log(`   Status: ${trace2.status}`);
  console.log(`   Total Events: ${trace2.events.length}`);
  console.log(`   Diagnoses: ${diagnosis2}`);
  console.log(`   Recoveries: ${recovery2}`);
  console.log(`   Ticks: ${trace2.events.filter((e) => e.eventType === 'mission_tick').length}`);

  // Demonstrate the execution sequence
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ EXECUTION SEQUENCE (from trace)                                │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  // Show the sequence of events for scenario 2
  console.log('Example tick sequence from Scenario 2:\n');

  let tickNum = 0;
  let lastTickInLog = 0;

  for (let i = 0; i < trace2.events.length; i++) {
    const event = trace2.events[i];
    if (!event) continue;

    if (event.eventType === 'mission_tick') {
      tickNum++;
      lastTickInLog = i;
    }

    // Show representative events from first few ticks
    if (tickNum <= 2) {
      const indent = '  ';
      const arrows = '↓';

      if (event.eventType === 'mission_tick') {
        console.log(`\n[Tick ${event.data.tickNumber}] Observe → Plan → Execute → Verify`);
      } else if (
        event.eventType === 'plan_generated' ||
        event.eventType === 'plan_reused'
      ) {
        console.log(`  ${arrows} ${event.eventType}: ${event.data.stepCount} steps`);
      } else if (event.eventType === 'decision_selected') {
        console.log(`  ${arrows} Decision: ${event.data.commandActionType}`);
      } else if (event.eventType === 'command_executed') {
        console.log(`  ${arrows} Command executed: ${event.data.commandActionType}`);
      } else if (event.eventType === 'failure_detected') {
        console.log(`  ${arrows} ⚠ Failure: ${event.data.reason}`);
      } else if (event.eventType === 'diagnosis_generated') {
        console.log(`  ${arrows} 📋 Diagnosis: ${event.data.category}`);
      } else if (event.eventType === 'recovery_selected') {
        console.log(`  ${arrows} 🔧 Recovery: ${event.data.action}`);
      } else if (event.eventType === 'recovery_completed') {
        console.log(`  ${arrows} ✓ ${event.data.outcome}`);
      } else if (event.eventType === 'mission_completed') {
        console.log(`  ${arrows} ✓ Mission completed`);
      }
    }
  }

  // Summary
  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ DEMONSTRATION SUMMARY                                          │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  console.log(`Scenario 1 (Target: 2,1):`);
  console.log(`  Status: ${trace1.status === 'completed' ? '✓ COMPLETED' : '✗ FAILED'}`);
  console.log(`  Path: Manhattan distance = ${2 + 1} units`);
  console.log(`  Actual ticks: ${trace1.events.filter((e) => e.eventType === 'mission_tick').length}`);
  console.log(`  Failures detected: ${trace1.events.filter((e) => e.eventType === 'failure_detected').length}`);

  console.log(`\nScenario 2 (Target: 3,3):`);
  console.log(`  Status: ${trace2.status === 'completed' ? '✓ COMPLETED' : '✗ FAILED'}`);
  console.log(`  Path: Manhattan distance = ${3 + 3} units`);
  console.log(`  Actual ticks: ${trace2.events.filter((e) => e.eventType === 'mission_tick').length}`);
  console.log(`  Failures detected: ${trace2.events.filter((e) => e.eventType === 'failure_detected').length}`);

  console.log('\n┌────────────────────────────────────────────────────────────────┐');
  console.log('│ KEY INSIGHTS                                                   │');
  console.log('└────────────────────────────────────────────────────────────────┘\n');

  console.log('1. The agent observes the world, plans a path, and executes steps.');
  console.log('2. If a failure occurs, it DIAGNOSES the cause deterministically.');
  console.log('3. Based on diagnosis, it SELECTS a recovery action.');
  console.log('4. Recovery actions are deterministic (no randomness).');
  console.log('5. The agent ADAPTS its strategy based on the failure diagnosis.');
  console.log('6. All events are recorded in the trace for analysis and replay.');

  console.log('\n✓ Demonstration complete!\n');
}

// Run the demo
runFailureRecoveryDemo().catch((error) => {
  console.error('Demo failed:', error);
  process.exit(1);
});
