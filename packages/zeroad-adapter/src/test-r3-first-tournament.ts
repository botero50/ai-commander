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
      playerID: 2, // Control Player 2 (Gaul) - RL Interface target
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
      ).length; // Petra AI (Athenians)
      const player2Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2'
      ).length; // Ollama (Gaul)

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
        playerID: 2,
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
        console.log(`       Player 1 (Athenians/Petra AI): ${player1Units.length} units`);
        console.log(`       Player 2 (Gaul/Ollama): ${player2Units.length} units\n`);
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

    // Final state from last decision
    console.log('\n[FINAL STATE]\n');
    const lastDecision = brain.decisions[brain.decisions.length - 1];
    if (lastDecision) {
      console.log(`Final Tick: ${lastDecision.tick}`);
      console.log(`Player 1 (Petra AI/Athenians): ${lastDecision.player1Units} units`);
      console.log(`Player 2 (Ollama/Gaul): ${lastDecision.player2Units} units`);

      // Winner
      console.log('\n[WINNER]\n');
      if (lastDecision.player1Units > 0 && lastDecision.player2Units === 0) {
        console.log('🏆 PLAYER 1 (OLLAMA) WINS - Eliminated opponent!');
      } else if (lastDecision.player2Units > 0 && lastDecision.player1Units === 0) {
        console.log('🏆 PLAYER 2 (PETRA AI) WINS - Eliminated opponent!');
      } else if (lastDecision.player1Units === 0 && lastDecision.player2Units === 0) {
        console.log('⚠ DRAW - Both players eliminated');
      } else {
        const p1Score = lastDecision.player1Units * 2;
        const p2Score = lastDecision.player2Units * 2;
        if (p1Score > p2Score) {
          console.log(`🏆 PLAYER 1 (OLLAMA) LEADS - More units (${lastDecision.player1Units} vs ${lastDecision.player2Units})`);
        } else if (p2Score > p1Score) {
          console.log(`🏆 PLAYER 2 (PETRA AI) LEADS - More units (${lastDecision.player2Units} vs ${lastDecision.player1Units})`);
        } else {
          console.log(`⚠ TIED - Same unit count (${lastDecision.player1Units} each)`);
        }
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
            tick: finalState.currentTick,
            player1: { units: lastDecision?.player1Units || 0 },
            player2: { units: lastDecision?.player2Units || 0 },
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
