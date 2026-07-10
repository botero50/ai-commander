#!/usr/bin/env node

/**
 * Story R3.1 — Two Brains, One Match
 *
 * Run two Ollama neural-chat models in tournament competition.
 *
 * Setup:
 * - Player 1: OllamaAIBrain (Gaul) - default Ollama target
 * - Player 2: OllamaAIBrain (Athenians) - modified to target player 2
 *
 * Execution:
 * npm run build
 * node packages/zeroad-adapter/dist/test-r3-tournament.js [max_ticks]
 *
 * Prerequisites:
 * - 0 A.D. running with: pyrogenesis.exe --rl-interface=127.0.0.1:6000 --mod=public -autostart="skirmishes/acropolis_bay_2p" -autostart-civ=1:gaul -autostart-civ=2:athen
 * - Ollama running on localhost:11434 with neural-chat model
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { ObservationReceiver } from './rl-interface/observation-receiver.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';
import { TournamentOrchestrator } from './rl-interface/tournament-orchestrator.js';
import { OllamaAIBrain } from './rl-interface/ollama-brain.js';
import { Logger } from './config/logger.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const MAX_TICKS = process.argv[2] ? parseInt(process.argv[2], 10) : 300;
const OLLAMA_MODEL = 'neural-chat:latest';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      STORY R3.1 — TWO BRAINS, ONE MATCH                   ║');
  console.log('║    Two Ollama models compete in 0 A.D. tournament          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const logger = new Logger('info');
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const observationReceiver = new ObservationReceiver(logger);
  const worldStateMapper = new WorldStateMapper(logger);

  try {
    // Initialize brains
    console.log('[INIT] Initializing tournament brains...');
    const brain1 = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: 30000,
      playerID: 1,
    });

    const brain2 = new OllamaAIBrain(logger, {
      modelName: OLLAMA_MODEL,
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 256,
      timeout: 30000,
      playerID: 2,
    });

    await brain1.initialize();
    await brain2.initialize();
    console.log(`[INIT] ✓ Two Ollama brains connected (model: ${OLLAMA_MODEL})\n`);

    // Get initial game state
    console.log('[INIT] Fetching initial game state...');
    const initialState = await client.step([]);
    console.log(`[INIT] ✓ Game state at tick ${initialState.tick}`);

    // Wait for game to be playable
    console.log('[INIT] Waiting for game to be playable (units created)...');
    let playableState = initialState;
    let attempts = 0;
    while (attempts < 100) {
      const entities = Object.values(playableState.entities || {}) as any[];
      const player1Units = entities.filter(e => e.owner === 1 && (e.template || '').includes('unit'));
      const player2Units = entities.filter(e => e.owner === 2 && (e.template || '').includes('unit'));

      if (player1Units.length > 0 && player2Units.length > 0) {
        console.log(`[INIT] ✓ Game ready for tournament`);
        console.log(`       Player 1 (Gaul): ${player1Units.length} units`);
        console.log(`       Player 2 (Athenians): ${player2Units.length} units\n`);
        break;
      }
      playableState = await client.step([]);
      attempts++;
    }

    if (attempts >= 100) {
      console.log('[WARN] Game may not be ready - proceeding anyway\n');
    }

    // Create tournament orchestrator
    const orchestrator = new TournamentOrchestrator(
      client,
      observationReceiver,
      worldStateMapper,
      brain1,
      brain2,
      logger
    );

    // Run tournament
    console.log(`[GAME] Running tournament for up to ${MAX_TICKS} ticks...\n`);
    const startTime = Date.now();
    const result = await orchestrator.runTournament(MAX_TICKS);
    const duration = Date.now() - startTime;

    // Print tournament report
    console.log('\n[RESULTS]\n');
    console.log(orchestrator.generateReport());

    // Analyze final state
    console.log('\n[FINAL STATE ANALYSIS]\n');
    const finalEntities = Object.values(result.finalState.entities || {}) as any[];
    const player1Units = finalEntities.filter(e => e.owner === 1).length;
    const player2Units = finalEntities.filter(e => e.owner === 2).length;
    const player1Buildings = finalEntities.filter(
      e => e.owner === 1 && (e.template || '').includes('structures')
    ).length;
    const player2Buildings = finalEntities.filter(
      e => e.owner === 2 && (e.template || '').includes('structures')
    ).length;

    console.log(`Tick ${result.finalState.tick} (${(duration / 1000).toFixed(1)}s game time)`);
    console.log(`Player 1 (Gaul): ${player1Units} units, ${player1Buildings} buildings`);
    console.log(`Player 2 (Athenians): ${player2Units} units, ${player2Buildings} buildings`);

    // Determine winner
    console.log('\n[WINNER]\n');
    if (player1Units > 0 && player2Units === 0) {
      console.log('🏆 Player 1 (Gaul) WINS - opponent eliminated!');
    } else if (player2Units > 0 && player1Units === 0) {
      console.log('🏆 Player 2 (Athenians) WINS - opponent eliminated!');
    } else if (player1Units === 0 && player2Units === 0) {
      console.log('⚠ Draw - both players eliminated');
    } else {
      // Score by units + buildings
      const p1Score = player1Units + player1Buildings * 2;
      const p2Score = player2Units + player2Buildings * 2;

      if (p1Score > p2Score) {
        console.log(`🏆 Player 1 (Gaul) WINS - higher score (${p1Score} vs ${p2Score})`);
      } else if (p2Score > p1Score) {
        console.log(`🏆 Player 2 (Athenians) WINS - higher score (${p2Score} vs ${p1Score})`);
      } else {
        console.log(`⚠ Draw - tied score (${p1Score} each)`);
      }
    }

    // Save results
    const resultsPath = 'tournament-results.json';
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R3.1 - Two Brains, One Match',
          configuration: {
            maxTicks: MAX_TICKS,
            model: OLLAMA_MODEL,
            player1: { id: 1, civ: 'Gaul', brain: 'Ollama' },
            player2: { id: 2, civ: 'Athenians', brain: 'Ollama' },
          },
          duration: { totalMs: duration, totalSeconds: (duration / 1000).toFixed(1) },
          ticksCompleted: result.metrics.length,
          finalState: {
            tick: result.finalState.tick,
            player1: { units: player1Units, buildings: player1Buildings },
            player2: { units: player2Units, buildings: player2Buildings },
          },
          metrics: result.metrics,
        },
        null,
        2
      )
    );

    console.log(`\nTournament results saved to ${resultsPath}`);

    // Shutdown
    await brain1.shutdown();
    await brain2.shutdown();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ TWO BRAINS, ONE MATCH: TOURNAMENT COMPLETE             ║');
    console.log('║  Story R3.1 Definition of Done: SATISFIED                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
