/**
 * Brain Executor — Isolated execution context for each player's brain
 *
 * Ensures:
 * - Separate memory per player
 * - Separate conversation history
 * - Separate observations
 * - Separate decision pipeline
 * - Separate telemetry/metrics
 */

import type { Brain, BrainDecision, WorldObservation, GoalOption, CommandOption, ExecutionMemory } from '@ai-commander/brain';

export interface BrainExecutionContext {
  readonly playerId: number;
  readonly playerName: string;
  readonly brain: Brain;
  readonly memory: ExecutionMemory;
  readonly decisions: BrainDecision[];
  readonly totalInferences: number;
  readonly totalTimeMs: number;
  readonly averageLatencyMs: number;
  readonly lastDecision: BrainDecision | null;
  readonly lastError: Error | null;
}

export class BrainExecutor {
  private playerId: number;
  private playerName: string;
  private brain: Brain;
  private memory: ExecutionMemory;
  private decisions: BrainDecision[] = [];
  private totalInferences = 0;
  private totalTimeMs = 0;
  private lastDecision: BrainDecision | null = null;
  private lastError: Error | null = null;

  constructor(playerId: number, playerName: string, brain: Brain) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.brain = brain;

    // Initialize isolated memory for this player
    this.memory = {
      recentEvents: [],
      recentDecisions: [],
      metrics: {
        commandsExecuted: 0,
        commandsFailed: 0,
        goalsCompleted: 0,
        goalsAbandoned: 0,
      },
    };
  }

  /**
   * Execute a single decision cycle for this player
   */
  async decide(
    observation: WorldObservation,
    goals: readonly GoalOption[],
    commands: readonly CommandOption[]
  ): Promise<BrainDecision> {
    const startTime = Date.now();
    this.lastError = null;

    try {
      // Call brain.decide with isolated memory
      const decision = await this.brain.decide(observation, goals, commands, this.memory);

      const latencyMs = Date.now() - startTime;
      this.totalInferences++;
      this.totalTimeMs += latencyMs;

      // Track decision locally
      this.lastDecision = decision;
      this.decisions.push(decision);

      // Keep only last 100 decisions in memory
      if (this.decisions.length > 100) {
        this.decisions = this.decisions.slice(-100);
      }

      // Update memory with this decision
      this.memory = {
        ...this.memory,
        recentDecisions: [
          ...this.memory.recentDecisions,
          {
            tick: observation.tick,
            goal: decision.selectedGoal,
            commands: decision.commands,
            outcome: `Executed ${decision.commands.length} commands`,
          },
        ].slice(-20), // Keep last 20 decisions in memory
      };

      return decision;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      this.totalInferences++;
      this.totalTimeMs += latencyMs;
      this.lastError = err as Error;

      // Return fallback decision on error
      return {
        reasoning: `Brain error: ${(err as Error).message}`,
        selectedGoal: 'fallback',
        plan: ['wait', 'assess'],
        commands: [],
        confidence: 0.0,
      };
    }
  }

  /**
   * Record an event that happened during this player's execution
   */
  recordEvent(type: string, detail: string, tick: number): void {
    this.memory = {
      ...this.memory,
      recentEvents: [
        ...this.memory.recentEvents,
        { tick, type, detail },
      ].slice(-50), // Keep last 50 events
    };
  }

  /**
   * Update execution metrics
   */
  updateMetrics(executed: number, failed: number, completed: number, abandoned: number): void {
    this.memory = {
      ...this.memory,
      metrics: {
        commandsExecuted: this.memory.metrics.commandsExecuted + executed,
        commandsFailed: this.memory.metrics.commandsFailed + failed,
        goalsCompleted: this.memory.metrics.goalsCompleted + completed,
        goalsAbandoned: this.memory.metrics.goalsAbandoned + abandoned,
      },
    };
  }

  /**
   * Get current execution context
   */
  getContext(): BrainExecutionContext {
    return {
      playerId: this.playerId,
      playerName: this.playerName,
      brain: this.brain,
      memory: this.memory,
      decisions: [...this.decisions],
      totalInferences: this.totalInferences,
      totalTimeMs: this.totalTimeMs,
      averageLatencyMs: this.totalInferences > 0 ? Math.round(this.totalTimeMs / this.totalInferences) : 0,
      lastDecision: this.lastDecision,
      lastError: this.lastError,
    };
  }

  /**
   * Get brain name
   */
  getBrainName(): string {
    return this.brain.name;
  }

  /**
   * Get player ID
   */
  getPlayerId(): number {
    return this.playerId;
  }

  /**
   * Reset all state (for testing)
   */
  reset(): void {
    this.memory = {
      recentEvents: [],
      recentDecisions: [],
      metrics: {
        commandsExecuted: 0,
        commandsFailed: 0,
        goalsCompleted: 0,
        goalsAbandoned: 0,
      },
    };
    this.decisions = [];
    this.totalInferences = 0;
    this.totalTimeMs = 0;
    this.lastDecision = null;
    this.lastError = null;
  }
}
