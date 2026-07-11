#!/usr/bin/env node

/**
 * Story R2.2 — Observation Integration Test
 *
 * Receive raw observations from a running 0 A.D. RL Interface instance.
 * Validate observation structure and collect statistics.
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 *
 * Run this test with:
 * npx tsc test-r2-2-observation-integration.ts --module esnext --target es2020 --skipLibCheck true
 * node test-r2-2-observation-integration.js
 */

import { RLHTTPClient, ScenarioConfig } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { ObservationReceiver } from './packages/zeroad-adapter/src/rl-interface/observation-receiver.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;

interface TestResults {
  timestamp: string;
  totalObservations: number;
  validObservations: number;
  invalidObservations: number;
  observationDuration: number;
  observations: Array<{
    tick: number;
    isValid: boolean;
    playersCount: number;
    entitiesCount: number;
    unitsCount: number;
    buildingsCount: number;
    resourcesCount: number;
    errors: string[];
  }>;
}

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  STORY R2.2 — OBSERVATION INTEGRATION TEST   ║');
  console.log('║  Receive and validate raw game observations  ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const logger = new Logger();
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const receiver = new ObservationReceiver(logger);

  const results: TestResults = {
    timestamp: new Date().toISOString(),
    totalObservations: 0,
    validObservations: 0,
    invalidObservations: 0,
    observationDuration: 0,
    observations: [],
  };

  try {
    // Step 1: Check connectivity
    console.log('[STEP 1] Checking RL Interface connectivity...');
    const reachable = await client.isReachable();
    if (!reachable) {
      console.log(
        '✗ Cannot reach RL Interface at {}:{}'.replace(
          '{}',
          RL_HOST
        ).replace('{}', String(RL_PORT))
      );
      console.log(
        'Make sure 0 A.D. is running: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public'
      );
      process.exit(1);
    }
    console.log(`✓ RL Interface reachable at ${RL_HOST}:${RL_PORT}\n`);

    // Step 2: Initialize game
    console.log('[STEP 2] Initializing game with scenario...');
    const scenario: ScenarioConfig = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [{ Civ: 'athen' }, { Civ: 'gaul' }],
      },
    };

    const initialState = await client.reset(scenario);
    console.log(`✓ Game initialized, initial tick: ${initialState.tick}\n`);

    // Step 3: Collect observations over time
    console.log('[STEP 3] Collecting observations (10 ticks)...');
    const startTime = Date.now();
    const observationDuration = 10;

    for (let i = 0; i < observationDuration; i++) {
      console.log(`  Tick ${i + 1}/${observationDuration}...`);

      // Execute step with no commands (just observe)
      const gameState = await client.step([]);

      // Validate observation
      const validation = await receiver.receiveObservation(gameState);

      results.totalObservations++;
      if (validation.isValid) {
        results.validObservations++;
      } else {
        results.invalidObservations++;
      }

      results.observations.push({
        tick: validation.tick,
        isValid: validation.isValid,
        playersCount: validation.stats.playersCount,
        entitiesCount: validation.stats.entitiesCount,
        unitsCount: validation.stats.unitsCount,
        buildingsCount: validation.stats.buildingsCount,
        resourcesCount: validation.stats.resourcesCount,
        errors: validation.errors,
      });

      // Print first observation details
      if (i === 0) {
        console.log('');
        console.log(receiver.generateReport(validation));
      }
    }

    results.observationDuration = Date.now() - startTime;

    // Step 4: Dump raw observation
    console.log('[STEP 4] Raw observation dump (first observation)...');
    const lastObs = receiver.getLastObservation();
    if (lastObs) {
      const obsPath = 'raw-observation-dump.json';
      fs.writeFileSync(obsPath, JSON.stringify(lastObs, null, 2));
      console.log(`✓ Raw observation saved to ${obsPath}\n`);
    }

    // Step 5: Summary
    console.log('[STEP 5] Summary\n');
    console.log('═'.repeat(50));
    console.log('Observations Received');
    console.log('═'.repeat(50));
    console.log(`Total:       ${results.totalObservations}`);
    console.log(`Valid:       ${results.validObservations}`);
    console.log(`Invalid:     ${results.invalidObservations}`);
    console.log(`Duration:    ${results.observationDuration}ms`);
    console.log(`Rate:        ${Math.round((results.totalObservations * 1000) / results.observationDuration)} obs/sec\n`);

    if (results.totalObservations > 0) {
      const avgPlayers =
        results.observations.reduce((s, o) => s + o.playersCount, 0) /
        results.observations.length;
      const avgEntities =
        results.observations.reduce((s, o) => s + o.entitiesCount, 0) /
        results.observations.length;
      const avgUnits =
        results.observations.reduce((s, o) => s + o.unitsCount, 0) /
        results.observations.length;

      console.log('Average per Observation:');
      console.log(`  Players:   ${avgPlayers.toFixed(1)}`);
      console.log(`  Entities:  ${avgEntities.toFixed(1)}`);
      console.log(`  Units:     ${avgUnits.toFixed(1)}\n`);
    }

    // Save results
    const reportPath = 'test-r2-2-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`Results saved to ${reportPath}`);

    if (results.invalidObservations === 0) {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║  ✓ ALL OBSERVATIONS VALID                    ║');
      console.log('║  Story R2.2 Definition of Done: SATISFIED    ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      process.exit(0);
    } else {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║  ⚠ SOME OBSERVATIONS HAD ERRORS              ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
