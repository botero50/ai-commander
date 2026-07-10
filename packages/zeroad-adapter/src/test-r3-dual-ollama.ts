#!/usr/bin/env node

/**
 * Story R3.1 — Ollama vs Dual Petra AI Tournament
 *
 * Key insight: RL Interface can ONLY control ONE player (the human slot)
 *              RL Interface cannot control multiple players in one session
 *
 * Setup:
 * - Player 1 (Athenians): OllamaAIBrain controlled via RL Interface (human slot)
 * - Player 2 (Gaul): Petra AI (opponent)
 * - Player 3 (Kushite): Petra AI (opponent)
 *
 * Execution:
 * npm run build
 * node packages/zeroad-adapter/dist/test-r3-dual-ollama.js [max_ticks]
 */

import { RLHTTPClient } from './rl-interface/http-client.js';
import { WorldStateMapper } from './rl-interface/world-state-mapper.js';
import { OllamaAIBrain } from './rl-interface/ollama-brain.js';
import { Logger } from './config/logger.js';
import type { GameCommand } from './rl-interface/http-client.js';
import type { RawGameState } from './rl-interface/types.js';
import * as fs from 'fs';

const RL_HOST = '127.0.0.1';
const RL_PORT = 6000;
const MAX_TICKS = process.argv[2] ? parseInt(process.argv[2], 10) : 300;
const OLLAMA_MODEL = 'neural-chat:latest';

interface TournamentTick {
  tick: number;
  timestamp: string;
  player1Units: number;
  player2Units: number;
  player3Units?: number;
  player1Commands: number;
  player2Commands: number;
  totalCommands: number;
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      STORY R3.1 — OLLAMA vs DUAL PETRA AI                ║');
  console.log('║    Ollama (Player 1) vs Petra (Player 2) vs Petra (P3)    ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const logger = new Logger('info');
  const client = new RLHTTPClient(RL_HOST, RL_PORT, 10000, logger);
  const worldStateMapper = new WorldStateMapper(logger);

  // Create one Ollama brain for Player 1 (the human slot)
  // RL Interface can only control the human player - Player 2 & 3 are Petra AI
  console.log('[INIT] Initializing Ollama brain for Player 1...');
  const brain1 = new OllamaAIBrain(logger, {
    modelName: OLLAMA_MODEL,
    baseUrl: 'http://localhost:11434',
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    numPredict: 256,
    timeout: 30000,
    playerID: 1, // Controls Player 1 (Athenians) via RL Interface
  });

  try {
    await brain1.initialize();
    console.log(`[INIT] ✓ Ollama brain initialized (model: ${OLLAMA_MODEL})\n`);

    // Get initial state
    console.log('[INIT] Fetching initial game state...');
    let gameState = await client.step([]);
    console.log(`[INIT] ✓ Game state tick: ${gameState.tick || 0}\n`);

    // Check for playable state
    console.log('[INIT] Checking for units...');
    const entities = Object.values(gameState.entities || {}) as any[];
    const p1Units = entities.filter(e => e.owner === 1 && (e.template || '').includes('unit'));
    const p2Units = entities.filter(e => e.owner === 2 && (e.template || '').includes('unit'));
    const p3Units = entities.filter(e => e.owner === 3 && (e.template || '').includes('unit'));
    console.log(`       Player 1 (Athenians/Ollama): ${p1Units.length} units`);
    console.log(`       Player 2 (Gaul/Petra): ${p2Units.length} units`);
    console.log(`       Player 3 (Kushite/Petra): ${p3Units.length} units\n`);

    // Tournament loop
    console.log(`[GAME] Running tournament for ${MAX_TICKS} ticks...\n`);
    const startTime = Date.now();
    const tickHistory: TournamentTick[] = [];
    let ticksCompleted = 0;

    while (ticksCompleted < MAX_TICKS) {
      // Step 1: Get current world state
      gameState = await client.step([]);
      const worldState = worldStateMapper.mapObservationToWorldState(gameState);

      if (!worldState) {
        logger.error('Failed to map world state');
        break;
      }

      // Step 2: Get decision from Ollama brain for Player 1
      const decision1 = await brain1.decide(worldState).catch(err => ({
        playerID: 1,
        commands: [],
        reasoning: `Error: ${err}`,
        timestamp: new Date(),
      }));

      // Step 3: Only Player 1 commands (Player 2 & 3 are Petra AI)
      const combinedCommands: GameCommand[] = decision1.commands;

      // Step 4: Send ALL commands in ONE /step call
      gameState = await client.step(combinedCommands);

      // Step 5: Record metrics
      const p1Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
      ).length;
      const p2Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2'
      ).length;
      const p3Units = worldState.agents.filter(
        a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '3'
      ).length;

      tickHistory.push({
        tick: worldState.time.currentTick.number,
        timestamp: new Date().toISOString(),
        player1Units: p1Units,
        player2Units: p2Units,
        player1Commands: decision1.commands.length,
        player2Commands: 0, // Petra AI controls P2
        totalCommands: combinedCommands.length,
      });

      ticksCompleted++;

      // Progress log
      if (ticksCompleted % 10 === 0) {
        logger.info('Tournament progress', {
          tick: ticksCompleted,
          p1Units,
          p2Units,
          p3Units,
          p1Cmds: decision1.commands.length,
        });
      }

      // Check for early termination (any Ollama player eliminated)
      if (p1Units === 0 || p2Units === 0) {
        logger.info('Match ended - Ollama player eliminated', {
          tick: ticksCompleted,
          p1Units,
          p2Units,
          p3Units,
        });
        break;
      }
    }

    const duration = Date.now() - startTime;

    // Results
    console.log('\n[RESULTS]\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║            TOURNAMENT RESULTS                             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');

    const firstTick = tickHistory[0];
    const lastTick = tickHistory[tickHistory.length - 1];

    console.log(`Duration: ${(duration / 1000).toFixed(1)}s (${ticksCompleted} ticks)`);
    console.log('');

    console.log('Player 1 (Athenians/Ollama):');
    console.log(`  Start: ${firstTick.player1Units} units`);
    console.log(`  End: ${lastTick.player1Units} units`);
    console.log(`  Change: ${lastTick.player1Units - firstTick.player1Units} units`);
    console.log(`  Avg commands/tick: ${(tickHistory.reduce((s, t) => s + t.player1Commands, 0) / ticksCompleted).toFixed(1)}`);
    console.log('');

    console.log('Player 2 (Gaul/Petra):');
    console.log(`  Start: ${firstTick.player2Units} units`);
    console.log(`  End: ${lastTick.player2Units} units`);
    console.log(`  Change: ${lastTick.player2Units - firstTick.player2Units} units`);
    console.log('');

    // Winner
    console.log('[WINNER]\n');
    const players = [
      { name: 'ATHENIANS (OLLAMA)', units: lastTick.player1Units },
      { name: 'GAUL (PETRA)', units: lastTick.player2Units },
      { name: 'KUSHITE (PETRA)', units: lastTick.player3Units },
    ].sort((a, b) => b.units - a.units);

    if (players[0].units > 0) {
      console.log(`🏆 ${players[0].name} WINS with ${players[0].units} units!`);
    } else {
      console.log('⚠ Draw - All players eliminated');
    }

    // Save results
    const resultsPath = 'tournament-results-dual-ollama.json';
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R3.1 - Ollama vs Dual Petra AI Tournament',
          configuration: {
            maxTicks: MAX_TICKS,
            model: OLLAMA_MODEL,
            map: 'alpine_mountains_3p',
            player1: { id: 1, civ: 'Athenians', brain: 'Ollama', controlledVia: 'RL Interface (human slot)' },
            player2: { id: 2, civ: 'Gaul', brain: 'Petra AI', controlledVia: 'Game AI' },
            player3: { id: 3, civ: 'Kushite', brain: 'Petra AI', controlledVia: 'Game AI' },
            strategy: 'Ollama controls Player 1. Petra AI controls Player 2 and 3.',
            rlInterfaceConstraint: 'Can only control ONE player (the human player slot)',
          },
          duration: { totalMs: duration, totalSeconds: (duration / 1000).toFixed(1) },
          ticksCompleted,
          finalState: {
            player1Units: lastTick.player1Units,
            player2Units: lastTick.player2Units,
          },
          tickHistory,
        },
        null,
        2
      )
    );

    console.log(`\nTournament results saved to ${resultsPath}`);

    // Shutdown
    await brain1.shutdown();

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✓ OLLAMA vs DUAL PETRA AI: COMPLETE                    ║');
    console.log('║  Story R3.1: RL Interface Controls 1 Player Maximum      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
