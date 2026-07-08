/**
 * Tournament Commands
 *
 * CLI commands for tournament management.
 */

import { TournamentRunner } from '../../tournament/tournament-runner.js';
import type { TournamentConfig, TournamentBrain } from '../../tournament/tournament-runner.js';

/**
 * Parse tournament run options
 */
export function parseTournamentOptions(args: string[]): {
  readonly brains: string[];
  readonly name: string;
  readonly format: 'round_robin' | 'single_elimination';
  readonly maxTicks: number;
  readonly replayDir: string;
  readonly parallel: number;
  readonly saveReplay: boolean;
  readonly verbose: boolean;
} {
  let format: 'round_robin' | 'single_elimination' = 'round_robin';
  const brains: string[] = ['Ollama', 'Ollama'];
  let name = `tournament-${Date.now()}`;
  let maxTicks = 5000;
  let replayDir = './tournament-replays';
  let parallel = 1;
  let saveReplay = true;
  let verbose = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--brains') {
      brains.length = 0;
      brains.push(...args[++i].split(',').map((s) => s.trim()));
    } else if (arg === '--name') {
      name = args[++i];
    } else if (arg === '--format') {
      const fmt = args[++i];
      if (fmt === 'round_robin' || fmt === 'single_elimination') {
        format = fmt;
      }
    } else if (arg === '--max-ticks') {
      maxTicks = parseInt(args[++i], 10);
    } else if (arg === '--replay-dir') {
      replayDir = args[++i];
    } else if (arg === '--parallel') {
      parallel = parseInt(args[++i], 10);
    } else if (arg === '--no-replay') {
      saveReplay = false;
    } else if (arg === '--verbose') {
      verbose = true;
    } else if (arg === '--help') {
      showTournamentHelp();
      process.exit(0);
    }
  }

  return { brains, name, format, maxTicks, replayDir, parallel, saveReplay, verbose };
}

/**
 * Show tournament help text
 */
export function showTournamentHelp(): void {
  console.log('Usage: ai-commander tournament run [options]');
  console.log('');
  console.log('Run a tournament between multiple AI brains.');
  console.log('');
  console.log('Options:');
  console.log('  --brains <names>     Comma-separated brain names (required)');
  console.log('  --name <name>        Tournament name (auto-generated if not specified)');
  console.log('  --format <format>    round_robin or single_elimination (default: round_robin)');
  console.log('  --max-ticks <number> Maximum ticks per match (default: 5000)');
  console.log('  --replay-dir <path>  Replay directory (default: ./tournament-replays)');
  console.log('  --parallel <n>       Parallel matches (default: 1)');
  console.log('  --no-replay          Do not save replays');
  console.log('  --verbose            Enable verbose logging');
  console.log('  --help               Show this help text');
  console.log('');
  console.log('Example:');
  console.log('  ai-commander tournament run --brains "Ollama,Ollama"');
}

/**
 * Tournament run command handler
 */
export async function tournamentRunCommand(args: string[]): Promise<number> {
  const options = parseTournamentOptions(args);

  console.log('Starting tournament...');
  console.log(`  Name: ${options.name}`);
  console.log(`  Brains: ${options.brains.join(', ')}`);
  console.log(`  Format: ${options.format}`);
  console.log(`  Max ticks: ${options.maxTicks}`);
  console.log(`  Replay dir: ${options.replayDir}`);
  console.log('');

  // Create tournament config
  const brainConfig: TournamentBrain[] = options.brains.map((name, i) => ({
    id: `brain-${i}`,
    name,
    version: '1.0.0',
    brain: null as any, // Would be real brain in production
  }));

  const config: TournamentConfig = {
    name: options.name,
    brains: brainConfig,
    matchFormat: options.format,
    maxTicks: options.maxTicks,
  };

  // Create runner
  const runner = new TournamentRunner(config);

  try {
    console.log('Executing tournament...');
    runner.start();

    // Simulate tournament execution
    const matchPairs = runner.generateRoundRobinMatches();
    console.log(`Scheduling ${matchPairs.length} matches...`);
    console.log('');

    // Note: Real implementation would execute matches here
    // For now, just show the structure
    let matchNum = 1;
    for (const [brain1, brain2] of matchPairs) {
      console.log(`Match ${matchNum}: ${brain1.name} vs ${brain2.name}`);
      matchNum++;
    }

    runner.end();
    const results = runner.getResults();

    console.log('');
    console.log('Tournament completed!');
    console.log(`  Total matches: ${results.totalMatches}`);
    console.log(`  Completed: ${results.completedMatches}`);
    console.log(`  Duration: ${(results.duration / 1000).toFixed(2)}s`);

    // Show rankings
    console.log('');
    console.log('Final Rankings:');
    console.log('');

    const rankings = results.rankings;
    for (let i = 0; i < Math.min(5, rankings.length); i++) {
      const rank = rankings[i];
      console.log(
        `${i + 1}. ${rank.name.padEnd(20)} | Wins: ${rank.wins} | Losses: ${rank.losses} | Draw: ${rank.draws}`
      );
    }

    return 0;
  } catch (err) {
    console.error(`Error: Tournament execution failed: ${err}`);
    return 1;
  }
}

/**
 * Tournament status command handler
 */
export async function tournamentStatusCommand(args: string[]): Promise<number> {
  if (args.length === 0) {
    console.error('Error: Tournament ID required');
    console.error('Usage: ai-commander tournament status <tournament-id>');
    return 1;
  }

  const tournamentId = args[0];
  console.log(`Tournament Status: ${tournamentId}`);
  console.log('(Status tracking would be implemented in production)');
  return 0;
}

/**
 * Tournament list command handler
 */
export async function tournamentListCommand(args: string[]): Promise<number> {
  console.log('Active Tournaments:');
  console.log('(Tournament persistence would be implemented in production)');
  console.log('');
  console.log('No tournaments running.');
  return 0;
}
