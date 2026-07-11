#!/usr/bin/env node

/**
 * Test user-provided maps to find which ones work
 *
 * Usage: npx tsx src/arena/test-user-maps.ts
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('info', 'UserMapTester');

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

// Maps from the user's list - extract player count from display name
const mapsToTest = [
  { displayName: 'Acropolis Bay', players: 2 },
  { displayName: 'Alpine Mountains', players: 3 },
  { displayName: 'Alpine Valleys', players: 2 },
  { displayName: 'Arabian Oases', players: 2 },
  { displayName: 'Atlas Valleys', players: 8 },
  { displayName: 'Bactriana', players: 2 },
  { displayName: 'Barcania', players: 3 },
  { displayName: 'Belgian Bog', players: 2 },
  { displayName: 'Caspian Sea', players: 2 }, // Note: game shows "2v2" but testing as 2p
  { displayName: 'Cisalpine Winter', players: 2 },
  { displayName: 'Coele-Syria', players: 2 },
  { displayName: 'Corinthian Isthmus', players: 2 },
  { displayName: 'Corinthian Isthmus', players: 4 },
  { displayName: 'Crocodilopolis', players: 4 },
  { displayName: 'Death Canyon', players: 2 },
  { displayName: 'Deccan Plateau', players: 2 },
  { displayName: 'Dueling Cliffs', players: 3 }, // Note: "3v3" = 3p
  { displayName: 'Egypt', players: 3 }, // Note: "3v3" = 3p
  { displayName: 'Farmland', players: 2 },
  { displayName: 'Forest Battle', players: 4 },
  { displayName: 'Gallic Fields', players: 3 },
  { displayName: 'Gallic Highlands', players: 2 },
  { displayName: 'Gambia River', players: 3 },
  { displayName: 'Gold Oasis', players: 2 },
  { displayName: 'Golden Island', players: 2 },
  { displayName: 'Greek Acropolis', players: 2 },
  { displayName: 'Greek Acropolis', players: 4 },
  { displayName: 'Greek Acropolis Night', players: 2 },
  { displayName: 'Hindu Kush', players: 2 },
  { displayName: 'Hydaspes River', players: 4 },
  { displayName: 'Island of Meroë', players: 2 },
  { displayName: 'Isthmus of Corinth', players: 2 },
  { displayName: 'Libyan Oases', players: 4 },
  { displayName: 'Libyan Oasis', players: 2 },
  { displayName: 'Lorraine Plain', players: 2 },
  { displayName: 'Magadha', players: 2 },
  { displayName: 'Median Oasis', players: 2 },
  { displayName: 'Median Oasis', players: 4 },
  { displayName: 'Mediterranean Coves', players: 2 },
  { displayName: 'Miletus Peninsula', players: 2 },
  { displayName: 'Neareastern Badlands', players: 2 },
  { displayName: 'Neareastern Badlands', players: 4 },
  { displayName: 'Northern Island', players: 2 },
  { displayName: 'Nubian Frontier', players: 2 },
  { displayName: 'Obedska Bog', players: 4 },
];

/**
 * Convert display name to potential map file names
 * E.g., "Acropolis Bay" -> ["acropolis_bay_2p", "acropolis_bay", ...]
 */
function getMapFileVariants(displayName: string, players: number): string[] {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return [
    `${base}_${players}p`,        // acropolis_bay_2p
    `${base}_${players}`,         // acropolis_bay_2
    base,                         // acropolis_bay
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

  logger.info(`🧪 Testing: ${displayName} (${players}p) - Variant: ${variant}`);

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

    // Try to connect to RL Interface
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
          logger.info(`  ✅ SUCCESS with variant: ${variant}`);
          await killGame();
          return { displayName: `${displayName} (${players}p)`, mapName: variant, players, success: true, tick };
        }
      } catch (error) {
        await sleep(1000);
      }
    }

    await killGame();

    // Try next variant if available
    if (attempt < variants.length - 1) {
      logger.info(`  ⏭️  Variant failed, trying next...`);
      await sleep(1000);
      return testMap(displayName, players, attempt + 1);
    }

    logger.info(`  ❌ FAILED - No variants worked`);
    return {
      displayName: `${displayName} (${players}p)`,
      mapName: variant,
      players,
      success: false,
      error: 'RL Interface timeout',
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.info(`  ❌ FAILED - ${errorMsg}`);

    // Try next variant if available
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
  console.log('║         USER-PROVIDED MAPS TESTING SUITE                   ║');
  console.log(`║      Testing ${mapsToTest.length} maps from user list...                  ║`);
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
    failed.slice(0, 10).forEach(r => {
      logger.info(`  ✗ ${r.displayName}`);
    });
    if (failed.length > 10) {
      logger.info(`  ... and ${failed.length - 10} more`);
    }
  }

  // Generate recommended fallback list - sorted by player count
  if (successful.length > 0) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            RECOMMENDED MAP LIST FOR FALLBACK               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Sort by player count
    const sorted = [...successful].sort((a, b) => a.players - b.players);

    logger.info('Add this to map-discovery.ts FALLBACK_MAPS array:\n');
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

    // Summary stats
    const twoPlayer = sorted.filter(m => m.players === 2);
    const threePlus = sorted.filter(m => m.players >= 3);

    logger.info(`\n📊 Map Distribution:`);
    logger.info(`  2-Player maps: ${twoPlayer.length}`);
    logger.info(`  3+ Player maps: ${threePlus.length}`);
    logger.info(`  Total working: ${successful.length}/${results.length}`);
  }

  logger.info(`\nTotal working maps: ${successful.length}/${results.length}`);
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
