#!/usr/bin/env node

/**
 * Story R2.1 Protocol Compliance Test
 *
 * Verify all RL Interface endpoints work with official protocol.
 * Tests against a real running 0 A.D. instance.
 */

import { spawn } from 'child_process';
import { RLHTTPClient, GameCommand } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const GAME_EXE = 'C:\\Users\\boter\\AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe';
const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const STARTUP_DELAY = 5000; // ms

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  evidence: string;
  error?: string;
}

const results: TestResult[] = [];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startGame(): Promise<any> {
  console.log('[SETUP] Starting 0 A.D. with RL Interface...');

  const proc = spawn(GAME_EXE, [
    `--rl-interface=${RL_HOST}:${RL_PORT}`,
    '--mod=public',
  ], {
    detached: false,
    stdio: 'pipe',
  });

  console.log(`[SETUP] Process started, PID: ${proc.pid}`);
  await sleep(STARTUP_DELAY);

  return proc;
}

async function testEndpointConnectivity(logger: Logger): Promise<boolean> {
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 5000, logger);

  try {
    const reachable = await client.isReachable();
    const evidence = `RL Interface reachable: ${reachable}`;

    if (reachable) {
      results.push({
        name: 'Endpoint Connectivity',
        status: 'PASS',
        evidence,
      });
      console.log(`✓ PASS: Endpoint Connectivity - ${evidence}`);
      return true;
    } else {
      results.push({
        name: 'Endpoint Connectivity',
        status: 'FAIL',
        evidence: 'Not reachable',
      });
      console.log(`✗ FAIL: Endpoint Connectivity`);
      return false;
    }
  } catch (error) {
    results.push({
      name: 'Endpoint Connectivity',
      status: 'FAIL',
      evidence: String(error),
      error: String(error),
    });
    console.log(`✗ FAIL: Endpoint Connectivity - ${error}`);
    return false;
  }
}

async function testResetEndpoint(logger: Logger): Promise<boolean> {
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    // Minimal scenario config
    const scenario = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [
          { Civ: 'athen' },
          { Civ: 'gaul' },
        ],
      },
    };

    console.log('\n[TEST] POST /reset with scenario config...');
    const gameState = await client.reset(scenario);

    const evidence = `Reset successful. Response keys: ${Object.keys(gameState).join(', ')}`;
    results.push({
      name: 'POST /reset',
      status: 'PASS',
      evidence,
    });
    console.log(`✓ PASS: POST /reset - ${evidence}`);
    return true;
  } catch (error) {
    results.push({
      name: 'POST /reset',
      status: 'FAIL',
      evidence: String(error),
      error: String(error),
    });
    console.log(`✗ FAIL: POST /reset - ${error}`);
    return false;
  }
}

async function testStepEndpoint(logger: Logger): Promise<boolean> {
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    // First reset to get a valid game state
    const scenario = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [
          { Civ: 'athen' },
          { Civ: 'gaul' },
        ],
      },
    };

    console.log('\n[TEST] Resetting game before step test...');
    await client.reset(scenario);

    // Now test step with empty commands
    console.log('[TEST] POST /step with empty commands...');
    const commands: GameCommand[] = [];
    const gameState = await client.step(commands);

    const evidence = `Step successful. Response keys: ${Object.keys(gameState).join(', ')}`;
    results.push({
      name: 'POST /step (empty)',
      status: 'PASS',
      evidence,
    });
    console.log(`✓ PASS: POST /step (empty) - ${evidence}`);

    // Now test with actual command
    console.log('[TEST] POST /step with sample command...');
    const commandsWithData: GameCommand[] = [
      {
        playerID: 1,
        json_cmd: { type: 'Ping' },
      },
    ];
    const gameState2 = await client.step(commandsWithData);

    const evidence2 = `Step with command successful. Response keys: ${Object.keys(gameState2).join(', ')}`;
    results.push({
      name: 'POST /step (with command)',
      status: 'PASS',
      evidence: evidence2,
    });
    console.log(`✓ PASS: POST /step (with command) - ${evidence2}`);

    return true;
  } catch (error) {
    results.push({
      name: 'POST /step',
      status: 'FAIL',
      evidence: String(error),
      error: String(error),
    });
    console.log(`✗ FAIL: POST /step - ${error}`);
    return false;
  }
}

async function testEvaluateEndpoint(logger: Logger): Promise<boolean> {
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);

  try {
    console.log('\n[TEST] POST /evaluate with JavaScript code...');
    const result = await client.evaluate('1 + 1');

    const evidence = `Evaluate successful. Result: ${result}`;
    results.push({
      name: 'POST /evaluate',
      status: 'PASS',
      evidence,
    });
    console.log(`✓ PASS: POST /evaluate - ${evidence}`);
    return true;
  } catch (error) {
    results.push({
      name: 'POST /evaluate',
      status: 'FAIL',
      evidence: String(error),
      error: String(error),
    });
    console.log(`✗ FAIL: POST /evaluate - ${error}`);
    return false;
  }
}

async function runTests(): Promise<void> {
  const logger = new Logger();

  let gameProcess: NodeJS.Process | null = null;

  try {
    console.log('========================================');
    console.log('Story R2.1 - Protocol Compliance Test');
    console.log('========================================\n');

    // Start game
    gameProcess = (await startGame()) as any;

    // Run tests
    const connectivityOk = await testEndpointConnectivity(logger);
    if (!connectivityOk) {
      console.log('\n[ERROR] Cannot reach RL Interface, stopping tests');
      process.exit(1);
    }

    const resetOk = await testResetEndpoint(logger);
    const stepOk = await testStepEndpoint(logger);
    const evaluateOk = await testEvaluateEndpoint(logger);

    // Print summary
    console.log('\n========================================');
    console.log('Test Summary');
    console.log('========================================\n');

    let passCount = 0;
    let failCount = 0;

    for (const result of results) {
      const status = result.status === 'PASS' ? '✓' : '✗';
      console.log(`${status} ${result.name}: ${result.evidence}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }

      if (result.status === 'PASS') passCount++;
      else failCount++;
    }

    console.log(`\nTotal: ${passCount} PASS, ${failCount} FAIL\n`);

    // Save results
    const reportPath = 'test-r2-1-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      story: 'R2.1 - Protocol Compliance',
      summary: {
        pass: passCount,
        fail: failCount,
        total: results.length,
      },
      results,
    }, null, 2));

    console.log(`Report saved to ${reportPath}`);

    if (failCount === 0) {
      console.log('\n========================================');
      console.log('✓ ALL TESTS PASSED');
      console.log('Story R2.1 Definition of Done: SATISFIED');
      console.log('========================================\n');
      process.exit(0);
    } else {
      console.log('\n========================================');
      console.log('✗ SOME TESTS FAILED');
      console.log('========================================\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('[ERROR]', error);
    process.exit(1);
  } finally {
    if (gameProcess) {
      console.log('\n[CLEANUP] Killing game process...');
      try {
        gameProcess.kill(15); // SIGTERM
        await sleep(1000);
        gameProcess.kill(9); // SIGKILL
      } catch (e) {
        console.error('Error killing process:', e);
      }
    }
  }
}

runTests();
