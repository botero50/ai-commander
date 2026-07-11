#!/usr/bin/env node

/**
 * Test all available maps to find which ones actually work
 *
 * Usage: npx tsx src/arena/test-all-maps.ts
 */

import { spawn, exec, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { RLHTTPClient } from '../rl-interface/http-client.js';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);
const logger = new Logger('info', 'MapTester');

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const GAME_STARTUP_WAIT = 8000; // Wait 8 seconds for game to start
const RL_CONNECT_TIMEOUT = 15000; // Try for 15 seconds

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
  map: string;
  displayName: string;
  players: number;
  success: boolean;
  tick?: number;
  error?: string;
}

const mapsToTest = [
  { name: 'acropolis_bay_2p', displayName: 'Acropolis Bay', players: 2 },
  { name: 'alpine_mountains_3p', displayName: 'Alpine Mountains', players: 3 },
  { name: 'ambush_valley_2p', displayName: 'Ambush Valley', players: 2 },
  { name: 'cantabria_2p', displayName: 'Cantabria', players: 2 },
  { name: 'hideouts_2p', displayName: 'Hideouts', players: 2 },
  { name: 'islands_2p', displayName: 'Islands', players: 2 },
  { name: 'nomad_2p', displayName: 'Nomad', players: 2 },
  { name: 'setons_2p', displayName: "Setons' Way", players: 2 },
  { name: 'sinai_2p', displayName: 'Sinai', players: 2 },
  { name: 'the_great_lakes_2p', displayName: 'The Great Lakes', players: 2 },
];

async function testMap(mapName: string, displayName: string, players: number): Promise<MapTestResult> {
  logger.info(`\n🧪 Testing: ${displayName} (${mapName})...`);

  await killGame();
  await sleep(500);

  const pyrogenesis =
    process.env.PYROGENESIS ||
    `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

  if (!fs.existsSync(pyrogenesis)) {
    return {
      map: mapName,
      displayName,
      players,
      success: false,
      error: 'Pyrogenesis executable not found',
    };
  }

  const mapPath = `skirmishes/${mapName}`;

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

    logger.info(`  ⏳ Waiting ${GAME_STARTUP_WAIT / 1000}s for game to start...`);
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
          logger.info(`  ✅ SUCCESS! Tick: ${tick}`);
          await killGame();
          return { map: mapName, displayName, players, success: true, tick };
        }
      } catch (error) {
        await sleep(1000);
      }
    }

    if (!connected) {
      // Check stderr for helpful error messages
      const errorLines = stderrOutput
        .split('\n')
        .filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('failed'))
        .slice(0, 3);

      const error = errorLines.length > 0 ? errorLines[0] : 'RL Interface timeout';

      logger.info(`  ❌ FAILED - ${error}`);
      await killGame();
      return { map: mapName, displayName, players, success: false, error };
    }

    await killGame();
    return { map: mapName, displayName, players, success: true, tick };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.info(`  ❌ FAILED - ${errorMsg}`);
    await killGame();
    return { map: mapName, displayName, players, success: false, error: errorMsg };
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║           COMPREHENSIVE MAP TESTING SUITE                  ║');
  console.log('║      Testing all 10 maps to find which ones work...        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results: MapTestResult[] = [];

  for (const mapInfo of mapsToTest) {
    const result = await testMap(mapInfo.name, mapInfo.displayName, mapInfo.players);
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
    successful.forEach(r => {
      logger.info(`  ✓ ${r.displayName} (${r.map}) - Tick: ${r.tick}`);
    });
  } else {
    logger.info('  (none)');
  }

  logger.info(`\n❌ BROKEN MAPS (${failed.length}/${results.length}):`);
  if (failed.length > 0) {
    failed.forEach(r => {
      logger.info(`  ✗ ${r.displayName} (${r.map})`);
      if (r.error) {
        logger.info(`      Error: ${r.error}`);
      }
    });
  } else {
    logger.info('  (none)');
  }

  // Generate recommended fallback list
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║            RECOMMENDED MAP LIST FOR FALLBACK               ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  logger.info('Add this to map-discovery.ts FALLBACK_MAPS array:\n');
  console.log('```typescript');
  successful.forEach(r => {
    console.log(`  {`);
    console.log(`    name: '${r.map}',`);
    console.log(`    displayName: '${r.displayName}',`);
    console.log(`    filePath: 'skirmishes/${r.map}',`);
    console.log(`    players: ${r.players},`);
    console.log(`    isBuiltin: true,`);
    console.log(`  },`);
  });
  console.log('```\n');

  logger.info(`\nTotal working maps: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    logger.info(`\nMissing maps: ${failed.map(r => r.map).join(', ')}`);
    logger.info('These maps may need to be downloaded or installed separately.');
  }
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
