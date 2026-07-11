#!/usr/bin/env node

/**
 * Test map discovery and RL Interface responses
 *
 * Usage: npx tsx src/arena/test-map-discovery.ts
 */

import { MapDiscovery } from '../match/map-discovery.js';
import { Logger } from '../config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('info', 'MapTest');

async function listMapsInDirectory(): Promise<void> {
  const userProfile = process.env.USERPROFILE;
  if (!userProfile) {
    logger.error('USERPROFILE not set');
    return;
  }

  const gameDataPath = path.join(
    userProfile,
    'AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\data'
  );

  logger.info('🔍 Scanning game data directory...');
  logger.info(`Path: ${gameDataPath}`);

  // Check if path exists
  if (!fs.existsSync(gameDataPath)) {
    logger.error('Game data directory not found');
    return;
  }

  // List skirmishes directory
  const skirmishesPath = path.join(gameDataPath, 'skirmishes');
  if (fs.existsSync(skirmishesPath)) {
    logger.info('\n📁 Skirmishes directory:');
    const files = fs.readdirSync(skirmishesPath);
    console.log('Files found:', files.slice(0, 20).join(', '));
    if (files.length > 20) console.log(`... and ${files.length - 20} more`);

    // Check file types
    const pmpFiles = files.filter(f => f.endsWith('.pmp'));
    const xmlFiles = files.filter(f => f.endsWith('.xml'));
    logger.info(`  .pmp files: ${pmpFiles.length}`);
    logger.info(`  .xml files: ${xmlFiles.length}`);

    if (pmpFiles.length > 0) {
      logger.info(`  Example .pmp: ${pmpFiles[0]}`);
    }
    if (xmlFiles.length > 0) {
      logger.info(`  Example .xml: ${xmlFiles[0]}`);
    }
  } else {
    logger.warn('Skirmishes directory not found');
  }

  // List random_maps directory
  const randomMapsPath = path.join(gameDataPath, 'random_maps');
  if (fs.existsSync(randomMapsPath)) {
    logger.info('\n📁 Random maps directory:');
    const files = fs.readdirSync(randomMapsPath);
    logger.info(`  Files: ${files.length}`);
    if (files.length > 0) {
      console.log('Files:', files.slice(0, 10).join(', '));
    }
  } else {
    logger.warn('Random maps directory not found');
  }
}

async function testMapDiscovery(): Promise<void> {
  logger.info('\n🧪 Testing MapDiscovery service...\n');

  const discovery = new MapDiscovery(logger);

  try {
    const maps = await discovery.discoverMaps();
    logger.info(`✅ Discovered ${maps.length} maps`);

    if (maps.length > 0) {
      logger.info('\n📍 First 5 maps:');
      maps.slice(0, 5).forEach(m => {
        logger.info(`  - ${m.name}`);
        logger.info(`      Display: ${m.displayName}`);
        logger.info(`      Path: ${m.filePath}`);
        logger.info(`      Players: ${m.players}`);
        logger.info(`      Builtin: ${m.isBuiltin}`);
      });
    }

    const exported = await discovery.exportMaps();
    logger.info(`\n📊 Total maps available: ${exported.total}`);
  } catch (error) {
    logger.error('Discovery failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          MAP DISCOVERY DIAGNOSTIC TOOL                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  await listMapsInDirectory();
  await testMapDiscovery();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                  DIAGNOSTIC COMPLETE                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  logger.error('Fatal error', err);
  process.exit(1);
});
