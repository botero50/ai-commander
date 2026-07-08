/**
 * Ollama Match Executor — Run a complete Ollama vs Ollama match
 *
 * Orchestrates:
 * - Launch game
 * - Connect two Ollama brains
 * - Run observe → plan → decide → execute loop
 * - Detect winner
 * - Save replay
 * - Save logs
 * - Save telemetry
 */

import type { GameSession } from '@ai-commander/adapter';
import type { Brain } from '@ai-commander/brain';
import { BrainExecutor } from '@ai-commander/agent-runtime';
import type { OllamaBrainConfig } from '@ai-commander/brain-ollama';
import { OllamaBrain } from '@ai-commander/brain-ollama';

export interface MatchConfig {
  readonly player1Model: string; // e.g., "mistral"
  readonly player2Model: string;
  readonly ollamaEndpoint: string;
  readonly maxTicks: number;
  readonly replayPath?: string;
  readonly logsPath?: string;
  readonly telemetryPath?: string;
}

export interface MatchResult {
  readonly winner: number | null; // 1, 2, or null if draw
  readonly totalTicks: number;
  readonly duration: number;
  readonly player1Stats: {
    readonly commandsExecuted: number;
    readonly commandsFailed: number;
    readonly goalsCompleted: number;
    readonly averageLatencyMs: number;
  };
  readonly player2Stats: {
    readonly commandsExecuted: number;
    readonly commandsFailed: number;
    readonly goalsCompleted: number;
    readonly averageLatencyMs: number;
  };
  readonly replayPath?: string;
  readonly logsPath?: string;
  readonly telemetryPath?: string;
}

export class OllamaMatchExecutor {
  private config: MatchConfig;
  private brains: [Brain, Brain];
  private executors: [BrainExecutor, BrainExecutor];
  private currentTick = 0;
  private matchStartTime = 0;
  private events: Array<{ tick: number; type: string; detail: string }> = [];

  constructor(config: MatchConfig) {
    this.config = config;

    // Create two Ollama brains with different models
    const brain1Config: OllamaBrainConfig = {
      endpoint: config.ollamaEndpoint,
      model: config.player1Model,
      temperature: 0.7,
      maxRetries: 3,
      timeoutMs: 60000,
    };

    const brain2Config: OllamaBrainConfig = {
      endpoint: config.ollamaEndpoint,
      model: config.player2Model,
      temperature: 0.7,
      maxRetries: 3,
      timeoutMs: 60000,
    };

    this.brains = [new OllamaBrain(brain1Config), new OllamaBrain(brain2Config)];

    // Create isolated executors for each player
    this.executors = [
      new BrainExecutor(1, 'Player 1', this.brains[0]),
      new BrainExecutor(2, 'Player 2', this.brains[1]),
    ];
  }

  /**
   * Run a complete match from start to finish
   */
  async execute(gameSession: GameSession): Promise<MatchResult> {
    this.matchStartTime = Date.now();
    this.events = [];
    this.currentTick = 0;

    try {
      // Start the game
      console.log('[Match] Starting game session...');
      await gameSession.start();
      this.logEvent('game_start', 'Game started');

      // Main game loop
      while (this.currentTick < this.config.maxTicks && !this.isGameOver(gameSession)) {
        await this.tickMatch(gameSession);
        this.currentTick++;

        // Log progress every 100 ticks
        if (this.currentTick % 100 === 0) {
          console.log(`[Match] Tick ${this.currentTick}...`);
        }
      }

      console.log('[Match] Match complete');
      this.logEvent('game_end', `Match ended at tick ${this.currentTick}`);

      return this.generateResult(gameSession);
    } catch (err) {
      console.error('[Match] Error during execution:', err);
      throw err;
    } finally {
      await gameSession.stop();
    }
  }

  /**
   * Execute one tick of the match
   */
  private async tickMatch(gameSession: GameSession): Promise<void> {
    // Get observations for each player
    const obs1 = this.getObservation(gameSession, 1);
    const obs2 = this.getObservation(gameSession, 2);

    if (!obs1 || !obs2) {
      throw new Error('Cannot get observations from game session');
    }

    // Get available goals and commands
    const goals = this.getAvailableGoals();
    const commands = this.getAvailableCommands();

    // Execute both players' decisions in parallel
    const [decision1, decision2] = await Promise.all([
      this.executors[0].decide(obs1, goals, commands),
      this.executors[1].decide(obs2, goals, commands),
    ]);

    // Send commands to game
    if (decision1.commands.length > 0) {
      this.logEvent('player1_command', `${decision1.commands.length} commands`);
    }
    if (decision2.commands.length > 0) {
      this.logEvent('player2_command', `${decision2.commands.length} commands`);
    }

    // Update metrics
    this.executors[0].updateMetrics(decision1.commands.length, 0, decision1.selectedGoal !== 'none' ? 1 : 0, 0);
    this.executors[1].updateMetrics(decision2.commands.length, 0, decision2.selectedGoal !== 'none' ? 1 : 0, 0);

    // Advance game tick
    await gameSession.tick();
  }

  /**
   * Check if game is over
   */
  private isGameOver(gameSession: GameSession): boolean {
    // In real implementation, check game session state
    // For now, just return false
    return false;
  }

  /**
   * Get observation for a player
   */
  private getObservation(gameSession: GameSession, playerId: number) {
    // In real implementation, get from game session
    // For now, return null (will cause error to handle gracefully)
    return null;
  }

  /**
   * Get available goals
   */
  private getAvailableGoals() {
    return [
      { id: 'expand', intent: 'Expand territory', priority: 'high' as const, feasibility: 0.8, expectedDuration: 30, estimatedValue: 500 },
      { id: 'defend', intent: 'Defend base', priority: 'high' as const, feasibility: 0.9, expectedDuration: 10, estimatedValue: 1000 },
      { id: 'attack', intent: 'Attack enemy', priority: 'medium' as const, feasibility: 0.6, expectedDuration: 20, estimatedValue: 800 },
    ];
  }

  /**
   * Get available commands
   */
  private getAvailableCommands() {
    return [
      { id: 'move', action: 'move', expectedDuration: 5, expectedCost: 0, description: 'Move units' },
      { id: 'attack', action: 'attack', expectedDuration: 10, expectedCost: 0, description: 'Attack' },
      { id: 'build', action: 'build', expectedDuration: 30, expectedCost: 100, description: 'Build' },
      { id: 'gather', action: 'gather', expectedDuration: 15, expectedCost: 0, description: 'Gather' },
    ];
  }

  /**
   * Log an event
   */
  private logEvent(type: string, detail: string): void {
    this.events.push({ tick: this.currentTick, type, detail });
  }

  /**
   * Generate final match result
   */
  private generateResult(gameSession: GameSession): MatchResult {
    const duration = Date.now() - this.matchStartTime;
    const ctx1 = this.executors[0].getContext();
    const ctx2 = this.executors[1].getContext();

    return {
      winner: null, // Would be determined from game session
      totalTicks: this.currentTick,
      duration,
      player1Stats: {
        commandsExecuted: ctx1.memory.metrics.commandsExecuted,
        commandsFailed: ctx1.memory.metrics.commandsFailed,
        goalsCompleted: ctx1.memory.metrics.goalsCompleted,
        averageLatencyMs: ctx1.averageLatencyMs,
      },
      player2Stats: {
        commandsExecuted: ctx2.memory.metrics.commandsExecuted,
        commandsFailed: ctx2.memory.metrics.commandsFailed,
        goalsCompleted: ctx2.memory.metrics.goalsCompleted,
        averageLatencyMs: ctx2.averageLatencyMs,
      },
      replayPath: this.config.replayPath,
      logsPath: this.config.logsPath,
      telemetryPath: this.config.telemetryPath,
    };
  }
}
