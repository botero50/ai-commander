/**
 * Arena CLI Entry Point
 *
 * Run the continuous AI Commander arena.
 *
 * Usage:
 *   npx ts-node src/arena/run-arena.ts [--matches N] [--timeout SECONDS]
 *
 * Examples:
 *   npx ts-node src/arena/run-arena.ts              # Run forever
 *   npx ts-node src/arena/run-arena.ts --matches 10 # Run 10 matches
 *   npx ts-node src/arena/run-arena.ts --timeout 1800 # 30 min per match
 */

import { ArenaController, type ArenaConfig } from './arena-controller.js';
import { Logger } from '../config/logger.js';

// Parse CLI arguments
const args = process.argv.slice(2);
let maxMatches = 0; // 0 = infinite
let matchTimeoutSeconds = 3600; // 1 hour default

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--matches' && i + 1 < args.length) {
    maxMatches = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--timeout' && i + 1 < args.length) {
    matchTimeoutSeconds = parseInt(args[i + 1], 10);
    i++;
  }
}

// Configure arena
const logger = new Logger('info', 'ArenaRunner');

const config: ArenaConfig = {
  maxMatches,
  matchTimeoutSeconds,
  recoveryAttempts: 3,
  players: [
    {
      name: 'Ollama Brain',
      aiModel: 'neural-rts',
      aiPrompt:
        'You are an expert RTS strategist. Analyze game state and issue optimal commands. Focus on economy early, military mid-game, and overwhelming force late-game.',
    },
    {
      name: 'Claude Brain',
      aiModel: 'claude-opus-4-8',
      aiPrompt:
        'You control an RTS faction. Build a strong economy, scout enemies, and execute coordinated attacks. Adapt your strategy to opponent behavior.',
    },
  ],
};

logger.info('🎮 AI COMMANDER ARENA LAUNCHER', {
  maxMatches: maxMatches || 'INFINITE',
  matchTimeoutSeconds,
});

// Run arena
const arena = new ArenaController(config, logger);

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('⏹️  Shutdown signal received, stopping arena gracefully...');
  arena.stop();
});

process.on('SIGTERM', () => {
  logger.info('⏹️  Termination signal received, stopping arena gracefully...');
  arena.stop();
});

// Start the arena
(async () => {
  try {
    await arena.run();
    logger.info('✅ Arena completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('💥 Arena failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
})();
