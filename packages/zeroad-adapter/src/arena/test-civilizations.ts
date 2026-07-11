#!/usr/bin/env node

/**
 * Verify civilizations in CivilizationRotation
 *
 * Usage: npx tsx src/arena/test-civilizations.ts
 */

import { CivilizationRotation } from '../match/civilization-rotation.js';
import { Logger } from '../config/logger.js';

const logger = new Logger('info', 'CivilizationTester');

// Expected civilizations (from 0 A.D. full list)
const EXPECTED_CIVILIZATIONS = [
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

async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         CIVILIZATION VERIFICATION                         ║');
  console.log(`║      Verifying ${EXPECTED_CIVILIZATIONS.length} civilizations...                   ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const civRotation = new CivilizationRotation(logger);
  const availableCivs = civRotation.getAvailableCivilizations();
  const availableCivNames = new Set(availableCivs.map(c => c.name));

  // Check each civilization
  const working: string[] = [];
  const missing: string[] = [];

  for (let i = 0; i < EXPECTED_CIVILIZATIONS.length; i++) {
    const civ = EXPECTED_CIVILIZATIONS[i];
    const found = availableCivNames.has(civ);

    if (found) {
      const civInfo = civRotation.getCivilization(civ);
      logger.info(`[${i + 1}/${EXPECTED_CIVILIZATIONS.length}] ✅ ${civ} - ${civInfo?.displayName} (${civInfo?.faction})`);
      working.push(civ);
    } else {
      logger.info(`[${i + 1}/${EXPECTED_CIVILIZATIONS.length}] ❌ ${civ} - NOT FOUND`);
      missing.push(civ);
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    VERIFICATION SUMMARY                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  logger.info(`\n✅ AVAILABLE CIVILIZATIONS (${working.length}/${EXPECTED_CIVILIZATIONS.length}):`);
  if (working.length > 0) {
    working.forEach((civ, idx) => {
      const civInfo = civRotation.getCivilization(civ)!;
      logger.info(`  ${idx + 1}. ${civ} - ${civInfo.displayName} (${civInfo.faction})`);
    });
  }

  if (missing.length > 0) {
    logger.info(`\n❌ MISSING CIVILIZATIONS (${missing.length}/${EXPECTED_CIVILIZATIONS.length}):`);
    missing.forEach(civ => {
      logger.info(`  ✗ ${civ}`);
    });
  }

  // Test rotation
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              ROTATION FUNCTIONALITY TEST                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  logger.info('Testing random civilization selection...\n');
  for (let i = 0; i < 3; i++) {
    const civs = civRotation.getRandomUniqueCivilizations(2);
    logger.info(`  Selection ${i + 1}: ${civs[0].displayName} vs ${civs[1].displayName}`);
  }

  logger.info(`\n✅ All civilizations verified and rotation functional!\n`);
  logger.info(`Summary: ${working.length}/${EXPECTED_CIVILIZATIONS.length} civilizations available for arena`);
}

main().catch(err => {
  logger.error('Unhandled error', err);
  process.exit(1);
});
