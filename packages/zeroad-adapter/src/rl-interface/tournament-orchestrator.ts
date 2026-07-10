/**
 * Tournament Orchestrator
 *
 * Manages multiple AI brains in a single match.
 *
 * Challenge: The 0 A.D. RL Interface only allows ONE player per connection.
 * Solution: Use alternating decision strategy where both brains are called
 * on the same game state, decisions are queued, and executed together.
 *
 * Execution Model:
 * 1. Observe game state (single /step call with empty commands)
 * 2. Call brain1.decide(worldState) → get Player 1 commands
 * 3. Call brain2.decide(worldState) → get Player 2 commands
 * 4. Execute both command sets in single /step call
 * 5. Advance tick and repeat
 *
 * This ensures:
 * - Both brains see identical game state (fairness)
 * - Commands execute simultaneously (realistic)
 * - Single network round-trip per tick (efficiency)
 *
 * Story R3.1: Two Brains, One Match
 */

import { Logger } from '../config/logger.js';
import { RLHTTPClient, GameCommand } from './http-client.js';
import type { AIBrain, BrainDecision } from './ai-loop-orchestrator.js';
import { ObservationReceiver } from './observation-receiver.js';
import { WorldStateMapper } from './world-state-mapper.js';
import type { WorldState } from '@ai-commander/domain';

export interface TournamentMetrics {
  tick: number;
  gameState: {
    player1Units: number;
    player2Units: number;
    player1Buildings: number;
    player2Buildings: number;
  };
  player1Decision: {
    commands: number;
    latency: number;
  };
  player2Decision: {
    commands: number;
    latency: number;
  };
  executionTime: number;
}

export class TournamentOrchestrator {
  private metrics: TournamentMetrics[] = [];

  constructor(
    private client: RLHTTPClient,
    private observationReceiver: ObservationReceiver,
    private worldStateMapper: WorldStateMapper,
    private brain1: AIBrain,
    private brain2: AIBrain,
    private logger: Logger
  ) {}

  /**
   * Run a complete tournament match
   */
  async runTournament(maxTicks: number): Promise<{ metrics: TournamentMetrics[]; finalState: any }> {
    this.logger.info('Tournament started', { maxTicks, brain1: 'Ollama', brain2: 'Ollama' });

    let ticksCompleted = 0;
    let finalState: any = null;

    try {
      while (ticksCompleted < maxTicks) {
        const tickStartTime = Date.now();

        // Step 1: Observe current game state (empty commands)
        const rawGameState = await this.client.step([]);
        const worldState = this.worldStateMapper.mapObservationToWorldState(rawGameState);

        if (!worldState) {
          this.logger.error('Failed to map world state');
          break;
        }

        // Step 2: Get decisions from both brains simultaneously (actually sequential but same game state)
        const decision1Start = Date.now();
        let decision1: BrainDecision;
        try {
          decision1 = await this.brain1.decide(worldState);
        } catch (error) {
          this.logger.error('Brain 1 decision failed', { error: String(error) });
          decision1 = { playerID: 1, commands: [], reasoning: 'Error', timestamp: new Date() };
        }
        const decision1Latency = Date.now() - decision1Start;

        const decision2Start = Date.now();
        let decision2: BrainDecision;
        try {
          decision2 = await this.brain2.decide(worldState);
        } catch (error) {
          this.logger.error('Brain 2 decision failed', { error: String(error) });
          decision2 = { playerID: 2, commands: [], reasoning: 'Error', timestamp: new Date() };
        }
        const decision2Latency = Date.now() - decision2Start;

        // Step 3: Prepare combined command set
        const combinedCommands: GameCommand[] = [
          ...decision1.commands,
          ...decision2.commands,
        ];

        // Step 4: Execute all commands in one game tick
        const executionStart = Date.now();
        const nextState = await this.client.step(combinedCommands);
        const executionTime = Date.now() - executionStart;

        // Step 5: Record metrics
        const nextWorldState = this.worldStateMapper.mapObservationToWorldState(nextState);
        const player1Units = nextWorldState?.agents.filter(
          a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '1'
        ).length || 0;
        const player2Units = nextWorldState?.agents.filter(
          a => (a.customData as any)?.type === 'unit' && a.controlledByPlayerId?.toString() === '2'
        ).length || 0;
        const player1Buildings = nextWorldState?.agents.filter(
          a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '1'
        ).length || 0;
        const player2Buildings = nextWorldState?.agents.filter(
          a => (a.customData as any)?.type === 'building' && a.controlledByPlayerId?.toString() === '2'
        ).length || 0;

        const metric: TournamentMetrics = {
          tick: worldState.time.currentTick.number,
          gameState: {
            player1Units,
            player2Units,
            player1Buildings,
            player2Buildings,
          },
          player1Decision: {
            commands: decision1.commands.length,
            latency: decision1Latency,
          },
          player2Decision: {
            commands: decision2.commands.length,
            latency: decision2Latency,
          },
          executionTime,
        };

        this.metrics.push(metric);
        finalState = nextState;
        ticksCompleted++;

        // Log progress
        if (ticksCompleted % 10 === 0) {
          this.logger.info('Tournament progress', {
            tick: ticksCompleted,
            player1Units,
            player2Units,
            p1Commands: decision1.commands.length,
            p2Commands: decision2.commands.length,
          });
        }

        // Check for early termination (one player eliminated)
        if (player1Units === 0 || player2Units === 0) {
          this.logger.info('Match ended early - units eliminated', {
            tick: ticksCompleted,
            player1Units,
            player2Units,
          });
          break;
        }
      }
    } catch (error) {
      this.logger.error('Tournament execution failed', { error: String(error) });
    }

    this.logger.info('Tournament complete', { ticksCompleted, finalState: finalState?.tick });

    return {
      metrics: this.metrics,
      finalState,
    };
  }

  /**
   * Generate tournament report
   */
  generateReport(): string {
    const lines: string[] = [];

    lines.push('╔════════════════════════════════════════════════════════════╗');
    lines.push('║            TOURNAMENT RESULTS REPORT                      ║');
    lines.push('╚════════════════════════════════════════════════════════════╝');
    lines.push('');

    if (this.metrics.length === 0) {
      lines.push('No metrics recorded.');
      return lines.join('\n');
    }

    const totalTicks = this.metrics.length;
    const finalMetric = this.metrics[this.metrics.length - 1];

    lines.push(`Ticks Completed: ${totalTicks}`);
    lines.push('');

    lines.push('Player 1 (Gaul) - Final State:');
    lines.push(`  Units: ${finalMetric.gameState.player1Units}`);
    lines.push(`  Buildings: ${finalMetric.gameState.player1Buildings}`);

    lines.push('');
    lines.push('Player 2 (Athenians) - Final State:');
    lines.push(`  Units: ${finalMetric.gameState.player2Units}`);
    lines.push(`  Buildings: ${finalMetric.gameState.player2Buildings}`);

    lines.push('');
    lines.push('Decision Performance:');

    const avgP1CommandsPerDecision = this.metrics.reduce((sum, m) => sum + m.player1Decision.commands, 0) / totalTicks;
    const avgP2CommandsPerDecision = this.metrics.reduce((sum, m) => sum + m.player2Decision.commands, 0) / totalTicks;
    const avgP1Latency = this.metrics.reduce((sum, m) => sum + m.player1Decision.latency, 0) / totalTicks;
    const avgP2Latency = this.metrics.reduce((sum, m) => sum + m.player2Decision.latency, 0) / totalTicks;

    lines.push(`  Player 1 avg commands/tick: ${avgP1CommandsPerDecision.toFixed(1)}`);
    lines.push(`  Player 2 avg commands/tick: ${avgP2CommandsPerDecision.toFixed(1)}`);
    lines.push(`  Player 1 avg latency: ${avgP1Latency.toFixed(0)}ms`);
    lines.push(`  Player 2 avg latency: ${avgP2Latency.toFixed(0)}ms`);

    return lines.join('\n');
  }

  /**
   * Get all metrics
   */
  getMetrics(): TournamentMetrics[] {
    return this.metrics;
  }
}
