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
import { CameraBroadcastServer } from '../broadcast/camera-broadcast-server.js';
import { CameraController } from '../rl-interface/camera-controller.js';
import { GameCheats } from '../rl-interface/game-cheats.js';
import { EventFeed } from '../match/event-feed.js';
import { Logger } from '../config/logger.js';
import { MapDiscovery } from '../match/map-discovery.js';
import { MatchRotation } from '../match/match-rotation.js';
import { CivilizationRotation } from '../match/civilization-rotation.js';
import { TrashTalkGenerator, type GameContext } from '../match/trash-talk-generator.js';
import { EventBasedCamera } from '../camera/event-based-camera.js';
import { BroadcastState, type ArenaMatchContext } from '../broadcast/broadcast-state.js';

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

// Initialize map discovery and rotation
const mapDiscovery = new MapDiscovery(logger);
const civRotation = new CivilizationRotation(logger);
const matchRotation = new MatchRotation(
  {
    mapBlacklistSize: 3, // Don't repeat same map in last 3 matches
    civBlacklistSize: 2, // Don't repeat same civ pair in last 2 matches
    maxHistorySize: 144, // Keep ~1 day of history
  },
  logger
);

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
async function startGame(matchNumber: number): Promise<{ process: ChildProcess; map: string }> {
  logger.info('Starting game initialization...');

  // Discover and select map for this match
  let selectedMap = 'skirmishes/acropolis_bay_2p'; // fallback
  try {
    const blacklist = matchRotation.getMapBlacklist();
    const mapInfo = await mapDiscovery.getRandomMapAvoidingBlacklist(blacklist, 2);
    selectedMap = mapInfo.filePath;

    logger.info(`📍 Selected map for match ${matchNumber}: ${selectedMap} (${mapInfo.displayName})`);
  } catch (error) {
    logger.warn('Failed to select map, using default', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Track civilization selection for rotation (display only, using petra AI)
  const selectedCiv = civRotation.getRandomCivilization();
  logger.info(`🏛️  Selected for rotation: ${selectedCiv.displayName} (match uses petra AI)`);

  // TODO: Sync camera mod when it's working properly
  // await syncCameraModToGame();

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
    '--mod=camera_commander',  // Enable remote camera control
    // '--mod=bigger-minimap',  // TODO: Mod compatibility issue - disabled for now
    `-autostart=${selectedMap}`,
    '-autostart-ai=1:petra',  // Petra fallback for P1 (Ollama commands override when sent)
    '-autostart-ai=2:petra',  // Petra fallback for P2 (Ollama commands override when sent)
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

  return { process: gameProcess, map: selectedMap };
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
async function runMatch(gameProcess: ChildProcess, matchNumber: number, mapUsed: string): Promise<boolean> {
  try {
    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Match ${matchNumber} - Connecting to game...`);
    logger.info(`Map: ${mapUsed}`);
    logger.info(`${'='.repeat(60)}\n`);

    // Wait for RL Interface to be ready
    const ready = await waitForRLInterface();
    if (!ready) {
      logger.error('Failed to connect to RL Interface');
      return false;
    }

    const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
    const worldStateMapper = new WorldStateMapper(logger);
    const gameCheats = new GameCheats(client, logger);

    // Initialize event feed for camera and broadcast events
    const eventFeed = new EventFeed();

    // Initialize trash talk generator with chat callback
    const trashTalkGenerator = new TrashTalkGenerator(
      logger,
      undefined,
      undefined,
      async (message: string) => {
        await gameCheats.sendChatMessage(message);
      }
    );

    // Initialize camera controller (communicates with RL Interface)
    const cameraController = new CameraModController(logger, client);
    cameraController.setRLClient(client);
    await cameraController.connect();

    // Initialize event-based camera for automatic tracking (pass RL client so it can get camera position)
    const eventCamera = new EventBasedCamera(logger, client);

    // Initialize camera broadcast server for external tools
    const cameraBroadcast = new CameraBroadcastServer(logger, 3001);
    await cameraBroadcast.start();

    // Initialize Ollama brains for BOTH players
    let brainP1: OllamaAIBrain | null = null;
    let brainP2: OllamaAIBrain | null = null;

    try {
      brainP1 = new OllamaAIBrain(logger, {
        modelName: OLLAMA_MODEL,
        baseUrl: 'http://localhost:11434',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        numPredict: 256,
        timeout: OLLAMA_TIMEOUT,
        playerID: 1,
      });

      await brainP1.initialize();
      logger.info(`✓ Ollama brain P1 initialized (${OLLAMA_MODEL})\n`);
    } catch (error) {
      brainP1 = null;
      logger.warn('⚠️  Ollama P1 not available');
      logger.info('To use Ollama: start it with: ollama serve\n');
    }

    try {
      brainP2 = new OllamaAIBrain(logger, {
        modelName: OLLAMA_MODEL,
        baseUrl: 'http://localhost:11434',
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        numPredict: 256,
        timeout: OLLAMA_TIMEOUT,
        playerID: 2,
      });

      await brainP2.initialize();
      logger.info(`✓ Ollama brain P2 initialized (${OLLAMA_MODEL})\n`);
    } catch (error) {
      brainP2 = null;
      logger.warn('⚠️  Ollama P2 not available');
    }

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

    // Initialize broadcast state (lightweight transformer for broadcast data)
    const broadcastState = new BroadcastState(logger);
    logger.info('✓ Broadcast state initialized\n');

    // Track trash talk messages for broadcast
    const recentTrashTalk: Array<{ playerId: number; playerName: string; message: string; tick: number }> = [];
    const maxTrashTalkHistory = 10;

    // Log camera events and move camera to dramatic moments
    let firstGameEventTick: number | null = null;

    eventFeed.subscribe((type: string, data: any) => {
      if (type.startsWith('camera:')) {
        // Track first game event to establish baseline
        if (firstGameEventTick === null && data.tick) {
          firstGameEventTick = data.tick;
        }

        // Only log important moments
        if (type === 'camera:target_updated' && data.reason === 'combat') {
          logger.info(`📡 Camera tracking combat at (${Math.round(data.x)}, ${Math.round(data.z)})`);
        } else if (type === 'camera:dramatic_moment') {
          logger.info(`🎥 Dramatic: ${data.type} (severity ${data.severity})`);
        }

        // Move camera to battles
        if (type === 'camera:dramatic_moment' && data.position && firstGameEventTick !== null) {
          const ticksSinceStart = data.tick - firstGameEventTick;
          const MIN_TICKS_TO_BATTLE = 1500; // Need ~25 seconds of game time before first camera move

          const shouldMove =
            ticksSinceStart > MIN_TICKS_TO_BATTLE && // Wait for civs to actually build armies and engage
            (data.type === 'large_engagement' || // Battles - MOVE FOR THIS
            data.type === 'player_eliminated'); // Someone eliminated - CRITICAL

          if (shouldMove) {
            logger.info(`🎬 MOVING CAMERA: ${data.type}`);
            eventCamera.moveToEvent(
              {
                type: 'battle',
                x: data.position.x,
                z: data.position.z,
                severity: 'high',
                description: `${data.type}: ${data.description}`,
              },
              client
            ).catch((error) => {
              logger.debug('Failed to move camera', {
                error: error instanceof Error ? error.message : String(error),
              });
            });
          }
        }

        // Broadcast to external tools (OBS, streaming software, etc.)
        if (type === 'camera:target_updated' && data.x && data.z) {
          cameraBroadcast.broadcastRecommendation(data.x, data.z, data.reason || 'action', data.score || 50);
        }
      }
    });

    // Get initial state
    let gameState: any = await client.step([]);
    let tick = 0;
    const maxTicks = 3600; // 1 hour max per match
    let matchWinner: string | null = null;
    const matchStartTime = Date.now();

    logger.info(`🎮 Match started - Initial game tick: ${gameState.tick || 0}`);

    // Auto-zoom out at start of match - send minus key after slight delay for initialization
    logger.info('⏳ Waiting for game initialization before zooming...');
    setTimeout(() => {
      logger.info('🔭 Auto-zooming camera out...');
      try {
        const pythonScript = path.join(process.cwd(), 'camera-controller.py');
        logger.debug('Python script path:', { pythonScript });

        // Send minus key (zoom out) 5 times
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            logger.debug(`Zoom iteration ${i + 1}/5`);
            const proc = spawn('python', [pythonScript, 'minus', '500'], {
              detached: true,
              stdio: 'ignore',
            });
            proc.unref();
          }, i * 600); // Stagger each zoom by 600ms
        }

        logger.info('✓ Camera zoom sequence started');
      } catch (error) {
        logger.error('Could not auto-zoom camera', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 5000); // Wait 5 seconds for game to initialize

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
        const units = worldState.agents
          .filter(a => (a.customData as any)?.type === 'unit')
          .map(a => {
            const customData = a.customData as any;
            // Position can be in positionRaw or directly in agent
            const positionRaw = customData?.positionRaw || { x: 0, z: 0 };
            return {
              id: customData?.entityId?.toString() || '',
              owner: a.controlledByPlayerId?.toString() || '',
              position: { x: positionRaw.x || 0, z: positionRaw.z || 0 },
              health: customData?.health,
            };
          });

        // Track unit movements by player - PROOF that commands are working
        const p1Units = units.filter(u => u.owner === '1');
        const p2Units = units.filter(u => u.owner === '2');

        // Log unit counts every 100 ticks - shows both players' units moving
        if (tick % 100 === 0 && tick > 0) {
          logger.info(`  [Tick ${tick}] P1 units: ${p1Units.length} | P2 units: ${p2Units.length}`, {
            p1SamplePos: p1Units[0]?.position || { x: 0, z: 0 },
            p2SamplePos: p2Units[0]?.position || { x: 0, z: 0 },
          });
        }

        // Log sample unit positions every 1000 ticks
        if (tick % 1000 === 0 && units.length > 0) {
          logger.info('📍 Sample unit positions by player:', {
            p1Units: p1Units.length,
            p2Units: p2Units.length,
            totalUnits: units.length,
          });
        }

        const gameStateForCamera = {
          tick: worldState.time.currentTick.number,
          units,
          buildings: worldState.agents
            .filter(a => (a.customData as any)?.type === 'building')
            .map(a => {
              const customData = a.customData as any;
              // Position can be in positionRaw or directly in agent
              const positionRaw = customData?.positionRaw || { x: 0, z: 0 };
              return {
                id: customData?.entityId?.toString() || '',
                owner: a.controlledByPlayerId?.toString() || '',
                type: customData?.template || '',
                position: { x: positionRaw.x || 0, z: positionRaw.z || 0 },
              };
            }),
          players: worldState.players.map(p => ({ id: p.id, name: p.name })),
        };

        // Let camera manager process state updates (will move camera to interesting locations)
        if (cameraStateUpdateCallback) {
          cameraStateUpdateCallback(gameStateForCamera, previousCameraState);
        }
        previousCameraState = gameStateForCamera;

        // Detect dramatic moments and move camera
        try {
          // Check if this tick has a dramatic moment event
          for (const eventData of Object.values(eventFeed['_eventListeners'] || {})) {
            // Events are logged - we'll use the automatic camera manager's dramatic moment detection
          }
        } catch (error) {
          logger.debug('Dramatic moment detection error', {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Check win conditions
        if (playerUnits === 0) {
          matchWinner = 'enemy (Petra AI)';
          logger.info('❌ All player units lost - ENEMY WINS');
          break;
        }

        if (enemyUnits === 0) {
          matchWinner = brainP1 ? 'player (Ollama)' : 'player (Petra AI)';
          logger.info(`✅ Enemy defeated - ${matchWinner} WINS`);
          break;
        }

        // Get decisions from BOTH Ollama brains every N ticks
        let allCommands: any[] = [];

        if (tick % decisionFrequency === 0) {
          // Player 1 decision
          if (brainP1) {
            try {
              const decision1 = await brainP1.decide(worldState);
              if (decision1.commands && decision1.commands.length > 0) {
                allCommands.push(...decision1.commands);
                logger.debug(`P1 Ollama decision: ${decision1.commands.length} commands`, {
                  tick,
                  commands: decision1.commands.map((c: any) => c.json_cmd?.type || 'unknown'),
                });
              }
            } catch (err) {
              const isAbortError = err instanceof Error && err.name === 'AbortError';
              if (!isAbortError) {
                logger.error('P1 brain decision failed', {
                  tick,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }

          // Player 2 decision
          if (brainP2) {
            try {
              const decision2 = await brainP2.decide(worldState);
              if (decision2.commands && decision2.commands.length > 0) {
                allCommands.push(...decision2.commands);
                logger.debug(`P2 Ollama decision: ${decision2.commands.length} commands`, {
                  tick,
                  commands: decision2.commands.map((c: any) => c.json_cmd?.type || 'unknown'),
                });
              }
            } catch (err) {
              const isAbortError = err instanceof Error && err.name === 'AbortError';
              if (!isAbortError) {
                logger.error('P2 brain decision failed', {
                  tick,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
        }

        // Step game state WITH both Ollama commands (if any)
        gameState = await client.step(allCommands);

        tick++;

        // Build broadcast state every tick (lightweight transformation, non-blocking)
        try {
          const broadcastContext: ArenaMatchContext = {
            matchId: `match-${matchNumber}`,
            matchNumber,
            map: mapUsed.replace('skirmishes/', ''),
            mapDisplayName: mapUsed.replace('skirmishes/', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            worldState,
            player1: {
              name: brainP1 ? 'Ollama AI' : 'Petra AI',
              model: brainP1 ? 'Ollama' : 'petra',
              civilization: 'athenians', // TODO: Get from Arena context
            },
            player2: {
              name: brainP2 ? 'Ollama AI' : 'Petra AI',
              model: brainP2 ? 'Ollama' : 'petra',
              civilization: 'persians', // TODO: Get from Arena context
            },
            tick,
            isRunning: true,
          };

          const currentBroadcastState = broadcastState.buildState(broadcastContext);

          // Log broadcast state sample every 500 ticks for validation
          if (tick % 500 === 0 && tick > 0) {
            logger.info('📺 BROADCAST STATE SAMPLE', {
              tick: currentBroadcastState.match.currentTick,
              player1: {
                name: currentBroadcastState.match.players[0].name,
                units: currentBroadcastState.match.players[0].units,
                resources: currentBroadcastState.match.players[0].resources,
              },
              player2: {
                name: currentBroadcastState.match.players[1].name,
                units: currentBroadcastState.match.players[1].units,
                resources: currentBroadcastState.match.players[1].resources,
              },
            });
          }
        } catch (error) {
          logger.debug('Failed to build broadcast state', {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        // Log progress every 100 ticks
        if (tick % 100 === 0) {
          logger.info(`  [Tick ${tick}] Ollama: ${playerUnits} units | Petra: ${enemyUnits} units`);

          // Generate trash talk every 500 ticks
          if (tick % 500 === 0) {
            // Extract real player resources from WorldState
            const player1Resources = (worldState.players[0]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const player2Resources = (worldState.players[1]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };

            const gameContext: GameContext = {
              player1: {
                name: 'Ollama',
                resources: {
                  food: player1Resources.food || 0,
                  wood: player1Resources.wood || 0,
                  stone: player1Resources.stone || 0,
                  metal: player1Resources.metal || 0,
                },
                unitCount: playerUnits,
                buildingCount: worldState.agents.filter(
                  a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1'
                ).length,
              },
              player2: {
                name: 'Petra',
                resources: {
                  food: player2Resources.food || 0,
                  wood: player2Resources.wood || 0,
                  stone: player2Resources.stone || 0,
                  metal: player2Resources.metal || 0,
                },
                unitCount: enemyUnits,
                buildingCount: worldState.agents.filter(
                  a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '2'
                ).length,
              },
              tick,
            };

            trashTalkGenerator.generateTrashTalk(gameContext)
              .then(trashTalk => {
                if (trashTalk) {
                  // Capture trash talk for broadcast feed
                  const playerName = trashTalk.speaker === 'player1' ? 'Ollama' : 'Petra';
                  recentTrashTalk.push({
                    playerId: trashTalk.speaker === 'player1' ? 1 : 2,
                    playerName,
                    message: trashTalk.message,
                    tick: trashTalk.tick,
                  });

                  // Maintain bounded history
                  if (recentTrashTalk.length > maxTrashTalkHistory) {
                    recentTrashTalk.shift();
                  }

                  logger.info('📢 Trash talk captured for broadcast', {
                    speaker: playerName,
                    message: trashTalk.message.substring(0, 60),
                  });
                }
              })
              .catch(() => {
                // Silently fail - Ollama may not be available
              });
          }
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

      // Record match in rotation system
      const cleanMapName = mapUsed.replace('skirmishes/', '');
      matchRotation.recordMatch(cleanMapName, ['Ollama', 'Petra']);

      const rotationStats = matchRotation.getStats();
      logger.info(
        `\n✅ MATCH ${matchNumber} COMPLETE - Winner: ${matchWinner} (${tick} ticks / ~${Math.round(tick / 10)}s)`
      );
      logger.info('📊 Map rotation stats', {
        uniqueMaps: rotationStats.uniqueMaps,
        totalMatches: rotationStats.totalMatches,
      });
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

      // Start fresh game (gets map for this match)
      const gameStart = await startGame(matchNumber);
      const gameProcess = gameStart.process;
      const mapUsed = gameStart.map;

      // Run the match
      const success = await runMatch(gameProcess, matchNumber, mapUsed);

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
