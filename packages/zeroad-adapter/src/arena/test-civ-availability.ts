#!/usr/bin/env node

/**
 * Test which civilizations have valid AI data in 0 A.D.
 *
 * Usage: npx tsx src/arena/test-civ-availability.ts
 */

import { spawn } from 'child_process';
import { Logger } from '../config/logger.js';

const logger = new Logger('info', 'CivAvailabilityTester');

const CIVILIZATIONS = [
  'athenians',
  'britons',
  'carthaginians',
  'gauls',
  'germans',
  'han',
  'iberians',
  'kushites',
  'macedonians',
  'mauryas',
  'persians',
  'ptolemies',
  'romans',
  'seleucids',
  'spartans',
];

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCivilization(civName: string): Promise<boolean> {
  return new Promise((resolve) => {
    const pyrogenesis =
      process.env.PYROGENESIS ||
      `${process.env.USERPROFILE}\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe`;

    const gameProcess = spawn(pyrogenesis, [
      `--rl-interface=${RL_HOST}:${RL_PORT}`,
      '--mod=public',
      '-autostart=skirmishes/acropolis_bay_2p',
      `-autostart-ai=1:${civName}`,
      '-autostart-ai=2:petra',
      '-xres=1024',
      '-yres=768',
    ]);

    let errorOutput = '';
    let hasError = false;

    gameProcess.stderr?.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      if (text.includes('data.json') || text.includes('not find') || text.includes('ERROR')) {
        hasError = true;
      }
    });

    // Kill process after 10 seconds
    const timeout = setTimeout(() => {
      gameProcess.kill();
    }, 10000);

    gameProcess.on('exit', () => {
      clearTimeout(timeout);

      if (hasError || errorOutput.includes('failed to create AI')) {
        logger.error(`❌ ${civName}`);
        resolve(false);
      } else {
        logger.info(`✅ ${civName}`);
        resolve(true);
      }
    });

    gameProcess.on('error', () => {
      clearTimeout(timeout);
      logger.error(`❌ ${civName} (process error)`);
      resolve(false);
    });
  });
}

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Testing Civilization AI Availability                 ║');
  console.log('║      This may take 2-3 minutes...                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const results: Map<string, boolean> = new Map();

  for (let i = 0; i < CIVILIZATIONS.length; i++) {
    const civ = CIVILIZATIONS[i];
    logger.info(`[${i + 1}/${CIVILIZATIONS.length}] Testing ${civ}...`);
    const works = await testCivilization(civ);
    results.set(civ, works);
    await sleep(2000); // Wait between tests
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const working: string[] = [];
  const broken: string[] = [];

  for (const [civ, works] of results) {
    if (works) {
      working.push(civ);
      logger.info(`✅ ${civ}`);
    } else {
      broken.push(civ);
      logger.error(`❌ ${civ}`);
    }
  }

  console.log(`\n✅ WORKING (${working.length}/${CIVILIZATIONS.length}):`);
  working.forEach(civ => logger.info(`  - ${civ}`));

  if (broken.length > 0) {
    console.log(`\n❌ BROKEN (${broken.length}/${CIVILIZATIONS.length}):`);
    broken.forEach(civ => logger.error(`  - ${civ}`));
  }

  console.log('\n📋 Update civilization-rotation.ts to only include working civilizations');
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
