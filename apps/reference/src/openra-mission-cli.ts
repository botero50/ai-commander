import { OpenRAMissionAgent } from './openra-mission-agent.js';
import type { OpenRAGameState } from '@ai-commander/openra-adapter';

/**
 * OpenRA Mission CLI
 *
 * Runs a deterministic autonomous mission inside OpenRA.
 *
 * Commands:
 *   npx ts-node src/openra-mission-cli.ts run [--target-x N] [--target-y N] [--json]
 *   npx ts-node src/openra-mission-cli.ts trace [--json]
 *   npx ts-node src/openra-mission-cli.ts metrics
 *   npx ts-node src/openra-mission-cli.ts replay
 *   npx ts-node src/openra-mission-cli.ts inspect
 */

interface CLIArgs {
  command: string;
  targetX: number;
  targetY: number;
  json: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  return {
    command: args[0] || 'run',
    targetX: parseInt(args[args.indexOf('--target-x') + 1] || '512'),
    targetY: parseInt(args[args.indexOf('--target-y') + 1] || '512'),
    json: args.includes('--json'),
  };
}

async function runMission(targetX: number, targetY: number): Promise<OpenRAMissionAgent> {
  // Mock OpenRA game state accessor
  const gameStateAccessor = async (): Promise<OpenRAGameState> => {
    // Create a minimal test game state
    return {
      world: {
        tick: 0,
        frameNumber: 0,
        actors: [
          {
            id: 'actor-1',
            name: 'Infantry',
            owner: 0,
            type: 'infantry',
            position: { x: 512, y: 512 },
            health: 100,
            maxHealth: 100,
          },
        ],
        players: [
          {
            index: 0,
            clientIndex: 0,
            playerName: 'Player',
            color: 0xFF00FF00,
            faction: 'gdi',
            isBot: false,
            isObserver: false,
            isAlive: true,
            teamId: -1,
            cash: 5000,
            resources: 2500,
          },
        ],
        map: {
          name: 'TestMap',
          bounds: {
            left: 0,
            top: 0,
            width: 1024,
            height: 1024,
          },
          terrain: {
            tileset: 'DESERT',
          },
        },
      },
      orderManager: {
        orderQueue: [],
        localFrameNumber: 0,
      },
      modData: {
        tileset: new Map([['DESERT', { id: 'DESERT', name: 'Desert' }]]),
      },
    };
  };

  // Mock order submitter
  const orderSubmitter = async (order: any): Promise<boolean> => {
    return true;
  };

  // Mock state checker
  const stateChecker = async (): Promise<boolean> => {
    return true;
  };

  const agent = new OpenRAMissionAgent(targetX, targetY, gameStateAccessor, orderSubmitter, stateChecker);

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
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('           OpenRA Autonomous Mission Execution');
        console.log('═══════════════════════════════════════════════════════════════');
        const agent = await runMission(args.targetX, args.targetY);

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
        const agent = await runMission(args.targetX, args.targetY);
        console.log(agent.formatTrace(args.json));
        break;
      }

      case 'metrics': {
        const agent = await runMission(args.targetX, args.targetY);
        console.log(agent.formatMetrics(args.json));
        break;
      }

      case 'replay': {
        const agent = await runMission(args.targetX, args.targetY);
        console.log(agent.formatReplayReport(args.json));
        break;
      }

      case 'inspect': {
        const agent = await runMission(args.targetX, args.targetY);
        console.log(agent.formatSnapshot(args.json));
        break;
      }

      default:
        console.log(`Unknown command: ${args.command}`);
        console.log('Available commands: run, trace, metrics, replay, inspect');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
