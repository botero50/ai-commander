#!/usr/bin/env node

/**
 * AI Commander Arena — Complete Automated Loop
 *
 * For each match:
 * 1. Kill any running 0 A.D. process
 * 2. Start fresh 0 A.D. with RL Interface
 * 3. Run match until one AI wins
 * 4. Close the game
 * 5. Repeat
 *
 * Usage:
 *   npx tsx src/arena/run-arena-loop.ts [--matches N]
 *
 * Examples:
 *   npx tsx src/arena/run-arena-loop.ts              # Run forever
 *   npx tsx src/arena/run-arena-loop.ts --matches 10 # Run 10 matches
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { WorldStateMapper } from '../rl-interface/world-state-mapper.js';
import { OllamaAIBrain } from '../rl-interface/ollama-brain.js';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const GAME_STARTUP_WAIT = process.env.STARTUP_WAIT ? parseInt(process.env.STARTUP_WAIT, 10) : 5000; // Wait 5 seconds for game to start (override with STARTUP_WAIT env var)
const RL_CONNECT_TIMEOUT = 30000; // Try to connect for 30 seconds

// Model options (from fastest to most capable):
// - 'tinyllama:latest'     - Fastest (637MB) - recommended for speed
// - 'mistral:latest'       - Fast (4.1GB) - balanced
// - 'neural-chat:latest'   - Slower (4.1GB) - most capable
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'tinyllama:latest'; // Use tinyllama for speed by default

// Parse CLI arguments
const args = process.argv.slice(2);
let maxMatches = 0; // 0 = infinite
let decisionFrequency = 1; // Make decision every N ticks (1 = every tick, 5 = every 5 ticks = faster)
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--matches' && i + 1 < args.length) {
    maxMatches = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--freq' && i + 1 < args.length) {
    decisionFrequency = parseInt(args[i + 1], 10);
    i++;
  }
}

const logger = new Logger('info', 'ArenaLoop');

interface ArenaStats {
  matchesCompleted: number;
  matchesFailed: number;
  wins: { [key: string]: number };
}

const stats: ArenaStats = {
  matchesCompleted: 0,
  matchesFailed: 0,
  wins: {},
};

// Track pending AI requests to avoid AbortError on shutdown
let pendingAIRequests = 0;
const MAX_WAIT_FOR_PENDING = 5000; // Wait max 5 seconds for pending requests

/**
 * Wait for pending AI requests to complete
 */
async function waitForPendingRequests(): Promise<void> {
  const startTime = Date.now();
  while (pendingAIRequests > 0 && Date.now() - startTime < MAX_WAIT_FOR_PENDING) {
    await sleep(100);
  }
  if (pendingAIRequests > 0) {
    logger.warn(`⏳ Shutdown timeout - ${pendingAIRequests} AI requests still pending`);
  }
}

/**
 * Kill all running pyrogenesis processes
 */
async function killGame(): Promise<void> {
  try {
    logger.info('🔴 Killing any running 0 A.D. processes...');
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM pyrogenesis.exe 2>nul');
    } else {
      await execAsync('pkill -9 pyrogenesis');
    }
    logger.info('✓ Processes killed');
    await sleep(2000); // Wait for cleanup
  } catch (error) {
    logger.warn('No running processes or kill failed (this is OK)');
  }
}

/**
 * Start a fresh 0 A.D. instance with RL Interface
 */
async function startGame(): Promise<ChildProcess> {
  logger.info('🟢 Starting fresh 0 A.D. instance...');

  const pyrogenesis =
    process.env.PYROGENESIS ||
    `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

  const gameProcess = spawn(pyrogenesis, [
    `--rl-interface=${RL_HOST}:${RL_PORT}`,
    '--mod=public',
    '-autostart=skirmishes/acropolis_bay_2p',
    '-autostart-ai=1:petra',
    '-autostart-ai=2:petra',
  ]);

  gameProcess.on('error', error => {
    logger.error('Game process error:', error);
  });

  gameProcess.on('exit', code => {
    logger.info(`Game process exited with code ${code}`);
  });

  // Wait for game to start
  logger.info(`⏳ Waiting ${GAME_STARTUP_WAIT / 1000}s for game to start...`);
  await sleep(GAME_STARTUP_WAIT);

  return gameProcess;
}

/**
 * Wait for RL Interface to be ready
 */
async function waitForRLInterface(timeoutMs: number = RL_CONNECT_TIMEOUT): Promise<boolean> {
  const startTime = Date.now();
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 5000, logger);

  logger.info('📡 Waiting for RL Interface to be ready...');

  while (Date.now() - startTime < timeoutMs) {
    try {
      const state = await client.step([]);
      if (state) {
        logger.info('✓ RL Interface is ready');
        return true;
      }
    } catch (error) {
      // Still waiting
      await sleep(1000);
    }
  }

  logger.error('❌ RL Interface failed to start');
  return false;
}

/**
 * Run a single match
 */
async function runMatch(gameProcess: ChildProcess, matchNumber: number): Promise<boolean> {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Match ${matchNumber} - Connecting to game...`);
    logger.info(`${'='.repeat(60)}\n`);

    // Wait for RL Interface to be ready
    const ready = await waitForRLInterface();
    if (!ready) {
      logger.error('Failed to connect to RL Interface');
      return false;
    }

    const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
    const worldStateMapper = new WorldStateMapper(logger);

    // Initialize Ollama brain
    const brain = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: 30000,
      playerID: 1,
    });

    await brain.initialize();
    logger.info(`✓ Ollama brain initialized (${OLLAMA_MODEL})\n`);

    // Get initial state
    let gameState: any = await client.step([]);
    let tick = 0;
    const maxTicks = 3600; // 1 hour max per match
    let matchWinner: string | null = null;

    logger.info(`🎮 Match started - Initial game tick: ${gameState.tick || 0}`);

    // Main match loop
    while (tick < maxTicks && !matchWinner) {
      try {
        // Map raw game state to world state using the same mapper as test-r3-dual-ollama
        gameState = await client.step([]);
        const worldState = worldStateMapper.mapObservationToWorldState(gameState);

        if (!worldState) {
          logger.error('Failed to map world state');
          break;
        }

        // Get unit counts
        const playerUnits = worldState.agents.filter(
          a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
        ).length;
        const enemyUnits = worldState.agents.filter(
          a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2'
        ).length;

        // Check win conditions
        if (playerUnits === 0) {
          matchWinner = 'enemy (Petra AI)';
          logger.info('❌ All player units lost - ENEMY WINS');
          break;
        }

        if (enemyUnits === 0) {
          matchWinner = 'player (Ollama)';
          logger.info('✅ Enemy defeated - PLAYER WINS');
          break;
        }

        // Get decision from brain only every N ticks (for speed)
        // Fire-and-forget: Send commands as soon as AI responds, don't wait
        if (tick % decisionFrequency === 0) {
          pendingAIRequests++;
          brain.decide(worldState)
            .then(decision => {
              if (decision.commands && decision.commands.length > 0) {
                // Send commands immediately without waiting
                client.step(decision.commands).catch(err => {
                  logger.error('Failed to send AI commands', {
                    error: err instanceof Error ? err.message : String(err),
                  });
                });
              }
            })
            .catch(err => {
              logger.error('Brain decision failed', {
                tick,
                error: err instanceof Error ? err.message : String(err),
              });
            })
            .finally(() => {
              pendingAIRequests--;
            });
        }

        // Step game state without waiting for AI decision
        gameState = await client.step([]);

        tick++;

        // Log progress every 100 ticks
        if (tick % 100 === 0) {
          logger.info(`  [Tick ${tick}] Ollama: ${playerUnits} units | Petra: ${enemyUnits} units`);
        }
      } catch (tickError) {
        logger.error(`Tick ${tick} failed`, {
          error: tickError instanceof Error ? tickError.message : String(tickError),
        });
        break;
      }
    }

    if (matchWinner) {
      stats.matchesCompleted++;
      stats.wins[matchWinner] = (stats.wins[matchWinner] || 0) + 1;
      logger.info(
        `\n✅ MATCH ${matchNumber} COMPLETE - Winner: ${matchWinner} (${tick} ticks / ~${Math.round(tick / 10)}s)`
      );
      return true;
    } else {
      stats.matchesFailed++;
      logger.warn(`\n⏱️  MATCH ${matchNumber} TIMEOUT at ${tick} ticks`);
      return false;
    }
  } catch (error) {
    stats.matchesFailed++;
    logger.error(`💥 MATCH ${matchNumber} FAILED`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Sleep for N milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main loop
 */
async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       AI COMMANDER ARENA — AUTOMATED MATCH LOOP            ║');
  console.log('║    Ollama vs Petra AI (Auto-restart after each match)      ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  logger.info('🎮 ARENA STARTED', {
    maxMatches: maxMatches || 'INFINITE',
    rlInterface: `${RL_HOST}:${RL_PORT}`,
  });

  let matchNumber = 1;

  try {
    while (matchNumber <= (maxMatches || Infinity)) {
      // Kill any running game
      await killGame();

      // Start fresh game
      const gameProcess = await startGame();

      // Run the match
      const success = await runMatch(gameProcess, matchNumber);

      // Wait for pending AI requests before killing game
      if (pendingAIRequests > 0) {
        logger.info(`⏳ Waiting for ${pendingAIRequests} pending AI requests...`);
        await waitForPendingRequests();
      }

      // Kill the game after match
      await killGame();

      // Wait before next match
      if (matchNumber < (maxMatches || Infinity)) {
        logger.info(`⏳ Preparing match ${matchNumber + 1} in 5 seconds...\n`);
        await sleep(5000);
      }

      matchNumber++;
    }
  } catch (error) {
    logger.error('💥 ARENA FATAL ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    // Ensure game is killed on exit
    await killGame();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                  🎮 ARENA COMPLETE 🎮                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    logger.info('📊 FINAL STATISTICS', {
      matchesCompleted: stats.matchesCompleted,
      matchesFailed: stats.matchesFailed,
      wins: stats.wins,
    });
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n⏹️  Shutdown requested - cleaning up and stopping...');
  await waitForPendingRequests();
  await killGame();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n⏹️  Termination requested - cleaning up and stopping...');
  await waitForPendingRequests();
  await killGame();
  process.exit(0);
});

main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});
