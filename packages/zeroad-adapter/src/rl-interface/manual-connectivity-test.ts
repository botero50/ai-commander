/**
 * Story R1.2 — Manual Connectivity Test
 *
 * This test assumes 0 A.D. is already running with RL Interface enabled.
 * Run: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 *
 * This test validates connectivity to an existing RL Interface instance
 * without relying on process spawning (which has issues on Windows).
 */

import { RLHTTPClient } from './http-client.js';
import { Logger } from '../config/logger.js';

interface ManualTestReport {
  timestamp: string;
  status: 'success' | 'failure';
  endpoint: string;
  connectivity: {
    http_reachable: boolean;
    response_time_ms: number;
  };
  endpoints: {
    reset: {
      success: boolean;
      response_time_ms: number;
      game_state_valid: boolean;
      tick: number;
      players: number;
      entities: number;
    };
    step: {
      success: boolean;
      response_time_ms: number;
      game_state_valid: boolean;
      tick: number;
    };
  };
  game_state: {
    tick: number;
    time_elapsed: number;
    players: number;
    entities: number;
  };
  errors: string[];
}

export async function runManualConnectivityTest(endpoint: string = '127.0.0.1:6000'): Promise<ManualTestReport> {
  const logger = new Logger('info', 'R1.2-Manual');
  const [host, port] = endpoint.split(':');
  const portNum = parseInt(port, 10);

  const report: ManualTestReport = {
    timestamp: new Date().toISOString(),
    status: 'failure',
    endpoint,
    connectivity: {
      http_reachable: false,
      response_time_ms: 0,
    },
    endpoints: {
      reset: {
        success: false,
        response_time_ms: 0,
        game_state_valid: false,
        tick: 0,
        players: 0,
        entities: 0,
      },
      step: {
        success: false,
        response_time_ms: 0,
        game_state_valid: false,
        tick: 0,
      },
    },
    game_state: {
      tick: 0,
      time_elapsed: 0,
      players: 0,
      entities: 0,
    },
    errors: [],
  };

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  STORY R1.2: MANUAL RL INTERFACE TEST            ║');
  console.log('║  Connected to Running 0 A.D. Instance             ║');
  console.log('╚════════════════════════════════════════════════════╝\n');

  const client = new RLHTTPClient(host, portNum, 10000, logger);

  try {
    // Phase 1: HTTP connectivity
    console.log('[PHASE 1] Testing HTTP connectivity...');
    const connectStart = Date.now();
    const reachable = await client.isReachable();
    const connectTime = Date.now() - connectStart;

    report.connectivity.http_reachable = reachable;
    report.connectivity.response_time_ms = connectTime;

    if (!reachable) {
      throw new Error(`HTTP endpoint not reachable at http://${host}:${portNum}`);
    }
    console.log(`✅ HTTP endpoint reachable (${connectTime}ms)\n`);

    // Phase 2: /reset endpoint
    console.log('[PHASE 2] Testing /reset endpoint...');
    const resetStart = Date.now();
    const defaultScenario = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [
          { Civ: 'athen' },
          { Civ: 'gaul' },
        ],
      },
    };
    const resetState = await client.reset(defaultScenario);
    const resetTime = Date.now() - resetStart;

    report.endpoints.reset.success = true;
    report.endpoints.reset.response_time_ms = resetTime;
    report.endpoints.reset.tick = resetState.tick;
    report.endpoints.reset.players = resetState.players?.length || 0;
    report.endpoints.reset.entities = resetState.entities?.length || 0;
    report.endpoints.reset.game_state_valid =
      typeof resetState.tick === 'number' &&
      typeof resetState.time_elapsed === 'number' &&
      Array.isArray(resetState.players) &&
      Array.isArray(resetState.entities);

    console.log(`✅ /reset endpoint successful (${resetTime}ms)`);
    console.log(`   Tick: ${resetState.tick}`);
    console.log(`   Players: ${resetState.players?.length || 0}`);
    console.log(`   Entities: ${resetState.entities?.length || 0}\n`);

    // Phase 3: /step endpoint
    console.log('[PHASE 3] Testing /step endpoint...');
    const stepStart = Date.now();
    const stepState = await client.step([]);
    const stepTime = Date.now() - stepStart;

    report.endpoints.step.success = true;
    report.endpoints.step.response_time_ms = stepTime;
    report.endpoints.step.tick = stepState.tick;
    report.endpoints.step.game_state_valid =
      typeof stepState.tick === 'number' &&
      stepState.tick > resetState.tick;

    console.log(`✅ /step endpoint successful (${stepTime}ms)`);
    console.log(`   Tick progressed: ${resetState.tick} → ${stepState.tick}`);
    console.log(`   Game state valid: ${report.endpoints.step.game_state_valid}\n`);

    // Phase 4: Game state snapshot
    console.log('[PHASE 4] Capturing game state snapshot...');
    const finalState = await client.step([]);

    report.game_state.tick = finalState.tick;
    report.game_state.time_elapsed = finalState.time_elapsed;
    report.game_state.players = finalState.players?.length || 0;
    report.game_state.entities = finalState.entities?.length || 0;

    console.log(`✅ Game state snapshot captured`);
    console.log(`   Tick: ${report.game_state.tick}`);
    console.log(`   Time elapsed: ${report.game_state.time_elapsed}s`);
    console.log(`   Players: ${report.game_state.players}`);
    console.log(`   Entities: ${report.game_state.entities}\n`);

    report.status = 'success';
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    report.errors.push(errorMsg);
    console.error(`❌ Test failed: ${errorMsg}\n`);
  }

  // Print report
  console.log('═'.repeat(60));
  console.log('CONNECTIVITY TEST REPORT');
  console.log('═'.repeat(60));
  console.log(JSON.stringify(report, null, 2));

  return report;
}

// Run if invoked directly
runManualConnectivityTest();
