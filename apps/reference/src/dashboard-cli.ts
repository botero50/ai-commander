#!/usr/bin/env node

/**
 * Dashboard CLI: Launch the AI Commander browser dashboard.
 *
 * Usage:
 *   pnpm demo                           # Start dashboard on port 3000
 *   pnpm demo --port 3001               # Use custom port
 *   pnpm demo --target-x 10 --target-y 5  # Run mission with custom target
 *
 * Opens a browser automatically showing the live dashboard.
 */

import { DashboardServer } from './dashboard-server.js';
import { DashboardIntegration } from './dashboard-integration.js';
import { MissionAgent } from './mission-agent.js';
import open from 'open';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createCommand, createActionId, createTick } from '@ai-commander/domain';
import type { AgentRuntime } from '@ai-commander/agent-runtime';

interface CLIArgs {
  port: number;
  targetX: number;
  targetY: number;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    port: parseInt(args[args.indexOf('--port') + 1] || '3000'),
    targetX: parseInt(args[args.indexOf('--target-x') + 1] || '3'),
    targetY: parseInt(args[args.indexOf('--target-y') + 1] || '2'),
  };
}

async function main() {
  const args = parseArgs();

  console.log('🚀 AI Commander Dashboard');
  console.log('');
  console.log(`Starting dashboard on http://localhost:${args.port}`);
  console.log(`Target: (${args.targetX}, ${args.targetY})`);
  console.log('');

  // Create dashboard server
  const dashboard = new DashboardServer(args.port);
  await dashboard.start();

  console.log(`✓ Dashboard server started`);
  console.log(`✓ Opening browser...`);

  // Open browser
  try {
    await open(dashboard.getUrl());
  } catch (error) {
    console.log(`  (Could not auto-open browser. Visit ${dashboard.getUrl()} manually)`);
  }

  console.log('');
  console.log('Launching mission...');

  // Create mission agent
  const missionAgent = new MissionAgent(args.targetX, args.targetY);

  // Initialize mission
  try {
    await missionAgent.initialize();

    // Get runtime references for integration
    const runtime = (missionAgent as any).runtime as AgentRuntime;
    const trace = (missionAgent as any).tracer;
    const initialMetrics = (missionAgent as any).metrics || {
      totalDurationMs: 0,
      successfulCommands: 0,
      failedCommands: 0,
    };

    // Create integration
    const integration = new DashboardIntegration(dashboard);
    integration.initializeWithMission(missionAgent, runtime, trace, initialMetrics);

    console.log('✓ Mission initialized');
    console.log('');

    // Execution loop with dashboard integration
    let tickCount = 0;
    const maxTicks = 100;

    while (tickCount < maxTicks && !integration.shouldStopExecution()) {
      // Check for pause
      if (integration.shouldPauseExecution()) {
        process.stdout.write(`\r[Tick ${tickCount + 1}] Paused`);
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      // Execute tick
      await runtime.tick?.();
      tickCount++;

      const metrics = (missionAgent as any).metrics;
      integration.updateAfterTick(tickCount, trace, metrics);

      // Check mission completion
      if ((trace as any).status === 'completed') {
        break;
      }

      process.stdout.write(`\r[Tick ${tickCount}] Running (${Math.floor((tickCount / maxTicks) * 100)}%)`);
    }

    console.log('');
    console.log('');
    console.log('Mission completed!');
    console.log(`Total ticks: ${tickCount}`);
    console.log('');
    console.log(`Dashboard: ${dashboard.getUrl()}`);
    console.log('Press Ctrl+C to exit');

    // Keep server running
    await new Promise(() => {
      /* never resolves */
    });
  } catch (error) {
    console.error('Error during mission execution:', error);
    await dashboard.stop();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
