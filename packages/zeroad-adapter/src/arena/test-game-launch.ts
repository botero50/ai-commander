#!/usr/bin/env node

/**
 * Test game launch with map and check RL Interface responses
 *
 * Usage: npx tsx src/arena/test-game-launch.ts
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('info', 'GameLaunchTest');

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const GAME_STARTUP_WAIT = 10000; // Wait 10 seconds for game to start

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function killGame(): Promise<void> {
  try {
    logger.info('🔴 Killing any running 0 A.D. processes...');
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM pyrogenesis.exe 2>nul');
    } else {
      await execAsync('pkill -9 pyrogenesis');
    }
    logger.info('✓ Processes killed');
    await sleep(2000);
  } catch (error) {
    logger.warn('No running processes or kill failed (this is OK)');
  }
}

async function findGameData(): Promise<void> {
  logger.info('\n🔍 Searching for 0 A.D. game data...\n');

  const userProfile = process.env.USERPROFILE;
  if (!userProfile) {
    logger.error('USERPROFILE not set');
    return;
  }

  const basePath = path.join(userProfile, 'AppData\\Local\\0 A.D. Empires Ascendant');
  const dataPath = path.join(basePath, 'binaries\\data');

  logger.info(`Base path: ${basePath}`);
  logger.info(`Data path: ${dataPath}`);

  if (fs.existsSync(basePath)) {
    logger.info('✓ Base installation directory found');
  } else {
    logger.warn('✗ Base installation directory NOT found');
  }

  if (fs.existsSync(dataPath)) {
    logger.info('✓ Data directory found');

    // List subdirectories
    const contents = fs.readdirSync(dataPath);
    const dirs = contents.filter(f => {
      try {
        return fs.statSync(path.join(dataPath, f)).isDirectory();
      } catch {
        return false;
      }
    });

    logger.info(`  Subdirectories: ${dirs.join(', ')}`);

    // Check for maps
    const possibleMapDirs = ['maps', 'skirmishes', 'scenarios', 'random_maps'];
    for (const dir of possibleMapDirs) {
      const fullPath = path.join(dataPath, dir);
      if (fs.existsSync(fullPath)) {
        const files = fs.readdirSync(fullPath);
        logger.info(`  📁 ${dir}/: ${files.length} files`);
        if (files.length > 0) {
          const extensions = new Set(files.map(f => path.extname(f)));
          logger.info(`     File types: ${Array.from(extensions).join(', ')}`);
          logger.info(`     Example: ${files[0]}`);
        }
      }
    }
  } else {
    logger.warn('✗ Data directory NOT found');
  }
}

async function testGameLaunch(): Promise<void> {
  logger.info('\n🎮 Testing game launch with map...\n');

  await killGame();

  logger.info('🟢 Starting 0 A.D. with test map...');

  const pyrogenesis =
    process.env.PYROGENESIS ||
    `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

  if (!fs.existsSync(pyrogenesis)) {
    logger.error(`Pyrogenesis not found at: ${pyrogenesis}`);
    return;
  }

  logger.info(`Executable: ${pyrogenesis}`);

  // Try different map formats
  const mapFormats = [
    'skirmishes/acropolis_bay_2p',      // Standard format
    'maps/skirmishes/acropolis_bay_2p', // Full path
    'acropolis_bay_2p',                  // Just name
  ];

  for (const mapFormat of mapFormats) {
    logger.info(`\n  Testing map format: "${mapFormat}"`);

    await killGame();
    await sleep(1000);

    const gameProcess = spawn(pyrogenesis, [
      `--rl-interface=${RL_HOST}:${RL_PORT}`,
      '--mod=public',
      `-autostart=${mapFormat}`,
      '-autostart-ai=1:petra',
      '-autostart-ai=2:petra',
      '-xres=1920',
      '-yres=1080',
    ]);

    // Capture stderr
    let stderr = '';
    gameProcess.stderr?.on('data', data => {
      stderr += data.toString();
    });

    logger.info(`  ⏳ Waiting ${GAME_STARTUP_WAIT / 1000}s for game to start...`);
    await sleep(GAME_STARTUP_WAIT);

    // Try to connect to RL Interface
    const client = new RLHTTPClient(RL_HOST, RL_PORT, 5000, logger);
    try {
      const state = await client.step([]);
      if (state) {
        logger.info(`  ✅ SUCCESS! Game started and RL Interface responding`);
        logger.info(`  Game tick: ${(state as any).tick || 'unknown'}`);

        // Kill game and move to next test
        await killGame();
        return; // Success!
      }
    } catch (error) {
      logger.info(`  ❌ RL Interface not responding`);

      // Check stderr for clues
      if (stderr.length > 0) {
        const lines = stderr.split('\n').filter(l => l.includes('map') || l.includes('Map'));
        if (lines.length > 0) {
          logger.info(`  Game errors:`, lines.slice(0, 3));
        }
      }
    }

    await killGame();
  }

  logger.warn('⚠️  No map format worked. Check game installation and map files.');
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        GAME LAUNCH & MAP DISCOVERY DIAGNOSTIC TOOL         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    await findGameData();
    await testGameLaunch();
  } catch (error) {
    logger.error('Fatal error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  DIAGNOSTIC COMPLETE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
