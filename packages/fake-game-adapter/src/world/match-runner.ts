/**
 * Match Runner
 *
 * Execute autonomous matches between two brains.
 * Collects replay, trace, and metrics (decisions, costs, latency).
 */

import type { Brain, BrainInput } from './brain-sdk.js';
import type { FakeWorldSnapshot } from './fake-world-state.js';
import { createInitialWorld, progressTick } from './fake-world-state.js';
import { createObservation } from './observation-protocol.js';

export interface MatchConfig {
  readonly maxTicks: number;
  readonly player1Brain: Brain;
  readonly player2Brain: Brain;
  readonly mapSeed?: number;
}

export interface DecisionRecord {
  readonly tick: number;
  readonly player: 'player1' | 'player2';
  readonly brainName: string;
  readonly goal: string;
  readonly confidence: number;
  readonly costUsd?: number;
  readonly tokensUsed?: number;
  readonly latencyMs: number;
}

export interface MatchMetrics {
  readonly totalTicks: number;
  readonly totalDecisions: number;
  readonly decisionsPerPlayer: Record<'player1' | 'player2', number>;
  readonly totalCostUsd: number;
  readonly costPerPlayer: Record<'player1' | 'player2', number>;
  readonly totalTokens: number;
  readonly tokensPerPlayer: Record<'player1' | 'player2', number>;
  readonly averageLatencyMs: number;
  readonly latencyPerPlayer: Record<'player1' | 'player2', number>;
  readonly winner?: 'player1' | 'player2' | 'draw';
}

export interface MatchReplay {
  readonly config: MatchConfig;
  readonly startTime: number;
  readonly endTime: number;
  readonly durationMs: number;
  readonly decisions: DecisionRecord[];
  readonly metrics: MatchMetrics;
  readonly finalState: FakeWorldSnapshot;
  readonly worldHistory?: FakeWorldSnapshot[];
}

/**
 * Match Runner - execute a single match and collect all data
 */
export class MatchRunner {
  private config: MatchConfig;
  private decisions: DecisionRecord[] = [];
  private worldHistory: FakeWorldSnapshot[] = [];

  constructor(config: MatchConfig) {
    this.config = config;
  }

  /**
   * Run a complete match
   */
  async runMatch(): Promise<MatchReplay> {
    const startTime = performance.now();
    let world = createInitialWorld();

    this.worldHistory.push(JSON.parse(JSON.stringify(world)));

    for (let tick = 1; tick <= this.config.maxTicks; tick++) {
      // Get decision from player 1
      const p1Decision = await this.makeDecision(world, this.config.player1Brain, 'player1', tick);
      this.decisions.push(p1Decision);

      // Get decision from player 2
      const p2Decision = await this.makeDecision(world, this.config.player2Brain, 'player2', tick);
      this.decisions.push(p2Decision);

      // Tick world
      world = progressTick(world);
      this.worldHistory.push(JSON.parse(JSON.stringify(world)));

      // Check for game end condition (simple: someone reaches 500 resources)
      const p1Resources = (world as any).players?.[0]?.resources || 0;
      const p2Resources = (world as any).players?.[1]?.resources || 0;
      if (p1Resources >= 500 || p2Resources >= 500) {
        break;
      }
    }

    const endTime = performance.now();
    const metrics = this.calculateMetrics();

    return {
      config: this.config,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      decisions: this.decisions,
      metrics,
      finalState: world,
      worldHistory: this.worldHistory,
    };
  }

  /**
   * Make a decision for one player
   */
  private async makeDecision(
    world: FakeWorldSnapshot,
    brain: Brain,
    player: 'player1' | 'player2',
    tick: number
  ): Promise<DecisionRecord> {
    const startTime = performance.now();

    const observation = createObservation(world, 'match', player);

    const input: BrainInput = {
      world,
      availableGoals: [
        { id: 'gather', name: 'gather-resources', description: 'Gather resources', priority: 80, reward: 50 },
        { id: 'expand', name: 'expand-base', description: 'Expand base', priority: 60, reward: 40 },
        { id: 'defend', name: 'defend-base', description: 'Defend base', priority: 90, reward: 60 },
      ],
      availableActions: [
        { action: 'move', description: 'Move units', precondition: 'has-units', estimatedDuration: 1 },
        { action: 'build', description: 'Build structures', precondition: 'has-resources', estimatedDuration: 5 },
        { action: 'attack', description: 'Attack opponent', precondition: 'has-units', estimatedDuration: 3 },
      ],
      memory: {
        previousDecisions: Object.freeze(
          this.decisions.filter((d) => d.player === player).slice(-5).map(d => ({
            goal: d.goal,
            commands: [] as any[],
            tick: d.tick,
            outcome: 'executed'
          }))
        ),
        knownStrategies: Object.freeze([]),
        opponentModels: new Map(),
      },
      executionHistory: [],
    };

    const output = await brain.decide(input);
    const latencyMs = performance.now() - startTime;

    // Get stats if available
    const stats = (brain as any).getStats?.() || {};

    return {
      tick,
      player,
      brainName: brain.name,
      goal: output.selectedGoal,
      confidence: output.metadata?.confidence || 50,
      costUsd: (stats as any).totalCost,
      tokensUsed: (stats as any).totalTokens,
      latencyMs,
    };
  }

  /**
   * Calculate match metrics from decisions
   */
  private calculateMetrics(): MatchMetrics {
    const p1Decisions = this.decisions.filter((d) => d.player === 'player1');
    const p2Decisions = this.decisions.filter((d) => d.player === 'player2');

    const p1Cost = p1Decisions.reduce((sum, d) => sum + (d.costUsd || 0), 0);
    const p2Cost = p2Decisions.reduce((sum, d) => sum + (d.costUsd || 0), 0);

    const p1Tokens = p1Decisions.reduce((sum, d) => sum + (d.tokensUsed || 0), 0);
    const p2Tokens = p2Decisions.reduce((sum, d) => sum + (d.tokensUsed || 0), 0);

    const p1Latencies = p1Decisions.map((d) => d.latencyMs);
    const p2Latencies = p2Decisions.map((d) => d.latencyMs);

    const p1AvgLatency = p1Latencies.length > 0
      ? p1Latencies.reduce((a, b) => a + b, 0) / p1Latencies.length
      : 0;

    const p2AvgLatency = p2Latencies.length > 0
      ? p2Latencies.reduce((a, b) => a + b, 0) / p2Latencies.length
      : 0;

    const avgLatency = this.decisions.length > 0
      ? this.decisions.reduce((sum, d) => sum + d.latencyMs, 0) / this.decisions.length
      : 0;

    return {
      totalTicks: Math.ceil(this.decisions.length / 2),
      totalDecisions: this.decisions.length,
      decisionsPerPlayer: {
        player1: p1Decisions.length,
        player2: p2Decisions.length,
      },
      totalCostUsd: p1Cost + p2Cost,
      costPerPlayer: {
        player1: p1Cost,
        player2: p2Cost,
      },
      totalTokens: p1Tokens + p2Tokens,
      tokensPerPlayer: {
        player1: p1Tokens,
        player2: p2Tokens,
      },
      averageLatencyMs: avgLatency,
      latencyPerPlayer: {
        player1: p1AvgLatency,
        player2: p2AvgLatency,
      },
    };
  }
}
