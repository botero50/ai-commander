/**
 * CLI Entry Point
 *
 * Main entry point for the AI Commander CLI application.
 */

import { CLI } from './cli.js';
import { matchStartCommand } from './commands/match-start.js';
import { tournamentRunCommand, tournamentStatusCommand, tournamentListCommand } from './commands/tournament-commands.js';

/**
 * Create and configure CLI application
 */
function createCLI(): CLI {
  const cli = new CLI();

  // Register match commands
  cli.register({
    name: 'match:start',
    description: 'Start a match between two AI brains',
    handler: matchStartCommand,
  });

  // Register tournament commands
  cli.register({
    name: 'tournament:run',
    description: 'Run a tournament between multiple AI brains',
    handler: tournamentRunCommand,
  });

  cli.register({
    name: 'tournament:status',
    description: 'Show tournament status',
    handler: tournamentStatusCommand,
  });

  cli.register({
    name: 'tournament:list',
    description: 'List all tournaments',
    handler: tournamentListCommand,
  });

  return cli;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const cli = createCLI();
  const exitCode = await cli.run(process.argv);
  process.exit(exitCode);
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { createCLI };
