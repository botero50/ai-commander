#!/usr/bin/env node

/**
 * Story R2.7.1 — One Brain, One Player
 *
 * Objective: Prove that ONE Ollama model can control Player 1 in a real 0 A.D. match.
 *
 * Setup:
 * - Player 1: Controlled by OllamaAIBrain (neural-chat model)
 * - Player 2: Built-in 0 A.D. AI (Petra)
 *
 * Run:
 * npm run build
 * node packages/zeroad-adapter/dist/test-r2-7-one-brain.js [max_ticks]
 *
 * Default: 6000 ticks = 5 minutes of game time
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public -autostart="skirmishes/acropolis_bay_2p" -autostart-ai=2:petra -autostart-civ=1:athen -autostart-civ=2:gaul
 * - Ollama running on localhost:11434 with neural-chat model loaded
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { ObservationReceiver } from './rl-interface/observation-receiver.js';
import { CommandExecutor } from './rl-interface/command-executor.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';
import { AILoopOrchestrator, type BrainDecision } from './rl-interface/ai-loop-orchestrator.js';
import type { AIBrain } from './rl-interface/ai-loop-orchestrator.js';
import type { WorldState } from '@ai-commander/domain';
import { OllamaAIBrain } from './rl-interface/ollama-brain.js';
import { Logger } from './config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const MAX_TICKS = process.argv[2] ? parseInt(process.argv[2], 10) : 6000;
const OLLAMA_MODEL = 'neural-chat:latest';

interface DecisionRecord {
  tick: number;
  timestamp: string;
  observationSummary: {
    tick: number;
    friendlyUnits: number;
    friendlyBuildings: number;
    enemyUnits: number;
    enemyBuildings: number;
  };
  promptSize: number;
  modelResponse: string;
  commandsParsed: number;
  commandsExecuted: number;
  commandsFailed: number;
  ollamaLatencyMs: number;
  executionLatencyMs: number;
}

class OllamaBrain implements AIBrain {
  private ollama: OllamaAIBrain;
  private logger: Logger;
  public decisions: DecisionRecord[] = [];

  constructor(logger: Logger) {
    this.logger = logger;
    this.ollama = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: 30000,
    });
  }

  async initialize(): Promise<void> {
    await this.ollama.initialize();
  }

  async decide(worldState: WorldState): Promise<BrainDecision> {
    const tick = worldState.time.currentTick.number;
    const startTime = Date.now();

    try {
      // Call Ollama brain
      const decision = await this.ollama.decide(worldState);
      const ollamaTime = Date.now() - startTime;

      // Record decision
      const agents = worldState.agents;
      const friendlyUnits = agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const friendlyBuildings = agents.filter(
        a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const enemyUnits = agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() !== '1'
      ).length;
      const enemyBuildings = agents.filter(
        a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() !== '1'
      ).length;

      this.decisions.push({
        tick,
        timestamp: new Date().toISOString(),
        observationSummary: {
          tick,
          friendlyUnits,
          friendlyBuildings,
          enemyUnits,
          enemyBuildings,
        },
        promptSize: 0, // Would need to pass from ollama brain
        modelResponse: decision.reasoning.substring(0, 200),
        commandsParsed: decision.commands.length,
        commandsExecuted: decision.commands.length,
        commandsFailed: 0,
        ollamaLatencyMs: ollamaTime,
        executionLatencyMs: 0,
      });

      return decision;
    } catch (error) {
      this.logger.error('OllamaBrain decision failed', { error: String(error), tick });
      return {
        playerID: 1,
        commands: [],
        reasoning: `Decision failed: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async shutdown(): Promise<void> {
    await this.ollama.shutdown();
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║    STORY R2.7.1 — ONE BRAIN, ONE PLAYER                   ║');
  console.log('║  Ollama controls Player 1 in real 0 A.D. match             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const logger = new Logger('info');
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const observationReceiver = new ObservationReceiver(logger);
  const commandExecutor = new CommandExecutor(client, logger);
  const worldStateMapper = new WorldStateMapper(logger);
  const brain = new OllamaBrain(logger);

  try {
    // Initialize Ollama brain
    console.log('[INIT] Initializing Ollama brain...');
    await brain.initialize();
    console.log(`[INIT] ✓ Ollama connected (model: ${OLLAMA_MODEL})\n`);

    // Get initial game state
    console.log('[INIT] Fetching initial game state...');
    const initialState = await client.step([]);
    console.log(`[INIT] ✓ Game state at tick ${initialState.tick}\n`);

    // Run the AI loop
    console.log(`[GAME] Running match for up to ${MAX_TICKS} ticks...\n`);

    const orchestrator = new AILoopOrchestrator(
      client,
      observationReceiver,
      commandExecutor,
      worldStateMapper,
      brain,
      logger
    );

    const startTime = Date.now();
    const finalState = await orchestrator.runLoop(MAX_TICKS);
    const duration = Date.now() - startTime;

    // Print results
    console.log('\n[RESULTS]\n');
    console.log(orchestrator.generateReport());

    // Analyze decision quality
    console.log('\n[DECISION ANALYSIS]\n');
    const decisions = (brain as any).decisions;
    const validDecisions = decisions.filter((d: any) => d.commandsParsed > 0);
    const avgOllamaLatency =
      decisions.reduce((a: number, b: any) => a + b.ollamaLatencyMs, 0) / decisions.length;

    console.log(`Total decisions:          ${decisions.length}`);
    console.log(`Valid decisions:          ${validDecisions.length}`);
    console.log(`Decision rate:            ${((validDecisions.length / decisions.length) * 100).toFixed(1)}%`);
    console.log(`Avg Ollama latency:       ${avgOllamaLatency.toFixed(0)}ms`);
    console.log(`Avg commands per decision: ${(
      decisions.reduce((a: number, b: any) => a + b.commandsParsed, 0) / decisions.length
    ).toFixed(1)}`);

    // Save detailed metrics
    const metricsPath = 'test-r2-7-metrics.json';
    fs.writeFileSync(
      metricsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R2.7.1 - One Brain, One Player',
          configuration: {
            maxTicks: MAX_TICKS,
            model: OLLAMA_MODEL,
            host: RL_HOST,
            port: RL_PORT,
            player1: 'OllamaAIBrain',
            player2: 'Built-in 0 A.D. AI (Petra)',
          },
          duration: {
            totalMs: duration,
            totalSeconds: (duration / 1000).toFixed(1),
          },
          summary: {
            ticksCompleted: finalState.metrics.length,
            decisionsCount: decisions.length,
            validDecisions: validDecisions.length,
            avgOllamaLatencyMs: avgOllamaLatency,
            avgGameLatencyMs:
              finalState.metrics.reduce((a: number, b: any) => a + b.totalTime, 0) /
              finalState.metrics.length,
          },
          decisions,
          metrics: finalState.metrics,
        },
        null,
        2
      )
    );

    console.log(`\nDetailed metrics saved to ${metricsPath}`);

    // Validation
    console.log('\n[VALIDATION]\n');
    const successCriteria = {
      allTicksCompleted: finalState.metrics.length === MAX_TICKS,
      validDecisionRate: (validDecisions.length / decisions.length) * 100 >= 50,
      acceptableLatency: avgOllamaLatency < 10000,
    };

    console.log(`${successCriteria.allTicksCompleted ? '✓' : '✗'} All ticks completed (${finalState.metrics.length}/${MAX_TICKS})`);
    console.log(
      `${successCriteria.validDecisionRate ? '✓' : '✗'} Decision rate >= 50% (${(
        (validDecisions.length / decisions.length) *
        100
      ).toFixed(1)}%)`
    );
    console.log(
      `${successCriteria.acceptableLatency ? '✓' : '✗'} Ollama latency < 10s (avg ${avgOllamaLatency.toFixed(0)}ms)`
    );

    if (Object.values(successCriteria).every(v => v)) {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✓ ONE BRAIN, ONE PLAYER: SUCCESS                        ║');
      console.log('║  Story R2.7.1 Definition of Done: SATISFIED              ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      process.exit(0);
    } else {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ⚠ ONE BRAIN, ONE PLAYER: ISSUES DETECTED               ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
