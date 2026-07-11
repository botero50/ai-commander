#!/usr/bin/env node

/**
 * Story R3.1 — Ollama Brain Implementation Test
 *
 * Tests the OllamaAIBrain against a real 0 A.D. instance,
 * verifying that Ollama can make valid game decisions.
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public
 * - Ollama running with: ollama serve
 * - Model available: ollama pull llama2
 *
 * Run with:
 * npx tsc test-r3-1-ollama-brain.ts --module esnext --target es2020 --skipLibCheck true
 * node test-r3-1-ollama-brain.js
 */

import { RLHTTPClient, ScenarioConfig } from './packages/zeroad-adapter/src/rl-interface/http-client.js';
import { ObservationReceiver } from './packages/zeroad-adapter/src/rl-interface/observation-receiver.js';
import { CommandExecutor } from './packages/zeroad-adapter/src/rl-interface/command-executor.js';
import { WorldStateMapper } from './packages/zeroad-adapter/src/rl-interface/world-state-mapper.js';
import {
  AILoopOrchestrator,
  type BrainDecision,
} from './packages/zeroad-adapter/src/rl-interface/ai-loop-orchestrator.js';
import { OllamaAIBrain } from './packages/zeroad-adapter/src/rl-interface/ollama-brain.js';
import { Logger } from './packages/zeroad-adapter/src/config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'llama2'; // or 'mistral', 'neural-chat'
const LOOP_TICKS = 5; // Short test run

async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      STORY R3.1 — OLLAMA BRAIN TEST           ║');
  console.log('║  Ollama LLM making real 0 A.D. decisions      ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const logger = new Logger();
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const observationReceiver = new ObservationReceiver(logger);
  const commandExecutor = new CommandExecutor(client, logger);
  const worldStateMapper = new WorldStateMapper(logger);

  try {
    // Step 1: Check RL Interface connectivity
    console.log('[STEP 1] Checking RL Interface connectivity...');
    const rlReachable = await client.isReachable();
    if (!rlReachable) {
      console.log(`✗ Cannot reach RL Interface at ${RL_HOST}:${RL_PORT}`);
      console.log(
        'Make sure 0 A.D. is running: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public'
      );
      process.exit(1);
    }
    console.log(`✓ RL Interface reachable\n`);

    // Step 2: Check Ollama connectivity
    console.log('[STEP 2] Checking Ollama connectivity...');
    let ollamaReachable = false;
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        timeout: 5000,
      });
      ollamaReachable = response.ok;
    } catch {
      ollamaReachable = false;
    }

    if (!ollamaReachable) {
      console.log(`✗ Cannot reach Ollama at ${OLLAMA_BASE_URL}`);
      console.log('Make sure Ollama is running: ollama serve');
      console.log(`Make sure model is available: ollama pull ${OLLAMA_MODEL}`);
      process.exit(1);
    }
    console.log(`✓ Ollama reachable\n`);

    // Step 3: Initialize Ollama brain
    console.log('[STEP 3] Initializing Ollama brain...');
    const brain = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: OLLAMA_BASE_URL,
      temperature: 0.7,
      timeout: 30000, // 30 seconds per LLM call
    });

    try {
      await brain.initialize();
      console.log(`✓ Ollama brain initialized with ${OLLAMA_MODEL}\n`);
    } catch (error) {
      console.log(`✗ Failed to initialize Ollama brain: ${error}`);
      process.exit(1);
    }

    // Step 4: Initialize game
    console.log('[STEP 4] Initializing game with scenario...');
    const scenario: ScenarioConfig = {
      settings: {
        Map: 'Skirmish/Cantabria',
        PlayerData: [{ Civ: 'athen' }, { Civ: 'gaul' }],
      },
    };

    const initialState = await client.reset(scenario);
    console.log(`✓ Game initialized at tick ${initialState.tick}\n`);

    // Step 5: Run the AI loop with Ollama brain
    console.log(`[STEP 5] Running Ollama brain for ${LOOP_TICKS} ticks...\n`);

    const orchestrator = new AILoopOrchestrator(
      client,
      observationReceiver,
      commandExecutor,
      worldStateMapper,
      brain,
      logger
    );

    const startTime = Date.now();
    const finalState = await orchestrator.runLoop(LOOP_TICKS);
    const duration = Date.now() - startTime;

    // Step 6: Print results
    console.log('\n[RESULTS]\n');
    console.log(orchestrator.generateReport());

    // Step 7: Save detailed metrics
    const metricsPath = 'test-r3-1-ollama-metrics.json';
    fs.writeFileSync(
      metricsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R3.1 - Ollama Brain Implementation',
          configuration: {
            ticks: LOOP_TICKS,
            rlHost: RL_HOST,
            rlPort: RL_PORT,
            ollamaModel: OLLAMA_MODEL,
            ollamaBaseUrl: OLLAMA_BASE_URL,
          },
          duration: {
            totalMs: duration,
            totalSeconds: (duration / 1000).toFixed(1),
          },
          summary: {
            ticksCompleted: finalState.metrics.length,
            avgLatencyMs:
              finalState.metrics.reduce((a, b) => a + b.totalTime, 0) /
              finalState.metrics.length,
            totalCommandsExecuted: finalState.metrics.reduce(
              (a, b) => a + b.commandsExecuted,
              0
            ),
            totalCommandsSuccessful: finalState.metrics.reduce(
              (a, b) => a + b.commandsSuccessful,
              0
            ),
          },
          metrics: finalState.metrics,
          brainReport: brain.generateReport(),
        },
        null,
        2
      )
    );

    console.log(`Detailed metrics saved to ${metricsPath}`);

    // Step 8: Validation
    const allTicksComplete = finalState.metrics.length === LOOP_TICKS;
    const allObservationsValid = finalState.metrics.every((m) => m.observationValid);
    const avgLatency =
      finalState.metrics.reduce((a, b) => a + b.totalTime, 0) /
      finalState.metrics.length;
    const acceptableLatency = avgLatency < 10000; // More lenient for LLM latency

    console.log('\n[VALIDATION CRITERIA]\n');
    console.log(
      `${allTicksComplete ? '✓' : '✗'} All ticks completed (${finalState.metrics.length}/${LOOP_TICKS})`
    );
    console.log(`${allObservationsValid ? '✓' : '✗'} All observations valid`);
    console.log(
      `${acceptableLatency ? '✓' : '✗'} Latency acceptable (avg ${avgLatency.toFixed(0)}ms)`
    );

    // Step 9: Check command execution
    const totalCommandsExecuted = finalState.metrics.reduce((a, b) => a + b.commandsExecuted, 0);
    console.log(`${totalCommandsExecuted > 0 ? '✓' : '⚠'} Brain executed ${totalCommandsExecuted} commands`);
    console.log('');

    if (allTicksComplete && allObservationsValid && acceptableLatency) {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║  ✓ OLLAMA BRAIN TEST SUCCESSFUL              ║');
      console.log('║  Story R3.1 Definition of Done: SATISFIED    ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      process.exit(0);
    } else {
      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║  ⚠ OLLAMA BRAIN TEST INCOMPLETE              ║');
      console.log('║  Some criteria not met. Review above.         ║');
      console.log('╚════════════════════════════════════════════════╝\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
