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
import * as fs from 'fs';
import * as path from 'path';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { WorldStateMapper } from '../rl-interface/world-state-mapper.js';
import { OllamaAIBrain } from '../rl-interface/ollama-brain.js';
import { AutomaticCameraManager } from '../camera/automatic-camera-manager.js';
import { CameraModController } from '../camera/camera-mod-controller.js';
import { EventFeed } from '../match/event-feed.js';
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
const OLLAMA_TIMEOUT = process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT, 10) : 60000; // 60 seconds for slow models

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

/**
 * Sync camera_commander mod to 0 A.D. mods directory
 */
async function syncCameraModToGame(): Promise<void> {
  try {
    // Find mod path relative to current working directory
    // When running: npx tsx packages/zeroad-adapter/src/arena/run-arena-loop.ts
    // cwd = project root, so mod is at: packages/zeroad-adapter/mods/camera_commander
    const sourceModPath = path.join(process.cwd(), 'packages/zeroad-adapter/mods/camera_commander');
    const destModDir = `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\data\\mods`;
    const destModPath = path.join(destModDir, 'camera_commander');

    logger.info('⚙️  Syncing camera_commander mod...');
    logger.debug('Source: ' + sourceModPath);
    logger.debug('Dest: ' + destModPath);

    // Check if source mod exists
    if (!fs.existsSync(sourceModPath)) {
      logger.warn('Source mod not found at: ' + sourceModPath);
      return;
    }

    // Remove old mod if it exists
    if (fs.existsSync(destModPath)) {
      try {
        fs.rmSync(destModPath, { recursive: true, force: true });
      } catch (err) {
        logger.warn('Could not remove old mod directory', { error: String(err) });
      }
    }

    // Copy mod files
    const copyDir = (src: string, dest: string) => {
      fs.mkdirSync(dest, { recursive: true });
      const files = fs.readdirSync(src);
      for (const file of files) {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);
        if (fs.statSync(srcFile).isDirectory()) {
          copyDir(srcFile, destFile);
        } else {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    };

    copyDir(sourceModPath, destModPath);
    logger.info('✓ camera_commander mod synced successfully');
  } catch (error) {
    logger.error('❌ Failed to sync camera mod', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

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
  logger.info('Starting game initialization...');

  // Sync camera mod to game directory
  logger.info('About to sync camera mod...');
  await syncCameraModToGame();
  logger.info('Camera mod sync complete');

  // Configure game before starting
  logger.info('Configuring game...');
  await configureGame();
  await sleep(500); // Let config file flush to disk

  logger.info('🟢 Starting fresh 0 A.D. instance...');

  const pyrogenesis =
    process.env.PYROGENESIS ||
    `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

  const gameProcess = spawn(pyrogenesis, [
    `--rl-interface=${RL_HOST}:${RL_PORT}`,
    '--mod=public',
    '--mod=camera_commander',  // Load camera control mod
    '-autostart=skirmishes/acropolis_bay_2p',
    '-autostart-ai=1:petra',
    '-autostart-ai=2:petra',
    '-xres=1920',           // Resolution width
    '-yres=1080',           // Resolution height
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
 * Configure 0 A.D. for maximum visibility (zoom out + camera settings)
 */
async function configureGame(): Promise<void> {
  const fs = await import('fs').then(m => m.promises);
  const path = await import('path').then(m => m.default);

  try {
    logger.info('⚙️  Configuring 0 A.D. camera settings...');

    // Get screen resolution from environment (or use default)
    // Set via: SCREEN_WIDTH=2560 SCREEN_HEIGHT=1440 npx tsx ...
    let screenWidth = parseInt(process.env.SCREEN_WIDTH || '1920', 10);
    let screenHeight = parseInt(process.env.SCREEN_HEIGHT || '1080', 10);

    const userDir = `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant`;
    const configDir = path.join(userDir, 'config');
    const configPath = path.join(configDir, 'user.cfg');

    // Create config directory if it doesn't exist
    try {
      await fs.mkdir(configDir, { recursive: true });
    } catch {
      // Directory exists
    }

    // Read existing config or create new
    let config = '';
    try {
      config = await fs.readFile(configPath, 'utf8');
    } catch {
      // File doesn't exist yet
    }

    // Ensure [view] section exists
    if (!config.includes('[view]')) {
      config += '\n[view]\n';
    }

    // Set camera zoom to maximum (zoomed out) and use native screen resolution
    const settingsList = [
      ['zoom.max = 300.0', /zoom\.max\s*=\s*[\d.]+/],
      ['zoom.default = 150.0', /zoom\.default\s*=\s*[\d.]+/],  // Start more zoomed out (150/300 = half max zoom)
      ['zoom.min = 0.0', /zoom\.min\s*=\s*[\d.]+/],            // Allow full zoom out
      [`graphics.xres = ${screenWidth}`, /graphics\.xres\s*=\s*\d+/],
      [`graphics.yres = ${screenHeight}`, /graphics\.yres\s*=\s*\d+/],
      ['graphics.windowed = false', /graphics\.windowed\s*=\s*(true|false)/],
    ] as const;

    for (const [setting, pattern] of settingsList) {
      if (config.match(pattern)) {
        config = config.replace(pattern, setting);
      } else {
        config += `${setting}\n`;
      }
    }

    // Write back config
    await fs.writeFile(configPath, config, 'utf8');
    logger.info(`✓ Game configured: fullscreen=true, resolution=${screenWidth}x${screenHeight}, zoom=max`);
  } catch (error) {
    logger.warn('Could not auto-configure camera settings', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
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

    // Initialize event feed for camera and broadcast events
    const eventFeed = new EventFeed();

    // Initialize camera controller (communicates with camera_commander mod)
    const cameraController = new CameraModController(logger);
    await cameraController.connect();

    // Initialize Ollama brain
    const brain = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: OLLAMA_TIMEOUT,
      playerID: 1,
    });

    await brain.initialize();
    logger.info(`✓ Ollama brain initialized (${OLLAMA_MODEL})\n`);

    // Initialize automatic camera manager for caster view
    let cameraStateUpdateCallback: ((state: any, prev?: any) => void) | null = null;
    let previousCameraState: any = null;

    const cameraManager = new AutomaticCameraManager(
      {
        injectCommand: async (command: any) => {
          // Execute camera commands through the mod controller
          if (command.actionType === 'camera:set-target') {
            const { x, z, duration } = command.parameters;
            await cameraController.panTo(x, z, duration || 1000);
            logger.info('🎥 Camera pan', { x, z, duration });
          }
          return null;
        },
      },
      {
        onStateUpdate: (callback: any) => {
          // Store callback to be called each tick
          cameraStateUpdateCallback = callback;
          return () => {
            cameraStateUpdateCallback = null;
          };
        },
        getCurrentGameState: () => previousCameraState,
      },
      eventFeed
    );

    cameraManager.start();
    logger.info('✓ Automatic camera manager started\n');

    // Log camera events for debugging
    eventFeed.subscribe((type: string, data: any) => {
      if (type.startsWith('camera:')) {
        logger.info(`🎥 Camera: ${type}`, data);
      }
    });

    // Get initial state
    let gameState: any = await client.step([]);
    let tick = 0;
    const maxTicks = 3600; // 1 hour max per match
    let matchWinner: string | null = null;
    const matchStartTime = Date.now();

    logger.info(`🎮 Match started - Initial game tick: ${gameState.tick || 0}`);

    // Define test camera movements (time in milliseconds since match start)
    const testPositions = [
      { time: 5000, x: 100, z: 100, label: '5s - Northwest corner' },
      { time: 10000, x: 256, z: 256, label: '10s - Center' },
      { time: 15000, x: 400, z: 100, label: '15s - Northeast' },
      { time: 30000, x: 200, z: 400, label: '30s - South' },
    ];
    let nextTestIndex = 0;

    // Set camera zoom to maximum (300) via JavaScript evaluation
    try {
      const cameraZoomCode = `
        let data = Engine.GetCameraData();
        Engine.SetCameraData(data.x, data.y, 300, data.rotX, data.rotY, 300);
      `;
      await client.evaluate(cameraZoomCode);
      logger.info('✓ Camera zoom set to maximum (300)');
    } catch (error) {
      logger.warn('Could not set camera zoom via evaluate', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

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

        // Update automatic camera to follow interesting actions
        // Convert world state to format camera manager expects
        const gameStateForCamera = {
          tick: worldState.time.currentTick.number,
          units: worldState.agents
            .filter(a => (a.customData as any)?.type === 'unit')
            .map(a => {
              const customData = a.customData as any;
              return {
                id: customData?.entityId?.toString() || '',
                owner: a.controlledByPlayerId?.toString() || '',
                position: customData?.position || { x: 0, z: 0 },
                health: customData?.health,
              };
            }),
          buildings: worldState.agents
            .filter(a => (a.customData as any)?.type === 'building')
            .map(a => {
              const customData = a.customData as any;
              return {
                id: customData?.entityId?.toString() || '',
                owner: a.controlledByPlayerId?.toString() || '',
                type: customData?.template || '',
                position: customData?.position || { x: 0, z: 0 },
              };
            }),
          players: worldState.players.map(p => ({ id: p.id, name: p.name })),
        };

        // Let camera manager process state updates (will move camera to interesting locations)
        if (cameraStateUpdateCallback) {
          cameraStateUpdateCallback(gameStateForCamera, previousCameraState);
        }
        previousCameraState = gameStateForCamera;

        // Execute test camera movements at scheduled times
        const elapsedMs = Date.now() - matchStartTime;
        while (nextTestIndex < testPositions.length && elapsedMs >= testPositions[nextTestIndex].time) {
          const test = testPositions[nextTestIndex];
          await cameraController.panTo(test.x, test.z, 2000);
          logger.info(`🎥 TEST MOVEMENT: ${test.label} (x=${test.x}, z=${test.z})`);
          eventFeed.broadcast('camera:test-movement', { label: test.label, x: test.x, z: test.z });
          nextTestIndex++;
        }

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

    // Stop camera manager and controller
    cameraManager.stop();
    cameraController.disconnect();

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
