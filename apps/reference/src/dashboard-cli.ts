#!/usr/bin/env node

/**
 * AI Commander Demo CLI
 *
 * One command to experience AI Commander.
 *
 * Usage:
 *   pnpm demo                           # Start demo on port 3000
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
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CLIArgs {
  port: number;
  targetX: number;
  targetY: number;
  tickDelayMs: number;
}

interface PrerequisiteStatus {
  nodeVersion: boolean;
  docker: boolean;
  openraRl: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const getArg = (flag: string, defaultVal: string): number => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? parseInt(args[idx + 1] || defaultVal) : parseInt(defaultVal);
  };
  return {
    port: getArg('--port', '3000'),
    targetX: getArg('--target-x', '3'),
    targetY: getArg('--target-y', '2'),
    tickDelayMs: getArg('--tick-delay', '10'), // 10ms per tick keeps UI responsive
  };
}

async function checkNodeVersion(): Promise<boolean> {
  try {
    const version = process.versions.node || '';
    const majorVersion = parseInt(version.split('.')[0] || '0', 10);
    return majorVersion >= 22;
  } catch {
    return false;
  }
}

async function checkDocker(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch {
    return false;
  }
}

async function checkOpenRARL(): Promise<boolean> {
  try {
    // For this demo, we're using FakeGameAdapter, so OpenRA-RL is optional
    // In a real scenario, we'd check if the service is running on a specific port
    return true;
  } catch {
    return false;
  }
}

async function verifyPrerequisites(): Promise<PrerequisiteStatus> {
  console.log('Verifying prerequisites...');
  console.log('');

  const nodeVersion = await checkNodeVersion();
  const docker = await checkDocker();
  const openraRl = await checkOpenRARL();

  if (nodeVersion) {
    console.log('✓ Node.js 22+ detected');
  } else {
    console.log('✗ Node.js 22+ required');
    console.log('  Install from: https://nodejs.org/');
  }

  if (docker) {
    console.log('✓ Docker detected');
  } else {
    console.log('⊙ Docker not found (optional for this demo)');
    console.log('  Install from: https://www.docker.com/');
  }

  if (openraRl) {
    console.log('✓ OpenRA-RL availability verified');
  }

  console.log('');

  if (!nodeVersion) {
    console.log('Error: Node.js 22+ is required');
    process.exit(1);
  }

  return { nodeVersion, docker, openraRl };
}

async function main() {
  const args = parseArgs();

  // Welcome message
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║        AI Commander - Autonomous Game AI           ║');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');

  // Verify prerequisites
  const prerequisites = await verifyPrerequisites();

  // Dashboard startup
  console.log('Initializing...');

  // Create dashboard server
  const dashboard = new DashboardServer(args.port);
  await dashboard.start();
  console.log(`✓ Dashboard server started on port ${args.port}`);
  console.log('');

  // Open browser
  console.log('Opening browser...');
  try {
    await open(dashboard.getUrl());
    console.log(`✓ Browser launched`);
  } catch (error) {
    console.log(`⊙ Could not auto-open browser`);
    console.log(`  Visit: ${dashboard.getUrl()}`);
  }

  console.log('');
  console.log(`Starting mission (target: ${args.targetX}, ${args.targetY})...`);
  console.log('');

  // Create mission agent
  const missionAgent = new MissionAgent(args.targetX, args.targetY);

  // Set tick delay if specified
  if (args.tickDelayMs > 0) {
    missionAgent.setTickDelay(args.tickDelayMs);
  }

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

    // Register integration callback with mission agent for real-time dashboard updates
    missionAgent.setDashboardIntegration(integration);

    console.log('✓ Mission initialized');
    console.log('');
    console.log('Mission Running');
    console.log('');

    // Wait for browser to connect to dashboard stream
    await new Promise((resolve) => setTimeout(resolve, 500));

    const startTime = Date.now();

    // Run the mission - this handles all the ticks and trace recording
    await missionAgent.run();

    const elapsedMs = Date.now() - startTime;
    const tickCount = (missionAgent as any).currentTick || 0;

    console.log('');
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║        Mission Completed Successfully!             ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`Execution Time: ${elapsedMs}ms`);
    console.log(`Total Ticks: ${tickCount}`);
    console.log('');
    console.log('Dashboard:');
    console.log(`  ${dashboard.getUrl()}`);
    console.log('');
    console.log('Actions:');
    console.log('  • Click timeline events to inspect ticks');
    console.log('  • Use navigation buttons to step through execution');
    console.log('  • Resume live execution to watch real-time updates');
    console.log('');
    console.log('Press Ctrl+C to exit');

    // Keep server running
    await new Promise(() => {
      /* never resolves */
    });
  } catch (error) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════╗');
    console.error('║        Mission Failed                             ║');
    console.error('╚════════════════════════════════════════════════════╝');
    console.error('');
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error('');
        console.error('Stack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(`Error: ${String(error)}`);
    }
    console.error('');
    await dashboard.stop();
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
