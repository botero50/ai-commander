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
 * Configuration: Set values in .env file or via environment variables
 *
 * Usage:
 *   npx tsx src/arena/run-arena-loop.ts [--matches N]
 *
 * Examples:
 *   npx tsx src/arena/run-arena-loop.ts              # Run forever
 *   npx tsx src/arena/run-arena-loop.ts --matches 10 # Run 10 matches
 */

// Load environment variables from .env file
import 'dotenv/config.js';

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as os from 'os';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { WorldStateMapper } from '../rl-interface/world-state-mapper.js';
import { createBrain } from '../rl-interface/brain-factory.js';
import type { AIBrain } from '../rl-interface/ai-loop-orchestrator.js';
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
import { PiperTTSService } from '../match/piper-tts-service.js';
import { EventBasedCamera } from '../camera/event-based-camera.js';
import { BroadcastState, type ArenaMatchContext } from '../broadcast/broadcast-state.js';
import { BroadcastServer } from '../tournament/broadcast-server.js';
import { EloRating } from '../tournament/elo-rating.js';
import { ScreenController } from '../screen/index.js';
import { LiveMetricsHUD, createLiveMetricsHUD } from '../broadcast/live-metrics-hud.js';

const execAsync = promisify(exec);

// ✅ NEW: Detect system screen resolution
function getSystemScreenResolution(): { width: number; height: number } {
  try {
    // Use Windows API via wmic (more reliable than PowerShell)
    const { execSync } = require('child_process');

    // Query screen resolution using Windows wmic command
    const output = execSync('wmic path Win32_VideoController get CurrentHorizontalResolution,CurrentVerticalResolution /format:csv', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      windowsHide: true,
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line && !line.includes('Node')) {
        // Format: "DESKTOP-ABC,1920,1080"
        const parts = line.split(',');
        if (parts.length >= 3) {
          const width = parseInt(parts[1]?.trim(), 10);
          const height = parseInt(parts[2]?.trim(), 10);

          if (width > 0 && height > 0) {
            return { width, height };
          }
        }
      }
    }
  } catch {
    // Fallback if wmic fails
  }

  // Last resort: try simple wmic query
  try {
    const { execSync } = require('child_process');
    const width = parseInt(
      execSync('wmic desktopmonitor get screenwidth /value', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
      })
        .split('=')[1]
        ?.trim() || '1920',
      10
    );
    const height = parseInt(
      execSync('wmic desktopmonitor get screenheight /value', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
        windowsHide: true,
      })
        .split('=')[1]
        ?.trim() || '1080',
      10
    );

    if (width > 0 && height > 0) {
      return { width, height };
    }
  } catch {
    // Final fallback
  }

  // Fallback for non-Windows or if all detection methods fail
  return { width: 1920, height: 1080 };
}

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const GAME_STARTUP_WAIT = process.env.STARTUP_WAIT ? parseInt(process.env.STARTUP_WAIT, 10) : 5000; // Wait 5 seconds for game to start (override with STARTUP_WAIT env var)
const RL_CONNECT_TIMEOUT = 30000; // Try to connect for 30 seconds

// Brain configuration - specify which AI to use
// Format: "provider:model"
// Examples:
//   - ollama:mistral, ollama:llama2, ollama:tinyllama
//   - openai:gpt-4, openai:gpt-3.5-turbo
//   - anthropic:claude-3-opus-20240229, anthropic:claude-3-sonnet-20240229
const BRAIN_P1_ID = process.env.BRAIN_P1 || 'ollama:mistral'; // Player 1 brain
const BRAIN_P2_ID = process.env.BRAIN_P2 || 'ollama:llama2'; // Player 2 brain
const BRAIN_TIMEOUT = process.env.BRAIN_TIMEOUT ? parseInt(process.env.BRAIN_TIMEOUT, 10) : 60000; // 60 seconds

// Parse CLI arguments
const args = process.argv.slice(2);
let maxMatches = 0; // 0 = infinite
let decisionFrequency = 5; // Make decision every N ticks (1 = every tick, 5 = every 5 ticks = faster, default 5)
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

// ✅ NEW (EPIC 62): Streaming cache for HTTP API
interface StreamingDataCache {
  currentMatch: {
    matchId: string;
    matchNumber: number;
    tick: number;
    players: Array<{
      id: number;
      name: string;
      civilization: string;
      units: number;
      buildings: number;
      phase: string;
      researched_techs: number;
      economyScore: number;
      status: string;
      resources?: {
        food: number;
        wood: number;
        stone: number;
        metal: number;
      };
      population?: number;
    }>;
  } | null;
  recentTrashTalk: Array<{
    speaker: string;
    message: string;
    tick: number;
  }>;
}

const streamingCache: StreamingDataCache = {
  currentMatch: null,
  recentTrashTalk: [],
};

// ✅ NEW: Initialize ranking and metrics systems with brain IDs
const eloRating = new EloRating([
  BRAIN_P1_ID,
  BRAIN_P2_ID,
], {
  initialRating: 1600,
  kFactor: 32,
  maxRatingHistory: 100,
});

const liveMetricsHUD = createLiveMetricsHUD(logger);

// Match history for display
const matchHistory: Array<{
  matchId: string;
  player1: string;
  player2: string;
  winner: string;
  duration: number; // ticks
  timestamp: number;
}> = [];

// Store last world state for debug endpoint
let lastWorldState: any = null;
let lastRawGameState: any = null;
let lastCameraTest: any = null;

// ✅ NEW (EPIC 62): Start HTTP server for OBS
function startHttpServer(): void {
  const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // ✅ UNIFIED: /api/broadcast/current now returns both metadata + player details + resources
    if (req.url === '/api/broadcast/current') {
      res.writeHead(200);
      if (streamingCache.currentMatch) {
        const { tick, players } = streamingCache.currentMatch;
        // Return unified format with all player details including resources
        const response = {
          tick,
          player1: {
            name: players[0].name,
            civilization: players[0].civilization,
            units: players[0].units,
            buildings: players[0].buildings,
            phase: players[0].phase,
            researched_techs: players[0].researched_techs,
            economyScore: players[0].economyScore,
            status: players[0].status,
            resources: players[0].resources,
            population: players[0].population,
          },
          player2: {
            name: players[1].name,
            civilization: players[1].civilization,
            units: players[1].units,
            buildings: players[1].buildings,
            phase: players[1].phase,
            researched_techs: players[1].researched_techs,
            economyScore: players[1].economyScore,
            status: players[1].status,
            resources: players[1].resources,
            population: players[1].population,
          },
        };
        res.end(JSON.stringify(response));
      } else {
        res.end(JSON.stringify({}));
      }
    } else if (req.url === '/api/broadcast/chat') {
      res.writeHead(200);
      res.end(JSON.stringify(streamingCache.recentTrashTalk.slice(-20)));
    } else if (req.url?.startsWith('/api/broadcast/audio/')) {
      // ✅ NEW: Serve audio files for trash talk
      const filename = req.url.split('/').pop();
      const audioPath = `.data/audio/trash_talk/${filename}`;
      try {
        const stat = fs.statSync(audioPath);
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.writeHead(200);
        const stream = fs.createReadStream(audioPath);
        stream.pipe(res);
      } catch (error) {
        logger.warn('Audio file not found', { filename });
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Audio file not found' }));
      }
    } else if (req.url === '/api/rankings') {
      // ✅ NEW: Get all brain rankings (ELO)
      res.writeHead(200);
      const rankings = eloRating.getAllRatings();
      const formatted = rankings.map((r, idx) => ({
        rank: idx + 1,
        brainId: r.brainId,
        name: r.brainId,
        rating: r.rating,
        highestRating: Math.max(...r.ratingHistory),
        lowestRating: Math.min(...r.ratingHistory),
        averageRating: Math.round(r.ratingHistory.reduce((a, b) => a + b, 0) / r.ratingHistory.length),
        matches: r.ratingHistory.length - 1,
        trend: r.ratingHistory.length >= 2 && r.rating > r.ratingHistory[r.ratingHistory.length - 2] ? 'up' : 'down',
      }));
      res.end(JSON.stringify(formatted));
    } else if (req.url?.startsWith('/api/rankings/')) {
      // ✅ NEW: Get individual brain ranking
      const brainId = req.url.split('/').pop();
      const stats = eloRating.getBrainStats(brainId);
      res.writeHead(200);
      if (stats) {
        res.end(JSON.stringify({
          brainId,
          currentRating: stats.currentRating,
          highestRating: stats.highestRating,
          lowestRating: stats.lowestRating,
          averageRating: stats.averageRating,
          ratingChange: stats.ratingChange,
          ratingHistory: eloRating.getRatingHistory(brainId),
        }));
      } else {
        res.end(JSON.stringify({ error: 'Brain not found' }));
      }
    } else if (req.url === '/api/metrics') {
      // ✅ NEW: Get current match metrics
      res.writeHead(200);
      const allMetrics = liveMetricsHUD.getAllMetrics();
      if (allMetrics.length > 0) {
        res.end(JSON.stringify({
          timestamp: new Date().toISOString(),
          players: allMetrics,
          comparison: allMetrics.length >= 2 ? liveMetricsHUD.compareMetrics(1, 2) : null,
        }));
      } else {
        res.end(JSON.stringify({ players: [] }));
      }
    } else if (req.url === '/api/match-history') {
      // ✅ NEW: Get recent match history
      res.writeHead(200);
      res.end(JSON.stringify(matchHistory.slice(-20)));
    } else if (req.url === '/api/dashboard') {
      // ✅ NEW: Get complete dashboard state
      res.writeHead(200);
      const rankings = eloRating.getAllRatings();
      const dashboardState = {
        status: streamingCache.currentMatch ? 'running' : 'idle',
        currentMatch: streamingCache.currentMatch ? {
          matchId: streamingCache.currentMatch.matchId,
          matchNumber: streamingCache.currentMatch.matchNumber,
          tick: streamingCache.currentMatch.tick,
        } : null,
        rankings: rankings.map((r, idx) => ({
          rank: idx + 1,
          brainId: r.brainId,
          rating: r.rating,
          highestRating: Math.max(...r.ratingHistory),
          trend: r.ratingHistory.length >= 2 && r.rating > r.ratingHistory[r.ratingHistory.length - 2] ? 'up' : 'down',
        })),
        recentMatches: matchHistory.slice(-10),
        totalMatches: matchHistory.length,
        liveMetrics: liveMetricsHUD.getAllMetrics(),
      };
      res.end(JSON.stringify(dashboardState));
    } else if (req.url === '/api/debug/camera-position') {
      // ✅ DEBUG: Get last saved camera position
      res.writeHead(200);
      res.end(JSON.stringify(lastCameraTest ? {
        p1Target: lastCameraTest.p1Pos,
        p2Target: lastCameraTest.p2Pos,
        message: 'Camera targets from last test run. Check logs for real-time position updates.'
      } : { error: 'No camera test data yet' }));
    } else if (req.url === '/api/debug/raw-game-state') {
      // ✅ DEBUG: Get raw game state (from RL Interface - most raw data)
      res.writeHead(200);
      if (lastRawGameState) {
        res.end(JSON.stringify(lastRawGameState));
      } else {
        res.end(JSON.stringify({ error: 'No raw game state data yet' }));
      }
    } else if (req.url === '/api/debug/camera-test') {
      // ✅ DEBUG: Get last camera test data with raw entities
      res.writeHead(200);
      res.end(JSON.stringify(lastCameraTest || { error: 'No camera test data yet' }));
    } else if (req.url === '/api/debug/world-state') {
      // ✅ DEBUG: Get last world state with all positions
      res.writeHead(200);
      if (lastWorldState) {
        const debugData = {
          tick: lastWorldState.tick,
          p1Units: lastWorldState.agents
            .filter((a: any) => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1')
            .map((u: any) => ({
              id: (u.customData as any)?.id,
              template: (u.customData as any)?.template,
              x: (u.customData as any)?.positionRaw?.x,
              z: (u.customData as any)?.positionRaw?.z,
            })),
          p2Units: lastWorldState.agents
            .filter((a: any) => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2')
            .map((u: any) => ({
              id: (u.customData as any)?.id,
              template: (u.customData as any)?.template,
              x: (u.customData as any)?.positionRaw?.x,
              z: (u.customData as any)?.positionRaw?.z,
            })),
          p1Buildings: lastWorldState.agents
            .filter((a: any) => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1')
            .map((b: any) => ({
              id: (b.customData as any)?.id,
              template: (b.customData as any)?.template,
              x: (b.customData as any)?.positionRaw?.x,
              z: (b.customData as any)?.positionRaw?.z,
            })),
          p2Buildings: lastWorldState.agents
            .filter((a: any) => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '2')
            .map((b: any) => ({
              id: (b.customData as any)?.id,
              template: (b.customData as any)?.template,
              x: (b.customData as any)?.positionRaw?.x,
              z: (b.customData as any)?.positionRaw?.z,
            })),
        };
        res.end(JSON.stringify(debugData));
      } else {
        res.end(JSON.stringify({ error: 'No world state data yet' }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(8080, '127.0.0.1', () => {
    logger.info('📡 HTTP API started on port 8080');
  });
}

startHttpServer();

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

  // Select map using rotation to avoid repetition
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
    '-xres=2560',           // Resolution width (2K)
    '-yres=1440',           // Resolution height (2K)
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

    // Get screen resolution: environment variables override auto-detection
    let screenWidth: number;
    let screenHeight: number;

    if (process.env.SCREEN_WIDTH && process.env.SCREEN_HEIGHT) {
      screenWidth = parseInt(process.env.SCREEN_WIDTH, 10);
      screenHeight = parseInt(process.env.SCREEN_HEIGHT, 10);
      logger.info(`📺 Using manual resolution from environment: ${screenWidth}x${screenHeight}`);
    } else {
      const systemResolution = getSystemScreenResolution();
      screenWidth = systemResolution.width;
      screenHeight = systemResolution.height;
      logger.info(`📺 Detected system resolution: ${screenWidth}x${screenHeight}`);
    }

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
    // Default zoom = 300 (maximum zoom out to see entire map)
    const settingsList = [
      ['zoom.max = 300.0', /zoom\.max\s*=\s*[\d.]+/],
      ['zoom.default = 300.0', /zoom\.default\s*=\s*[\d.]+/],  // Start at maximum zoom (fully zoomed out)
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
    // ✅ NEW (EPIC 62): Create matchId for streaming
    const matchId = `match-${Date.now()}-${matchNumber}`;
    const map = mapUsed;

    // Initialize player labels (will be updated once brains are initialized)
    let p1Label = 'Player 1';
    let p2Label = 'Player 2';

    logger.info(`\n${'='.repeat(60)}`);
    logger.info(`Match ${matchNumber} - Connecting to game...`);
    logger.info(`Players: ${p1Label} vs ${p2Label}`);
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
    const screenController = new ScreenController(logger);

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

    // Initialize Piper TTS for converting trash talk to speech
    const piperTTS = new PiperTTSService(logger);
    await piperTTS.initialize();

    // Initialize camera controller (communicates with RL Interface)
    const cameraController = new CameraModController(logger, client);
    cameraController.setRLClient(client);
    await cameraController.connect();

    // Initialize event-based camera for automatic tracking (pass RL client so it can get camera position)
    const eventCamera = new EventBasedCamera(logger, client);

    // Initialize camera broadcast server for external tools
    const cameraBroadcast = new CameraBroadcastServer(logger, 3001);
    await cameraBroadcast.start();

    // ✅ NEW (EPIC 62 Phase 1): Initialize broadcast server for streaming trash talk + game data
    const broadcastServer = new BroadcastServer({
      port: 8765,
      maxConnections: 100,
      heartbeatInterval: 1000,
      messageBufferSize: 5000,
      enableCompression: true,
    });
    broadcastServer.start();
    logger.info(`🎬 Broadcast server started on port 8765`);

    // Initialize AI brains from factory (supports Ollama, OpenAI, Anthropic, etc.)
    let brainP1: AIBrain | null = null;
    let brainP2: AIBrain | null = null;

    // ✅ NEW (EPIC 62 Phase 2): Track unit counts for metrics trends
    let lastP1Count = 0;
    let lastP2Count = 0;

    // ✅ UPDATED: Initialize brains using factory (supports multiple providers)
    try {
      logger.info('🤖 Initializing AI brains from factory...');

      brainP1 = createBrain(BRAIN_P1_ID, logger, {
        playerID: 1,
        timeout: BRAIN_TIMEOUT,
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      });

      await brainP1.initialize?.();
      p1Label = `${BRAIN_P1_ID} (P1)`;
      logger.info(`✓ Brain P1 initialized (${BRAIN_P1_ID})`);
    } catch (error) {
      logger.error('❌ FATAL: Brain P1 initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        brainId: BRAIN_P1_ID,
      });
      throw new Error(`Brain P1 (${BRAIN_P1_ID}) initialization failed`);
    }

    try {
      brainP2 = createBrain(BRAIN_P2_ID, logger, {
        playerID: 2,
        timeout: BRAIN_TIMEOUT,
        apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
      });

      await brainP2.initialize?.();
      p2Label = `${BRAIN_P2_ID} (P2)`;
      logger.info(`✓ Brain P2 initialized (${BRAIN_P2_ID})\n`);
    } catch (error) {
      logger.error('❌ FATAL: Brain P2 initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        brainId: BRAIN_P2_ID,
      });
      throw new Error(`Brain P2 (${BRAIN_P2_ID}) initialization failed`);
    }

    // Log match info with actual player names now that brains are initialized
    logger.info(`\n🎬 MATCH START: ${p1Label} vs ${p2Label}`);

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
    const maxTicks = 999999; // Play until one bot wins (no artificial timeout)
    let matchWinner: string | null = null;
    const matchStartTime = Date.now();

    // ✅ NEW: Track defeat states to detect when match should end
    let ticksWithNoP1Units = 0;
    let ticksWithNoP2Units = 0;
    const DEFEAT_CONFIRMATION_TICKS = 300; // ~10 seconds at 30 FPS = confirm they're really defeated

    logger.info(`🎮 Match started - Initial game tick: ${gameState.tick || 0}`);

    // Auto-zoom out at start of match - send minus key after slight delay for initialization
    logger.info('⏳ Waiting for game initialization before zooming...');
    setTimeout(() => {
      logger.info('🔭 Auto-zooming camera out...');
      try {
        const pythonScript = path.join(process.cwd(), 'camera-controller.py');
        logger.debug('Python script path:', { pythonScript });

        // Send minus key (zoom out) 3 times
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            logger.debug(`Zoom iteration ${i + 1}/3`);
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

        // Debug: log resource data every 100 ticks (3.3 seconds)
        if (tick % 100 === 0 && tick > 0) {
          logger.debug('Raw game state resources:', {
            tick,
            player1: gameState.players?.[0]?.resources,
            player2: gameState.players?.[1]?.resources,
          });
          logger.debug('WorldState players:', {
            tick,
            player1CustomData: {
              resources: (worldState.players?.[0]?.customData as any)?.resources,
              population: (worldState.players?.[0]?.customData as any)?.population,
            },
            player2CustomData: {
              resources: (worldState.players?.[1]?.customData as any)?.resources,
              population: (worldState.players?.[1]?.customData as any)?.population,
            },
          });
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

        // ✅ NEW: Camera test at 10 seconds (tick 300) - pan between town centers with progress tracking
        if (tick === 300 && false) {  // DISABLED: Camera test logs
          logger.info('🎬 CAMERA TEST START: Panning between town centers...');

          // Save world state and raw game state for debug
          lastWorldState = worldState;
          lastRawGameState = gameState;

          // Get player civil centres (town halls)
          const p1CivilCentres = worldState.agents.filter(a => {
            const data = (a.customData as any);
            const template = data?.template?.toLowerCase() || '';
            return data?.type === 'building' &&
                   a.controlledByPlayerId?.toString() === '1' &&
                   (template.includes('civil') || template.includes('townhall'));
          });

          const p2CivilCentres = worldState.agents.filter(a => {
            const data = (a.customData as any);
            const template = data?.template?.toLowerCase() || '';
            return data?.type === 'building' &&
                   a.controlledByPlayerId?.toString() === '2' &&
                   (template.includes('civil') || template.includes('townhall'));
          });

          if (p1CivilCentres.length > 0 && p2CivilCentres.length > 0) {
            const p1Building = p1CivilCentres[0];
            const p2Building = p2CivilCentres[0];

            const p1Pos = (p1Building.customData as any)?.positionRaw || { x: 512, z: 512 };
            const p2Pos = (p2Building.customData as any)?.positionRaw || { x: 512, z: 512 };

            // Save camera test data
            lastCameraTest = {
              tick,
              p1Pos: { x: p1Pos.x, z: p1Pos.z },
              p2Pos: { x: p2Pos.x, z: p2Pos.z },
              p1Building: {
                template: (p1Building.customData as any)?.template,
                x: p1Pos.x,
                z: p1Pos.z,
              },
              p2Building: {
                template: (p2Building.customData as any)?.template,
                x: p2Pos.x,
                z: p2Pos.z,
              },
            };

            logger.info(`📍 TARGET: Player 1 base at (${p1Pos.x.toFixed(0)}, ${p1Pos.z.toFixed(0)})`);
            logger.info(`📍 TARGET: Player 2 base at (${p2Pos.x.toFixed(0)}, ${p2Pos.z.toFixed(0)})`);

            // Disable auto event detection during manual camera test
            eventCamera.disableAutoEventDetection();

            logger.info('🎥 CAMERA TEST: Camera is at Player 1 base');

            // Now move from P1 to P2
            logger.info('🎥 BEGIN: Moving camera from Player 1 to Player 2...');
            await eventCamera.moveToEvent({
              type: 'battle',
              x: p2Pos.x,
              z: p2Pos.z,
              severity: 'high',
              description: 'Player 2 Base (Camera Test)',
            }, client).catch(e => logger.error('P2 pan error', { e: String(e) }));

            // Monitor movement progress
            let monitorCount = 0;
            const monitorInterval = setInterval(() => {
              if (monitorCount >= 120) { // Stop after 6 seconds (120 * 50ms) to allow 1914ms movement
                clearInterval(monitorInterval);
                logger.info('✅ CAMERA TEST COMPLETE');
                // Re-enable auto event detection after test
                eventCamera.enableAutoEventDetection();

                // ✅ NEW: Test screen controller - click red base on minimap
                logger.info('🎬 SCREEN CONTROLLER TEST START: Clicking red base on minimap...');
                setTimeout(async () => {
                  try {
                    const coords = await screenController.clickRedBase();
                    logger.info(`✅ RED BASE CLICK TEST COMPLETE`, {
                      minimapX: coords.x,
                      minimapZ: coords.z,
                      screenX: coords.screenX,
                      screenY: coords.screenY,
                    });
                  } catch (error) {
                    logger.error('Screen controller test failed', {
                      error: error instanceof Error ? error.message : String(error),
                    });
                  }
                }, 500);

                return;
              }
              monitorCount++;
            }, 50);
          } else {
            logger.warn('⚠️ Could not find buildings for camera test');
          }
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

        // ✅ IMPROVED: Track defeat states with confirmation period
        if (playerUnits === 0) {
          ticksWithNoP1Units++;
        } else {
          ticksWithNoP1Units = 0;
        }

        if (enemyUnits === 0) {
          ticksWithNoP2Units++;
        } else {
          ticksWithNoP2Units = 0;
        }

        // Get player names dynamically
        const p1Name = brainP1 ? 'Ollama' : 'Petra';
        const p2Name = brainP2 ? 'Ollama' : 'Petra';

        // Check win conditions - require confirmation period to avoid false positives
        if (ticksWithNoP1Units >= DEFEAT_CONFIRMATION_TICKS && ticksWithNoP2Units >= DEFEAT_CONFIRMATION_TICKS) {
          // Both eliminated = draw
          matchWinner = 'draw (both eliminated)';
          logger.info(`🤝 Both civilizations eliminated after ${tick} ticks - DRAW`);
          break;
        }

        if (ticksWithNoP1Units >= DEFEAT_CONFIRMATION_TICKS) {
          matchWinner = `${p2Name} (Player 2)`;
          logger.info(`❌ Player 1 units lost for ${ticksWithNoP1Units} ticks - ${p2Name} (P2) WINS (tick ${tick})`);
          break;
        }

        if (ticksWithNoP2Units >= DEFEAT_CONFIRMATION_TICKS) {
          matchWinner = `${p1Name} (Player 1)`;
          logger.info(`✅ Player 2 units lost for ${ticksWithNoP2Units} ticks - ${p1Name} (P1) WINS (tick ${tick})`);
          break;
        }

        // Get decisions from BOTH Ollama brains every N ticks (fire-and-forget, non-blocking)
        if (tick % decisionFrequency === 0) {
          // ✅ OPTIMIZED: Fire-and-forget async (don't wait for decisions)
          if (brainP1) {
            brainP1.decide(worldState)
              .then((decision1: any) => {
                if (decision1.commands && decision1.commands.length > 0) {
                  client.step(decision1.commands).catch(() => {});
                  logger.debug(`P1 Ollama decision: ${decision1.commands.length} commands`, {
                    tick,
                    commands: decision1.commands.map((c: any) => c.json_cmd?.type || 'unknown'),
                  });
                }
              })
              .catch((err: any) => {
                const isAbortError = err instanceof Error && err.name === 'AbortError';
                const isTimeoutError = err instanceof Error && (err.message.includes('503') || err.message.includes('timeout'));
                // Suppress timeout errors - they don't affect gameplay, just log as debug
                if (!isAbortError && !isTimeoutError) {
                  logger.error('P1 brain decision failed', {
                    tick,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              });
          }

          if (brainP2) {
            brainP2.decide(worldState)
              .then((decision2: any) => {
                if (decision2.commands && decision2.commands.length > 0) {
                  client.step(decision2.commands).catch(() => {});
                  logger.debug(`P2 Ollama decision: ${decision2.commands.length} commands`, {
                    tick,
                    commands: decision2.commands.map((c: any) => c.json_cmd?.type || 'unknown'),
                  });
                }
              })
              .catch((err: any) => {
                const isAbortError = err instanceof Error && err.name === 'AbortError';
                const isTimeoutError = err instanceof Error && (err.message.includes('503') || err.message.includes('timeout'));
                // Suppress timeout errors - they don't affect gameplay, just log as debug
                if (!isAbortError && !isTimeoutError) {
                  logger.error('P2 brain decision failed', {
                    tick,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              });
          }
        }

        // ✅ OPTIMIZED: Step game immediately (AI commands sent asynchronously when ready)
        gameState = await client.step([]);

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

          // ✅ NEW: Update metrics for dashboard from broadcast state
          try {
            const p1 = currentBroadcastState.match.players[0];
            const p2 = currentBroadcastState.match.players[1];

            // Extract resources from worldState players
            const p1Resources = (worldState.players[0]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const p2Resources = (worldState.players[1]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const p1Population = (worldState.players[0]?.customData as any)?.population?.current || 0;
            const p2Population = (worldState.players[1]?.customData as any)?.population?.current || 0;

            liveMetricsHUD.updateMetrics({
              tick,
              playerId: 1,
              playerName: p1.name,
              observation: { units: p1.units, buildings: p1.buildings, resources: p1Resources, population: p1Population },
            });
            liveMetricsHUD.updateMetrics({
              tick,
              playerId: 2,
              playerName: p2.name,
              observation: { units: p2.units, buildings: p2.buildings, resources: p2Resources, population: p2Population },
            });
          } catch {
            // Silently skip on error
          }

          // Log broadcast state sample every 150 ticks (5 seconds at 30 FPS) for validation
          if (tick % 150 === 0 && tick > 0) {
            logger.info('📺 BROADCAST STATE SAMPLE', {
              tick: currentBroadcastState.match.currentTick,
              player1: {
                name: currentBroadcastState.match.players[0].name,
                civilization: currentBroadcastState.match.players[0].civilization,
                units: currentBroadcastState.match.players[0].units,
                buildings: currentBroadcastState.match.players[0].buildings,
                phase: currentBroadcastState.match.players[0].phase,
                researched_techs: currentBroadcastState.match.players[0].researched_techs,
                economyScore: currentBroadcastState.match.players[0].economyScore,
                status: currentBroadcastState.match.players[0].status,
              },
              player2: {
                name: currentBroadcastState.match.players[1].name,
                civilization: currentBroadcastState.match.players[1].civilization,
                units: currentBroadcastState.match.players[1].units,
                buildings: currentBroadcastState.match.players[1].buildings,
                phase: currentBroadcastState.match.players[1].phase,
                researched_techs: currentBroadcastState.match.players[1].researched_techs,
                economyScore: currentBroadcastState.match.players[1].economyScore,
                status: currentBroadcastState.match.players[1].status,
              },
            });

            // ✅ NEW (EPIC 62): Update streaming cache for HTTP API (OBS)
            // Get resources from worldState
            const p1Res = (worldState.players[0]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const p2Res = (worldState.players[1]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const p1Pop = (worldState.players[0]?.customData as any)?.population?.current || 0;
            const p2Pop = (worldState.players[1]?.customData as any)?.population?.current || 0;

            streamingCache.currentMatch = {
              matchId: `match-${matchNumber}`,
              matchNumber,
              tick,
              players: [
                {
                  id: 1,
                  name: currentBroadcastState.match.players[0].name,
                  civilization: currentBroadcastState.match.players[0].civilization,
                  units: currentBroadcastState.match.players[0].units,
                  buildings: currentBroadcastState.match.players[0].buildings,
                  phase: currentBroadcastState.match.players[0].phase,
                  researched_techs: currentBroadcastState.match.players[0].researched_techs,
                  economyScore: currentBroadcastState.match.players[0].economyScore,
                  status: 'active',
                  resources: p1Res,
                  population: p1Pop,
                },
                {
                  id: 2,
                  name: currentBroadcastState.match.players[1].name,
                  civilization: currentBroadcastState.match.players[1].civilization,
                  units: currentBroadcastState.match.players[1].units,
                  buildings: currentBroadcastState.match.players[1].buildings,
                  phase: currentBroadcastState.match.players[1].phase,
                  researched_techs: currentBroadcastState.match.players[1].researched_techs,
                  economyScore: currentBroadcastState.match.players[1].economyScore,
                  status: 'active',
                  resources: p2Res,
                  population: p2Pop,
                },
              ],
            };

            // ✅ NEW (EPIC 62 Phase 1): Broadcast game state to WebSocket clients
            broadcastServer.broadcastMessage({
              type: 'state_update',
              timestamp: Date.now(),
              payload: {
                matchId: matchId,
                tick: tick,
                players: [
                  {
                    id: 1,
                    name: currentBroadcastState.match.players[0].name,
                    civilization: currentBroadcastState.match.players[0].civilization,
                    model: currentBroadcastState.match.players[0].provider || 'unknown',
                    units: currentBroadcastState.match.players[0].units,
                    buildings: currentBroadcastState.match.players[0].buildings,
                    phase: currentBroadcastState.match.players[0].phase,
                    researched_techs: currentBroadcastState.match.players[0].researched_techs,
                    militaryValue: currentBroadcastState.match.players[0].militaryValue,
                    economyScore: currentBroadcastState.match.players[0].economyScore,
                    status: currentBroadcastState.match.players[0].status,
                  },
                  {
                    id: 2,
                    name: currentBroadcastState.match.players[1].name,
                    civilization: currentBroadcastState.match.players[1].civilization,
                    model: currentBroadcastState.match.players[1].provider || 'unknown',
                    units: currentBroadcastState.match.players[1].units,
                    buildings: currentBroadcastState.match.players[1].buildings,
                    phase: currentBroadcastState.match.players[1].phase,
                    researched_techs: currentBroadcastState.match.players[1].researched_techs,
                    militaryValue: currentBroadcastState.match.players[1].militaryValue,
                    economyScore: currentBroadcastState.match.players[1].economyScore,
                    status: currentBroadcastState.match.players[1].status,
                  },
                ],
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

          // Log defeat confirmation progress
          if (ticksWithNoP1Units > 0) {
            logger.debug(`  P1 defeated for ${ticksWithNoP1Units}/${DEFEAT_CONFIRMATION_TICKS} ticks`);
          }
          if (ticksWithNoP2Units > 0) {
            logger.debug(`  P2 defeated for ${ticksWithNoP2Units}/${DEFEAT_CONFIRMATION_TICKS} ticks`);
          }

          // ✅ NEW (EPIC 62 Phase 2): Calculate and emit metrics every 100 ticks
          const allUnits = worldState.agents.filter((a: any) => (a.customData as any)?.type === 'unit');
          const p1Units = allUnits.filter((u: any) => u.controlledByPlayerId?.toString() === '1').length;
          const p2Units = allUnits.filter((u: any) => u.controlledByPlayerId?.toString() === '2').length;

          const p1Trend = p1Units > lastP1Count ? 'up' : p1Units < lastP1Count ? 'down' : 'stable';
          const p2Trend = p2Units > lastP2Count ? 'up' : p2Units < lastP2Count ? 'down' : 'stable';

          lastP1Count = p1Units;
          lastP2Count = p2Units;

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
                civilization: 'athenians',
              },
              player2: {
                name: brainP2 ? 'Ollama AI' : 'Petra AI',
                model: brainP2 ? 'Ollama' : 'petra',
                civilization: 'persians',
              },
              tick,
              isRunning: true,
            };

            const currentState = broadcastState.buildState(broadcastContext);

            broadcastServer.broadcastMessage({
              type: 'event',
              timestamp: Date.now(),
              payload: {
                eventType: 'metrics_update',
                tick: tick,
                matchId: `match-${matchNumber}`,
                metrics: {
                  player1: {
                    unitCount: p1Units,
                    buildings: currentState.match.players[0].buildings,
                    phase: currentState.match.players[0].phase,
                    economyScore: currentState.match.players[0].economyScore,
                    militaryValue: currentState.match.players[0].militaryValue,
                    researched_techs: currentState.match.players[0].researched_techs,
                    trend: p1Trend,
                  },
                  player2: {
                    unitCount: p2Units,
                    buildings: currentState.match.players[1].buildings,
                    phase: currentState.match.players[1].phase,
                    economyScore: currentState.match.players[1].economyScore,
                    militaryValue: currentState.match.players[1].militaryValue,
                    researched_techs: currentState.match.players[1].researched_techs,
                    trend: p2Trend,
                  },
                  gameProgress: {
                    elapsedSeconds: tick / 30,
                    estimatedTimeRemaining: Math.max(0, (maxTicks - tick) / 30),
                    provisionalWinner: p1Units > p2Units ? 'player1' : p2Units > p1Units ? 'player2' : 'tied',
                  },
                },
              },
            });
          } catch (error) {
            logger.debug('Failed to emit metrics', {
              error: error instanceof Error ? error.message : String(error),
            });
          }

          // Generate trash talk every 150 ticks (5 seconds at 30 FPS)
          if (tick % 150 === 0) {
            // Extract real player resources from WorldState
            const player1Resources = (worldState.players[0]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };
            const player2Resources = (worldState.players[1]?.customData as any)?.resources || { food: 0, wood: 0, stone: 0, metal: 0 };

            const gameContext: GameContext = {
              player1: {
                name: 'Ollama',
                unitCount: playerUnits,
                buildingCount: worldState.agents.filter(
                  a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1'
                ).length,
                phase: (worldState.players[0]?.customData as any)?.phase || 'village',
              },
              player2: {
                name: 'Petra',
                unitCount: enemyUnits,
                buildingCount: worldState.agents.filter(
                  a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '2'
                ).length,
                phase: (worldState.players[1]?.customData as any)?.phase || 'village',
              },
              tick,
            };

            trashTalkGenerator.generateTrashTalk(gameContext)
              .then(async (trashTalk) => {
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

                  // ✅ NEW: Generate voice for trash talk using Piper TTS
                  try {
                    const audioPath = await piperTTS.synthesize(trashTalk.message);
                    const httpAudioPath = piperTTS.getHttpPath(audioPath);
                    logger.info('🔊 Trash talk voice synthesized', {
                      speaker: playerName,
                      audioFile: httpAudioPath,
                    });

                    // Broadcast trash talk with audio
                    broadcastServer.broadcastMessage({
                      type: 'event',
                      timestamp: Date.now(),
                      payload: {
                        eventType: 'trash_talk_audio',
                        speaker: playerName,
                        message: trashTalk.message,
                        audioFile: httpAudioPath,
                        tick: trashTalk.tick,
                      },
                    });
                  } catch (ttsError) {
                    logger.warn('Failed to synthesize trash talk voice', {
                      error: ttsError instanceof Error ? ttsError.message : String(ttsError),
                      message: trashTalk.message.substring(0, 60),
                    });
                    // Continue without audio - broadcast text-only
                  }

                  // ✅ NEW (EPIC 62): Update streaming cache for HTTP API
                  streamingCache.recentTrashTalk.push({
                    speaker: trashTalk.speaker,
                    message: trashTalk.message,
                    tick: trashTalk.tick,
                  });
                  if (streamingCache.recentTrashTalk.length > 50) {
                    streamingCache.recentTrashTalk.shift();
                  }

                  // ✅ NEW (EPIC 62 Phase 1): Broadcast trash talk to WebSocket clients
                  broadcastServer.broadcastMessage({
                    type: 'chat',
                    timestamp: Date.now(),
                    payload: {
                      speaker: trashTalk.speaker,
                      message: trashTalk.message,
                      tick: tick,
                      matchId: matchId,
                    },
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

    // ✅ FIX: Handle both winner and timeout cases
    const isTimeout = !matchWinner;
    const matchCompleted = matchWinner || isTimeout; // Match complete if winner found OR timeout reached

    if (matchCompleted) {
      stats.matchesCompleted++;
      if (matchWinner) {
        stats.wins[matchWinner] = (stats.wins[matchWinner] || 0) + 1;
      }

      // Skip rotation tracking - using fixed map for minimap calibration

      // ✅ UPDATED: Use brain IDs for ELO tracking
      const p1BrainName = BRAIN_P1_ID;
      const p2BrainName = BRAIN_P2_ID;

      // Determine ELO result based on matchWinner
      let eloResult = 0.5; // Default to draw (timeout)
      let winnerName = 'Draw';

      if (matchWinner?.includes('Player 1')) {
        eloResult = 1; // P1 wins
        winnerName = `${p1BrainName} (P1)`;
      } else if (matchWinner?.includes('Player 2')) {
        eloResult = 0; // P2 wins
        winnerName = `${p2BrainName} (P2)`;
      } else if (matchWinner?.includes('draw')) {
        eloResult = 0.5;
        winnerName = 'Draw';
      }

      const ratingChanges = eloRating.recordMatch(p1BrainName, p2BrainName, eloResult);
      logger.info('🏆 ELO UPDATED:', {
        match: `${p1BrainName} (P1) vs ${p2BrainName} (P2)`,
        result: eloResult === 1 ? `${p1BrainName} Wins` : eloResult === 0 ? `${p2BrainName} Wins` : 'Draw (Timeout)',
        changes: ratingChanges.map(c => ({
          brain: c.brainId,
          oldRating: c.oldRating,
          newRating: c.newRating,
          change: c.change > 0 ? `+${c.change}` : c.change,
        })),
      });

      matchHistory.push({
        matchId: `match-${matchNumber}`,
        player1: p1BrainName,
        player2: p2BrainName,
        winner: winnerName,
        duration: tick,
        timestamp: Date.now(),
      });

      const rotationStats = matchRotation.getStats();
      const completeMsg = matchWinner
        ? `✅ MATCH ${matchNumber} COMPLETE - Winner: ${matchWinner} (${tick} ticks / ~${Math.round(tick / 10)}s)`
        : `⏱️  MATCH ${matchNumber} TIMEOUT at ${tick}/${maxTicks} ticks (Recorded as Draw)`;
      logger.info(`\n${completeMsg}`);
      logger.info('📊 Map rotation stats', {
        uniqueMaps: rotationStats.uniqueMaps,
        totalMatches: rotationStats.totalMatches,
      });

      // Show current leaderboard
      const rankings = eloRating.getAllRatings();
      logger.info('📈 CURRENT STANDINGS:', {
        rankings: rankings.map((r, idx) => ({
          rank: idx + 1,
          brain: r.brainId,
          rating: r.rating,
          matches: r.ratingHistory.length - 1,
        })),
      });

      return true;
    } else {
      stats.matchesFailed++;
      logger.warn(`\n💥 MATCH ${matchNumber} FAILED`);
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

  // Load rankings from file
  const rankingsFile = path.join(process.cwd(), '.data', 'rankings.json');
  const rankingsLoaded = await eloRating.loadFromFile(rankingsFile);
  if (rankingsLoaded) {
    logger.info('📊 Loaded existing rankings from file');
  } else {
    logger.info('📊 Starting with fresh rankings (no previous data)');
  }

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

      // ✅ CLEANUP: Clear broadcast cache between matches
      streamingCache.currentMatch = null;
      streamingCache.recentTrashTalk = [];
      logger.info('🧹 Cleared broadcast cache for next match');

      // Save rankings to file
      try {
        await eloRating.saveToFile(rankingsFile);
        logger.info('💾 Rankings saved to file');
      } catch (error) {
        logger.warn('⚠️ Failed to save rankings', { error });
      }

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
