#!/usr/bin/env node

/**
 * Story R2.1 Protocol Compliance Test - Manual Approach
 *
 * This test assumes 0 A.D. is already running with RL Interface.
 * Run this AFTER starting: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 */

import { RLHTTPClient, GameCommand } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
  details?: unknown;
  error?: string;
}

const results: TestResult[] = [];
const logger = new Logger();

async function testEndpointReachability(): Promise<boolean> {
  console.log('\n[TEST 1] HTTP Endpoint Reachability');
  console.log('─'.repeat(50));

  const client = new RLHTTPClient(RL_HOST, RL_PORT, 5000, logger);

  try {
    const reachable = await client.isReachable();

    if (reachable) {
      const evidence = `✓ Endpoint at ${RL_HOST}:${RL_PORT} is reachable`;
      results.push({
        name: 'Endpoint Reachability',
        status: 'PASS',
        evidence,
      });
      console.log(evidence);
      return true;
    } else {
      const evidence = `✗ Endpoint at ${RL_HOST}:${RL_PORT} not reachable`;
      results.push({
        name: 'Endpoint Reachability',
        status: 'FAIL',
        evidence,
      });
      console.log(evidence);
      return false;
    }
  } catch (error) {
    const evidence = `✗ Error checking reachability: ${error}`;
    results.push({
      name: 'Endpoint Reachability',
      status: 'FAIL',
      evidence,
      error: String(error),
    });
    console.log(evidence);
    return false;
  }
}

async function testResetEndpoint(): Promise<boolean> {
  console.log('\n[TEST 2] POST /reset Endpoint');
  console.log('─'.repeat(50));

  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    const scenario = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [
          { Civ: 'athen' },
          { Civ: 'gaul' },
        ],
      },
    };

    console.log('Sending POST /reset with scenario config...');
    const startTime = Date.now();
    const gameState = await client.reset(scenario);
    const elapsed = Date.now() - startTime;

    const evidence = `✓ POST /reset successful (${elapsed}ms)`;
    const details = {
      tick: gameState.tick,
      responseKeys: Object.keys(gameState),
      responseSize: JSON.stringify(gameState).length,
    };

    results.push({
      name: 'POST /reset',
      status: 'PASS',
      evidence,
      details,
    });

    console.log(evidence);
    console.log(`  Tick: ${gameState.tick}`);
    console.log(`  Response keys: ${Object.keys(gameState).join(', ')}`);
    console.log(`  Response size: ${JSON.stringify(gameState).length} bytes`);

    return true;
  } catch (error) {
    const evidence = `✗ POST /reset failed`;
    results.push({
      name: 'POST /reset',
      status: 'FAIL',
      evidence,
      error: String(error),
    });
    console.log(evidence);
    console.log(`  Error: ${error}`);
    return false;
  }
}

async function testStepEndpointEmpty(): Promise<boolean> {
  console.log('\n[TEST 3] POST /step Endpoint (Empty Commands)');
  console.log('─'.repeat(50));

  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    // First reset
    const scenario = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [
          { Civ: 'athen' },
          { Civ: 'gaul' },
        ],
      },
    };

    console.log('Resetting game first...');
    await client.reset(scenario);

    console.log('Sending POST /step with empty commands...');
    const startTime = Date.now();
    const gameState = await client.step([]);
    const elapsed = Date.now() - startTime;

    const evidence = `✓ POST /step (empty) successful (${elapsed}ms)`;
    const details = {
      tick: gameState.tick,
      responseKeys: Object.keys(gameState),
    };

    results.push({
      name: 'POST /step (empty)',
      status: 'PASS',
      evidence,
      details,
    });

    console.log(evidence);
    console.log(`  Tick: ${gameState.tick}`);

    return true;
  } catch (error) {
    const evidence = `✗ POST /step (empty) failed`;
    results.push({
      name: 'POST /step (empty)',
      status: 'FAIL',
      evidence,
      error: String(error),
    });
    console.log(evidence);
    console.log(`  Error: ${error}`);
    return false;
  }
}

async function testStepEndpointWithCommand(): Promise<boolean> {
  console.log('\n[TEST 4] POST /step Endpoint (With Command)');
  console.log('─'.repeat(50));

  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    const commands: GameCommand[] = [
      {
        playerID: 1,
        json_cmd: { type: 'Ping' },
      },
    ];

    console.log('Sending POST /step with test command...');
    const startTime = Date.now();
    const gameState = await client.step(commands);
    const elapsed = Date.now() - startTime;

    const evidence = `✓ POST /step (with command) successful (${elapsed}ms)`;
    const details = {
      tick: gameState.tick,
      commandsSent: 1,
    };

    results.push({
      name: 'POST /step (with command)',
      status: 'PASS',
      evidence,
      details,
    });

    console.log(evidence);
    console.log(`  Tick: ${gameState.tick}`);
    console.log(`  Commands sent: 1`);

    return true;
  } catch (error) {
    const evidence = `✗ POST /step (with command) failed`;
    results.push({
      name: 'POST /step (with command)',
      status: 'FAIL',
      evidence,
      error: String(error),
    });
    console.log(evidence);
    console.log(`  Error: ${error}`);
    return false;
  }
}

async function testEvaluateEndpoint(): Promise<boolean> {
  console.log('\n[TEST 5] POST /evaluate Endpoint');
  console.log('─'.repeat(50));

  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    console.log('Sending POST /evaluate with JavaScript code...');
    const startTime = Date.now();
    const result = await client.evaluate('1 + 1');
    const elapsed = Date.now() - startTime;

    const evidence = `✓ POST /evaluate successful (${elapsed}ms)`;
    const details = {
      result,
      resultLength: result.length,
    };

    results.push({
      name: 'POST /evaluate',
      status: 'PASS',
      evidence,
      details,
    });

    console.log(evidence);
    console.log(`  Result: ${result}`);

    return true;
  } catch (error) {
    const evidence = `✗ POST /evaluate failed`;
    results.push({
      name: 'POST /evaluate',
      status: 'FAIL',
      evidence,
      error: String(error),
    });
    console.log(evidence);
    console.log(`  Error: ${error}`);
    return false;
  }
}

async function main(): Promise<void> {
  console.log('╔' + '═'.repeat(48) + '╗');
  console.log('║  STORY R2.1 — PROTOCOL COMPLIANCE TEST      ║');
  console.log('║  Verify all RL Interface endpoints work      ║');
  console.log('╚' + '═'.repeat(48) + '╝');

  // Run all tests sequentially
  const reachable = await testEndpointReachability();
  if (!reachable) {
    console.log('\n❌ Cannot reach RL Interface. Make sure 0 A.D. is running:');
    console.log(`   pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public`);
    process.exit(1);
  }

  await testResetEndpoint();
  await testStepEndpointEmpty();
  await testStepEndpointWithCommand();
  await testEvaluateEndpoint();

  // Print summary
  console.log('\n' + '═'.repeat(50));
  console.log('TEST SUMMARY');
  console.log('═'.repeat(50));

  let passCount = 0;
  let failCount = 0;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✓' : '✗';
    console.log(`${icon} ${result.name}: ${result.evidence}`);
    if (result.details) {
      console.log(`  Details: ${JSON.stringify(result.details)}`);
    }
    if (result.error) {
      console.log(`  Error: ${result.error}`);
    }

    if (result.status === 'PASS') passCount++;
    else failCount++;
  }

  console.log(`\nResults: ${passCount} PASS, ${failCount} FAIL out of ${results.length} tests`);

  // Save report
  const reportPath = 'test-r2-1-report.json';
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        story: 'R2.1 - Protocol Compliance',
        summary: {
          pass: passCount,
          fail: failCount,
          total: results.length,
        },
        allPassed: failCount === 0,
        results,
      },
      null,
      2
    )
  );

  console.log(`\nReport saved to ${reportPath}`);

  if (failCount === 0) {
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  ✓ ALL TESTS PASSED                        ║');
    console.log('║  Story R2.1 Definition of Done: SATISFIED   ║');
    console.log('╚' + '═'.repeat(48) + '╝\n');
    process.exit(0);
  } else {
    console.log('\n╔' + '═'.repeat(48) + '╗');
    console.log('║  ✗ SOME TESTS FAILED                       ║');
    console.log('╚' + '═'.repeat(48) + '╝\n');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
