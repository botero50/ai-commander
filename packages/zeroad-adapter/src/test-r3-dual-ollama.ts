#!/usr/bin/env node

/**
 * Story R3.1 — Ollama vs Petra AI Tournament (2-Player)
 *
 * Key insight: RL Interface can ONLY control ONE player (the human slot)
 *              Use 2-player map to eliminate idle players
 *
 * Setup:
 * - Player 1 (Human Slot): OllamaAIBrain controlled via RL Interface
 * - Player 2: Petra AI (opponent)
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
const UNLIMITED_TICKS = MAX_TICKS === 0; // Pass 0 to run until match completion
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
  console.log('║      STORY R3.1 — OLLAMA vs PETRA AI (2-PLAYER)          ║');
  console.log('║    Ollama (Player 1) vs Petra AI (Player 2)               ║');
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
    console.log(`       Player 1 (Ollama): ${p1Units.length} units`);
    console.log(`       Player 2 (Petra AI): ${p2Units.length} units\n`);

    // Tournament loop
    const ticksDisplay = UNLIMITED_TICKS ? 'unlimited (until victory)' : `${MAX_TICKS} ticks`;
    console.log(`[GAME] Running tournament for ${ticksDisplay}...\n`);
    const startTime = Date.now();
    const tickHistory: TournamentTick[] = [];
    let ticksCompleted = 0;

    while (UNLIMITED_TICKS || ticksCompleted < MAX_TICKS) {
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
          p1Cmds: decision1.commands.length,
        });
      }

      // Check for early termination (any player eliminated)
      if (p1Units === 0 || p2Units === 0) {
        logger.info('Match ended - player eliminated', {
          tick: ticksCompleted,
          p1Units,
          p2Units,
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

    console.log('Player 2 (Petra AI):');
    console.log(`  Start: ${firstTick.player2Units} units`);
    console.log(`  End: ${lastTick.player2Units} units`);
    console.log(`  Change: ${lastTick.player2Units - firstTick.player2Units} units`);
    console.log('');

    // Winner
    console.log('[WINNER]\n');
    if (lastTick.player1Units > 0 && lastTick.player2Units === 0) {
      console.log('🏆 OLLAMA WINS - Defeated Petra AI!');
    } else if (lastTick.player2Units > 0 && lastTick.player1Units === 0) {
      console.log('🏆 PETRA AI WINS - Defeated Ollama!');
    } else if (lastTick.player1Units > lastTick.player2Units) {
      console.log(`OLLAMA LEADS - ${lastTick.player1Units} vs ${lastTick.player2Units} units`);
    } else if (lastTick.player2Units > lastTick.player1Units) {
      console.log(`PETRA AI LEADS - ${lastTick.player2Units} vs ${lastTick.player1Units} units`);
    } else {
      console.log(`TIED - Both have ${lastTick.player1Units} units`);
    }

    // Save results
    const resultsPath = 'tournament-results-dual-ollama.json';
    fs.writeFileSync(
      resultsPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          story: 'R3.1 - Ollama vs Petra AI Tournament (2-Player)',
          configuration: {
            maxTicks: MAX_TICKS,
            model: OLLAMA_MODEL,
            map: 'acropolis_bay_2p',
            player1: { id: 1, brain: 'Ollama', controlledVia: 'RL Interface (human slot)' },
            player2: { id: 2, brain: 'Petra AI', controlledVia: 'Game AI' },
            strategy: 'Ollama controls Player 1. Petra AI controls Player 2.',
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
    console.log('║  ✓ OLLAMA vs PETRA AI: COMPLETE                         ║');
    console.log('║  Story R3.1: 2-Player Tournament Setup                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error);
    process.exit(1);
  }
}

main();
