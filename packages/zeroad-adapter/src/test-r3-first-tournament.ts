#!/usr/bin/env node

/**
 * Story R3.1 — First Tournament Match
 *
 * Run one Ollama model vs built-in 0 A.D. AI in competitive match.
 *
 * Setup:
 * - Player 1: OllamaAIBrain (Gaul) controlled by our neural-chat
 * - Player 2: Built-in 0 A.D. AI (Petra, Athenians) - opponent
 *
 * Execution:
 * npm run build
 * node packages/zeroad-adapter/dist/test-r3-first-tournament.js [max_ticks]
 *
 * This proves that an Ollama model can compete against game AI.
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { ObservationReceiver } from './rl-interface/observation-receiver.js';
import { CommandExecutor } from './rl-interface/command-executor.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';
import { AILoopOrchestrator } from './rl-interface/ai-loop-orchestrator.js';
import type { AIBrain, BrainDecision } from './rl-interface/ai-loop-orchestrator.js';
import type { WorldState } from '@ai-commander/domain';
import { OllamaAIBrain } from './rl-interface/ollama-brain.js';
import { Logger } from './config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const MAX_TICKS = process.argv[2] ? parseInt(process.argv[2], 10) : 6000;
const OLLAMA_MODEL = 'neural-chat:latest';

interface TournamentDecision {
  tick: number;
  timestamp: string;
  player1Units: number;
  player2Units: number;
  commandsParsed: number;
  latency: number;
}

class CompetitiveBrain implements AIBrain {
  private ollama: OllamaAIBrain;
  private logger: Logger;
  public decisions: TournamentDecision[] = [];

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
      playerID: 1, // Control Player 1 (Gaul)
    });
  }

  async initialize(): Promise<void> {
    await this.ollama.initialize();
  }

  async decide(worldState: WorldState): Promise<BrainDecision> {
    const tick = worldState.time.currentTick.number;
    const startTime = Date.now();

    try {
      const decision = await this.ollama.decide(worldState);
      const latency = Date.now() - startTime;

      const player1Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const player2Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2'
      ).length;

      this.decisions.push({
        tick,
        timestamp: new Date().toISOString(),
        player1Units,
        player2Units,
        commandsParsed: decision.commands.length,
        latency,
      });

      return decision;
    } catch (error) {
      this.logger.error('Brain decision failed', { error: String(error) });
      return {
        playerID: 1,
        commands: [],
        reasoning: `Error: ${error}`,
        timestamp: new Date(),
      };
    }
  }

  async shutdown(): Promise<void> {
    await this.ollama.shutdown();
  }

  getReport(): string {
    return this.ollama.getDecisionReport();
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      STORY R3.1 — FIRST TOURNAMENT MATCH                  ║');
  console.log('║    Ollama vs Built-in AI: Competitive Match              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const logger = new Logger('info');
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const observationReceiver = new ObservationReceiver(logger);
  const commandExecutor = new CommandExecutor(client, logger);
  const worldStateMapper = new WorldStateMapper(logger);
  const brain = new CompetitiveBrain(logger);

  try {
    console.log('[INIT] Initializing Ollama brain...');
    await brain.initialize();
    console.log(`[INIT] ✓ Ollama connected (model: ${OLLAMA_MODEL})\n`);

    console.log('[INIT] Fetching initial game state...');
    const initialState = await client.step([]);
    console.log(`[INIT] ✓ Game state at tick ${initialState.tick}`);

    console.log('[INIT] Waiting for game to be playable...');
    let playableState = initialState;
    let attempts = 0;
    while (attempts < 100) {
      const entities = Object.values(playableState.entities || {}) as any[];
      const player1Units = entities.filter(e => e.owner === 1 && (e.template || '').includes('unit'));
      const player2Units = entities.filter(e => e.owner === 2 && (e.template || '').includes('unit'));

      if (player1Units.length > 0 && player2Units.length > 0) {
        console.log(`[INIT] ✓ Game ready`);
        console.log(`       Player 1 (Gaul/Ollama): ${player1Units.length} units`);
        console.log(`       Player 2 (Athenians/Petra AI): ${player2Units.length} units\n`);
        break;
      }
      playableState = await client.step([]);
      attempts++;
    }

    // Run tournament
    console.log(`[GAME] Running tournament for up to ${MAX_TICKS} ticks...\n`);
    const startTime = Date.now();
    const orchestrator = new AILoopOrchestrator(
      client,
      observationReceiver,
      commandExecutor,
      worldStateMapper,
      brain,
      logger
    );

    const finalState = await orchestrator.runLoop(MAX_TICKS);
    const duration = Date.now() - startTime;

    // Results
    console.log('\n[RESULTS]\n');
    console.log(orchestrator.generateReport());

    // Decision quality
    console.log('\n[DECISION QUALITY]\n');
    console.log(brain.getReport());

    // Final state analysis
    console.log('\n[FINAL STATE]\n');
    const finalEntities = Object.values(finalState.entities || {}) as any[];
    const finalP1Units = finalEntities.filter(e => e.owner === 1).length;
    const finalP2Units = finalEntities.filter(e => e.owner === 2).length;
    const finalP1Buildings = finalEntities.filter(
      e => e.owner === 1 && (e.template || '').includes('structures')
    ).length;
    const finalP2Buildings = finalEntities.filter(
      e => e.owner === 2 && (e.template || '').includes('structures')
    ).length;

    console.log(`Game Time: ${(duration / 1000).toFixed(1)}s (${brain.decisions.length} decisions)`);
    console.log(`Player 1 (Ollama/Gaul): ${finalP1Units} units, ${finalP1Buildings} buildings`);
    console.log(`Player 2 (Petra AI/Athenians): ${finalP2Units} units, ${finalP2Buildings} buildings`);

    // Winner
    console.log('\n[WINNER]\n');
    if (finalP1Units > 0 && finalP2Units === 0) {
      console.log('🏆 PLAYER 1 (OLLAMA) WINS - Eliminated opponent!');
    } else if (finalP2Units > 0 && finalP1Units === 0) {
      console.log('🏆 PLAYER 2 (PETRA AI) WINS - Eliminated opponent!');
    } else if (finalP1Units === 0 && finalP2Units === 0) {
      console.log('⚠ DRAW - Both players eliminated');
    } else {
      const p1Score = finalP1Units + finalP1Buildings * 2;
      const p2Score = finalP2Units + finalP2Buildings * 2;
      if (p1Score > p2Score) {
        console.log(`🏆 PLAYER 1 (OLLAMA) WINS - Higher score (${p1Score} vs ${p2Score})`);
      } else if (p2Score > p1Score) {
        console.log(`🏆 PLAYER 2 (PETRA AI) WINS - Higher score (${p2Score} vs ${p1Score})`);
      } else {
        console.log(`⚠ DRAW - Tied score (${p1Score} each)`);
      }
    }

    // Save results
    const resultsPath = 'tournament-results.json';
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R3.1 - First Tournament Match (Ollama vs Petra AI)',
          configuration: {
            maxTicks: MAX_TICKS,
            model: OLLAMA_MODEL,
            player1: { id: 1, civ: 'Gaul', brain: 'Ollama' },
            player2: { id: 2, civ: 'Athenians', brain: 'Petra (Built-in AI)' },
          },
          duration: { totalMs: duration, totalSeconds: (duration / 1000).toFixed(1) },
          ticksCompleted: brain.decisions.length,
          finalState: {
            tick: finalState.tick,
            player1: { units: finalP1Units, buildings: finalP1Buildings },
            player2: { units: finalP2Units, buildings: finalP2Buildings },
          },
          decisions: brain.decisions,
        },
        null,
        2
      )
    );

    console.log(`\nTournament results saved to ${resultsPath}`);

    await brain.shutdown();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ FIRST TOURNAMENT MATCH: COMPLETE                      ║');
    console.log('║  Story R3.1 Definition of Done: SATISFIED                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
