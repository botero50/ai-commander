/* eslint-disable no-undef */

/**
 * OpenRA Mission CLI with Integration Host
 *
 * Demonstrates complete OpenRA integration using OpenRA-RL service.
 *
 * Usage:
 *   # Run a mission to target (512, 512)
 *   pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run
 *
 *   # Run mission with custom target
 *   pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts run --target-x 600 --target-y 600
 *
 *   # Display trace only
 *   pnpm --filter reference exec ts-node src/openra-mission-with-integration-host-cli.ts trace
 *
 * Before running, ensure OpenRA-RL is available:
 *   # Using Docker
 *   docker run -p 8000:8000 -p 9999:9999 openra-rl
 *
 *   # Or locally
 *   openra-rl server start
 */

import { OpenRAMissionAgent } from './openra-mission-agent.js';
import {
  OpenRAIntegrationHost,
  createOpenRAIntegrationHost,
} from './openra-rl-integration-host.js';

interface CLIArgs {
  command: string;
  targetX: number;
  targetY: number;
  json: boolean;
  openraUrl: string;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    command: args[0] || 'run',
    targetX: parseInt(args[args.indexOf('--target-x') + 1] || '512'),
    targetY: parseInt(args[args.indexOf('--target-y') + 1] || '512'),
    json: args.includes('--json'),
    openraUrl: args[args.indexOf('--openra-url') + 1] || 'http://localhost:8000',
  };
}

async function runMission(
  targetX: number,
  targetY: number,
  openraUrl: string
): Promise<OpenRAMissionAgent> {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('       OpenRA Autonomous Mission with Integration Host');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Create and initialize integration host
  console.log('Step 1: Initializing OpenRA-RL Integration Host');
  console.log('───────────────────────────────────────────────────────────────');
  let host: OpenRAIntegrationHost;
  try {
    host = await createOpenRAIntegrationHost({
      baseUrl: openraUrl,
      timeout: 5000,
      verbose: true,
    });
  } catch (error) {
    console.error('\n✗ Failed to initialize integration host:');
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);
    console.error('\nEnsure OpenRA-RL is running:');
    console.error('  Docker: docker run -p 8000:8000 -p 9999:9999 openra-rl');
    console.error('  Local:  openra-rl server start');
    throw error;
  }

  // Step 2: Create callbacks from integration host
  console.log('\nStep 2: Creating Adapter Callbacks');
  console.log('───────────────────────────────────────────────────────────────');
  const callbacks = host.createCallbacks();
  host.logCallbackRegistration();

  // Step 3: Create and run mission agent
  console.log('\nStep 3: Starting Mission Agent');
  console.log('───────────────────────────────────────────────────────────────');
  const agent = new OpenRAMissionAgent(
    targetX,
    targetY,
    callbacks.gameStateAccessor,
    callbacks.orderSubmitter,
    callbacks.stateChecker
  );

  console.log(`Mission: Move unit to target (${targetX}, ${targetY})\n`);

  await agent.initialize();
  await agent.run();
  await agent.shutdown();

  return agent;
}

async function main(): Promise<void> {
  const args = parseArgs();

  try {
    switch (args.command) {
      case 'run': {
        const agent = await runMission(args.targetX, args.targetY, args.openraUrl);

        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('                    MISSION METRICS');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(agent.formatMetrics(args.json));

        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('                   EXECUTION TRACE');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(agent.formatTrace(args.json));

        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('                  REPLAY VALIDATION');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(agent.formatReplayReport(args.json));

        console.log('\n───────────────────────────────────────────────────────────────');
        console.log('                 RUNTIME SNAPSHOT');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(agent.formatSnapshot(args.json));

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('                  ✓ Mission Complete');
        console.log('═══════════════════════════════════════════════════════════════\n');
        break;
      }

      case 'trace': {
        const agent = await runMission(args.targetX, args.targetY, args.openraUrl);
        console.log(agent.formatTrace(args.json));
        break;
      }

      case 'metrics': {
        const agent = await runMission(args.targetX, args.targetY, args.openraUrl);
        console.log(agent.formatMetrics(args.json));
        break;
      }

      case 'replay': {
        const agent = await runMission(args.targetX, args.targetY, args.openraUrl);
        console.log(agent.formatReplayReport(args.json));
        break;
      }

      case 'inspect': {
        const agent = await runMission(args.targetX, args.targetY, args.openraUrl);
        console.log(agent.formatSnapshot(args.json));
        break;
      }

      default:
        console.log(`Unknown command: ${args.command}`);
        console.log('Available commands: run, trace, metrics, replay, inspect');
        console.log('\nOptions:');
        console.log('  --target-x <N>     Target X coordinate (default: 512)');
        console.log('  --target-y <N>     Target Y coordinate (default: 512)');
        console.log('  --openra-url <URL> OpenRA-RL service URL (default: http://localhost:8000)');
        console.log('  --json              Output in JSON format');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
