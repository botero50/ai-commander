#!/usr/bin/env node

/**
 * Test additional maps found by user
 *
 * Usage: npx tsx src/arena/test-additional-maps.ts
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('info', 'AdditionalMapTester');

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const GAME_STARTUP_WAIT = 8000;
const RL_CONNECT_TIMEOUT = 15000;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function killGame(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /IM pyrogenesis.exe 2>nul');
    } else {
      await execAsync('pkill -9 pyrogenesis');
    }
    await sleep(1000);
  } catch (error) {
    // Ignore
  }
}

interface MapTestResult {
  displayName: string;
  mapName: string;
  players: number;
  success: boolean;
  tick?: number;
  error?: string;
}

// User's additional maps to test
const mapsToTest = [
  { displayName: 'Obedska Bog Night', players: 4 },
  { displayName: 'Oceanside', players: 2 },
  { displayName: 'Persian Highlands', players: 4 },
  { displayName: 'Punjab', players: 2 },
  { displayName: 'Saharan Oases', players: 2 },
  { displayName: 'Saharan Oases', players: 4 },
  { displayName: 'Sahel', players: 4 },
  { displayName: 'Sahyadri Buttes', players: 5 },
  { displayName: 'Savanna River', players: 2 },
  { displayName: 'Scythian Steppes', players: 4 },
  { displayName: 'Sicilia', players: 2 },
  { displayName: 'Sicilia Nomad', players: 2 },
  { displayName: 'Tarim Basin', players: 2 },
  { displayName: 'Tarim Basin', players: 4 },
  { displayName: 'Team Oasis', players: 2 }, // 2v2 = 2p
  { displayName: 'Temperate Roadway', players: 2 },
  { displayName: 'Thessalian Plains', players: 4 },
  { displayName: 'Tuscan Acropolis', players: 4 },
  { displayName: 'Two Seas', players: 6 },
  { displayName: 'Vesuvius', players: 6 },
  { displayName: 'Via Augusta', players: 4 },
  { displayName: 'Watering Holes', players: 4 },
  { displayName: 'White Cliffs of Dover', players: 5 },
  { displayName: 'Zagros Mountains', players: 2 },
];

/**
 * Convert display name to map file name variants
 */
function getMapFileVariants(displayName: string, players: number): string[] {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return [
    `${base}_${players}p`,
    `${base}_${players}`,
    base,
  ];
}

async function testMap(displayName: string, players: number, attempt: number = 0): Promise<MapTestResult> {
  const variants = getMapFileVariants(displayName, players);
  const variant = variants[attempt];

  if (!variant) {
    return {
      displayName: `${displayName} (${players}p)`,
      mapName: variants[0],
      players,
      success: false,
      error: 'All naming variants failed',
    };
  }

  logger.info(`Testing: ${displayName} (${players}p) - Variant: ${variant}`);

  await killGame();
  await sleep(500);

  const pyrogenesis =
    process.env.PYROGENESIS ||
    `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

  if (!fs.existsSync(pyrogenesis)) {
    return {
      displayName: `${displayName} (${players}p)`,
      mapName: variant,
      players,
      success: false,
      error: 'Pyrogenesis executable not found',
    };
  }

  const mapPath = `skirmishes/${variant}`;

  try {
    const gameProcess = spawn(pyrogenesis, [
      `--rl-interface=${RL_HOST}:${RL_PORT}`,
      '--mod=public',
      `-autostart=${mapPath}`,
      '-autostart-ai=1:petra',
      '-autostart-ai=2:petra',
      '-xres=1920',
      '-yres=1080',
    ]);

    let stderrOutput = '';
    gameProcess.stderr?.on('data', data => {
      stderrOutput += data.toString();
    });

    await sleep(GAME_STARTUP_WAIT);

    const startTime = Date.now();
    const client = new RLHTTPClient(RL_HOST, RL_PORT, 5000, logger);
    let connected = false;
    let tick = 0;

    while (Date.now() - startTime < RL_CONNECT_TIMEOUT && !connected) {
      try {
        const state = await client.step([]);
        if (state && (state as any).tick) {
          tick = (state as any).tick;
          connected = true;
          logger.info(`  SUCCESS with variant: ${variant} (Tick: ${tick})`);
          await killGame();
          return { displayName: `${displayName} (${players}p)`, mapName: variant, players, success: true, tick };
        }
      } catch (error) {
        await sleep(1000);
      }
    }

    await killGame();

    if (attempt < variants.length - 1) {
      logger.info(`  Variant failed, trying next...`);
      await sleep(1000);
      return testMap(displayName, players, attempt + 1);
    }

    logger.info(`  FAILED - No variants worked`);
    return {
      displayName: `${displayName} (${players}p)`,
      mapName: variant,
      players,
      success: false,
      error: 'RL Interface timeout',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.info(`  FAILED - ${errorMsg}`);

    if (attempt < getMapFileVariants(displayName, players).length - 1) {
      await killGame();
      return testMap(displayName, players, attempt + 1);
    }

    await killGame();
    return { displayName: `${displayName} (${players}p)`, mapName: variant, players, success: false, error: errorMsg };
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         ADDITIONAL MAPS TESTING SUITE                      ║');
  console.log(`║      Testing ${mapsToTest.length} maps from user list...                       ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results: MapTestResult[] = [];

  for (let i = 0; i < mapsToTest.length; i++) {
    const mapInfo = mapsToTest[i];
    logger.info(`\n[${i + 1}/${mapsToTest.length}] Testing ${mapInfo.displayName}`);
    const result = await testMap(mapInfo.displayName, mapInfo.players);
    results.push(result);
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  logger.info(`\n✅ WORKING MAPS (${successful.length}/${results.length}):`);
  if (successful.length > 0) {
    successful.forEach((r, idx) => {
      logger.info(`  ${idx + 1}. ${r.displayName} -> skirmishes/${r.mapName}`);
    });
  } else {
    logger.info('  (none)');
  }

  logger.info(`\n❌ FAILED MAPS (${failed.length}/${results.length}):`);
  if (failed.length > 0) {
    failed.forEach(r => {
      logger.info(`  ✗ ${r.displayName}`);
    });
  }

  // Generate recommended list
  if (successful.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            MAPS TO ADD TO map-discovery.ts                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    const sorted = [...successful].sort((a, b) => a.players - b.players);

    logger.info('Add these to FALLBACK_MAPS array:\n');
    console.log('```typescript');
    sorted.forEach(r => {
      console.log(`  {`);
      console.log(`    name: '${r.mapName}',`);
      console.log(`    displayName: '${r.displayName}',`);
      console.log(`    filePath: 'skirmishes/${r.mapName}',`);
      console.log(`    players: ${r.players},`);
      console.log(`    isBuiltin: true,`);
      console.log(`  },`);
    });
    console.log('```\n');

    const twoPlayer = sorted.filter(m => m.players === 2);
    const threePlus = sorted.filter(m => m.players >= 3);

    logger.info(`\nMap Distribution:`);
    logger.info(`  2-Player maps: ${twoPlayer.length}`);
    logger.info(`  3+ Player maps: ${threePlus.length}`);
    logger.info(`  Total new maps: ${successful.length}`);
  }

  logger.info(`\nTotal working maps: ${successful.length}/${results.length}`);
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
