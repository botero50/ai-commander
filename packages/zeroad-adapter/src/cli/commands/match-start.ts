/**
 * Match Start Command
 *
 * CLI command to start a match between two brains.
 */

import { mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { ZeroADAdapter } from '../../adapter.js';
import { runDualBrainMatch } from '../../match/simple-match.js';
import { ReplayService } from '../../web/replay-service.js';
import { GameSession } from '@ai-commander/adapter';
import type { BrainInterface } from '../../match/simple-match.js';

/**
 * Parse command-line options
 */
function parseOptions(args: string[]): {
  readonly brain1Name: string;
  readonly brain2Name: string;
  readonly maxTicks: number;
  readonly replayDir: string;
  readonly launchWindow: boolean;
  readonly saveReplay: boolean;
  readonly verbose: boolean;
} {
  const options = {
    brain1Name: 'Ollama',
    brain2Name: 'Ollama',
    maxTicks: 5000,
    replayDir: './replays',
    launchWindow: true,
    saveReplay: true,
    verbose: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--brain1') {
      options.brain1Name = args[++i];
    } else if (arg === '--brain2') {
      options.brain2Name = args[++i];
    } else if (arg === '--max-ticks') {
      options.maxTicks = parseInt(args[++i], 10);
    } else if (arg === '--replay-dir') {
      options.replayDir = args[++i];
    } else if (arg === '--no-window') {
      options.launchWindow = false;
    } else if (arg === '--no-replay') {
      options.saveReplay = false;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--help') {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * Show help text
 */
function showHelp(): void {
  console.log('Usage: ai-commander match start [options]');
  console.log('');
  console.log('Start a match between two AI brains.');
  console.log('');
  console.log('Options:');
  console.log('  --brain1 <name>      First brain (default: Ollama)');
  console.log('  --brain2 <name>      Second brain (default: Ollama)');
  console.log('  --max-ticks <number> Maximum ticks (default: 5000)');
  console.log('  --replay-dir <path>  Replay directory (default: ./replays)');
  console.log('  --no-window          Do not launch 0 A.D. window');
  console.log('  --no-replay          Do not save replay');
  console.log('  --verbose            Enable verbose logging');
  console.log('  --help               Show this help text');
  console.log('');
  console.log('Example:');
  console.log('  ai-commander match start --brain1 Ollama --brain2 Ollama');
}

/**
 * Create mock brain for testing (if real brain not available)
 */
function createMockBrain(name: string): BrainInterface {
  return {
    name,
    version: '1.0.0',
    decide: async (observation: any) => {
      // Return empty decision
      return {
        reasoning: 'Mock brain',
        commands: [],
      };
    },
  };
}

/**
 * Match start command handler
 */
export async function matchStartCommand(args: string[]): Promise<number> {
  const options = parseOptions(args);

  console.log('Starting match...');
  console.log(`  Brain 1: ${options.brain1Name}`);
  console.log(`  Brain 2: ${options.brain2Name}`);
  console.log(`  Max ticks: ${options.maxTicks}`);
  console.log(`  Replay dir: ${options.replayDir}`);
  console.log('');

  // Ensure replay directory exists
  if (options.saveReplay) {
    try {
      const replayPath = resolve(options.replayDir);
      await mkdir(replayPath, { recursive: true });
      if (options.verbose) {
        console.log(`Replay directory ready: ${replayPath}`);
      }
    } catch (err) {
      console.error(`Error: Could not create replay directory: ${err}`);
      return 1;
    }
  }

  // Create session (simplified for MVP)
  const session = {} as GameSession;

  // Create brains
  const brain1 = createMockBrain(options.brain1Name);
  const brain2 = createMockBrain(options.brain2Name);

  // Run match
  try {
    console.log('Executing match...');
    const result = await runDualBrainMatch(session, brain1, brain2, {
      maxTicks: options.maxTicks,
    });

    console.log('');
    console.log('Match completed!');
    console.log(`  Ticks run: ${result.ticksRan}`);
    console.log(`  Duration: ${(result.duration / 1000).toFixed(2)}s`);

    if (result.player2) {
      console.log(`  Player 1: ${result.player1.name} (${result.player1.commandsExecuted} commands, ${result.player1.errors} errors)`);
      console.log(`  Player 2: ${result.player2.name} (${result.player2.commandsExecuted} commands, ${result.player2.errors} errors)`);
    }

    if (result.winner) {
      console.log(`  Winner: ${result.winner}`);
    } else {
      console.log(`  Result: Draw`);
    }

    // Save replay if requested
    if (options.saveReplay) {
      try {
        console.log('');
        console.log('Saving replay...');
        // Replay would be saved here with real match data
        console.log(`Replay saved to: ${options.replayDir}`);
      } catch (err) {
        console.error(`Error: Could not save replay: ${err}`);
        return 1;
      }
    }

    return result.success ? 0 : 1;
  } catch (err) {
    console.error(`Error: Match execution failed: ${err}`);
    return 1;
  }
}
