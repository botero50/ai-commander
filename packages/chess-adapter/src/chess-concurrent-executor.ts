/**
 * Chess Concurrent Executor — Manages parallel match execution.
 *
 * Handles:
 * - Concurrent game execution with resource pooling
 * - Per-match timeout enforcement
 * - Error recovery and fallback strategies
 * - Match state tracking across concurrent executions
 * - Progress monitoring and reporting
 * - Cancellation and graceful shutdown
 */

import type { Brain } from '@ai-commander/brain';
import { ChessGameLoop } from './chess-game-loop.js';
import type { ChessGameSession } from './chess-game-session.js';
import type { ChessAdapter } from './chess-adapter.js';
import type { ScheduledMatch } from './chess-tournament-scheduler.js';

export interface MatchExecutionConfig {
  readonly maxConcurrentMatches: number;
  readonly timeoutPerMoveMs: number;
  readonly maxRetriesPerMatch: number;
  readonly enableLogging: boolean;
}

export interface MatchExecutionResult {
  readonly matchId: string;
  readonly whiteBrainName: string;
  readonly blackBrainName: string;
  readonly result: 'white-win' | 'black-win' | 'draw';
  readonly moveCount: number;
  readonly duration: number; // ms
  readonly attempts: number;
  readonly success: boolean;
  readonly error?: string;
  readonly startTime: number;
  readonly endTime: number;
}

export interface ExecutorState {
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly inProgressMatches: number;
  readonly failedMatches: number;
  readonly queuedMatches: number;
  readonly successRate: number;
  readonly avgDurationMs: number;
  readonly totalDurationMs: number;
}

interface MatchTask {
  readonly matchId: string;
  readonly whiteBrain: Brain;
  readonly blackBrain: Brain;
  readonly scheduledMatch: ScheduledMatch;
  readonly retryCount: number;
}

export class ChessConcurrentExecutor {
  private adapter: ChessAdapter;
  private config: MatchExecutionConfig;
  private matchQueue: MatchTask[] = [];
  private inProgressMatches: Map<string, MatchTask> = new Map();
  private completedMatches: Map<string, MatchExecutionResult> = new Map();
  private brainMap: Map<string, Brain> = new Map();
  private isRunning = false;
  private abortController: AbortController | null = null;

  constructor(adapter: ChessAdapter, config: MatchExecutionConfig) {
    this.adapter = adapter;
    this.config = config;
  }

  /**
   * Register a brain for matches.
   */
  registerBrain(brain: Brain): void {
    this.brainMap.set(brain.name, brain);
  }

  /**
   * Queue a match for execution.
   */
  queueMatch(scheduledMatch: ScheduledMatch): void {
    const whiteBrain = this.brainMap.get(scheduledMatch.whiteBrainName);
    const blackBrain = this.brainMap.get(scheduledMatch.blackBrainName);

    if (!whiteBrain || !blackBrain) {
      throw new Error(`Brain not registered: ${scheduledMatch.whiteBrainName} or ${scheduledMatch.blackBrainName}`);
    }

    this.matchQueue.push({
      matchId: scheduledMatch.matchId,
      whiteBrain,
      blackBrain,
      scheduledMatch,
      retryCount: 0,
    });
  }

  /**
   * Queue multiple matches at once.
   */
  queueMatches(scheduledMatches: readonly ScheduledMatch[]): void {
    for (const match of scheduledMatches) {
      this.queueMatch(match);
    }
  }

  /**
   * Start executing queued matches concurrently.
   */
  async start(): Promise<MatchExecutionResult[]> {
    if (this.isRunning) {
      throw new Error('Executor is already running');
    }

    this.isRunning = true;
    this.abortController = new AbortController();

    try {
      const results = await this.executeAllMatches();
      return results;
    } finally {
      this.isRunning = false;
      this.abortController = null;
    }
  }

  /**
   * Main execution loop: process matches concurrently.
   */
  private async executeAllMatches(): Promise<MatchExecutionResult[]> {
    const results: MatchExecutionResult[] = [];

    while (
      this.matchQueue.length > 0 ||
      this.inProgressMatches.size > 0
    ) {
      // Check abort signal
      if (this.abortController?.signal.aborted) {
        this.log('Execution aborted');
        break;
      }

      // Start new matches up to concurrency limit
      while (
        this.matchQueue.length > 0 &&
        this.inProgressMatches.size < this.config.maxConcurrentMatches
      ) {
        const task = this.matchQueue.shift();
        if (task) {
          this.startMatch(task);
        }
      }

      // Wait for at least one match to complete
      if (this.inProgressMatches.size > 0) {
        const completedMatchId = await this.waitForAnyMatch();
        if (completedMatchId) {
          const result = this.completedMatches.get(completedMatchId);
          if (result) {
            results.push(result);
          }
          this.inProgressMatches.delete(completedMatchId);
        }
      }
    }

    return results;
  }

  /**
   * Start executing a single match.
   */
  private startMatch(task: MatchTask): void {
    this.inProgressMatches.set(task.matchId, task);
    this.log(`[${task.matchId}] Starting match: ${task.scheduledMatch.whiteBrainName} vs ${task.scheduledMatch.blackBrainName}`);

    // Execute in background without awaiting
    this.executeMatch(task).catch(error => {
      this.log(`[${task.matchId}] Execution error: ${error}`);
    });
  }

  /**
   * Execute a single match with retry logic.
   */
  private async executeMatch(task: MatchTask): Promise<void> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetriesPerMatch; attempt++) {
      try {
        this.log(`[${task.matchId}] Attempt ${attempt}/${this.config.maxRetriesPerMatch}`);

        // Create game session
        const session = (await this.adapter.createSession()) as ChessGameSession;
        await session.start();

        try {
          // Create and run game loop
          const gameLoop = new ChessGameLoop(
            session,
            task.whiteBrain,
            task.blackBrain,
            {
              moveTimeoutMs: this.config.timeoutPerMoveMs,
              maxMoves: 500,
              enableLogging: this.config.enableLogging,
            }
          );

          // Execute with timeout
          const result = await Promise.race([
            gameLoop.run(),
            this.createTimeoutPromise(120000), // 2 minute match timeout
          ]);

          if (result === undefined) {
            throw new Error('Match execution timeout (2 minutes)');
          }

          // Success - record result
          const endTime = Date.now();
          const duration = endTime - startTime;
          const moveCount = gameLoop.getMoveCount();

          this.completedMatches.set(task.matchId, {
            matchId: task.matchId,
            whiteBrainName: task.scheduledMatch.whiteBrainName,
            blackBrainName: task.scheduledMatch.blackBrainName,
            result,
            moveCount,
            duration,
            attempts: attempt,
            success: true,
            startTime,
            endTime,
          });

          this.log(`[${task.matchId}] Completed: ${result} in ${duration}ms (${moveCount} moves)`);
          return;
        } finally {
          await session.stop();
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`[${task.matchId}] Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.config.maxRetriesPerMatch) {
          // Wait before retry with exponential backoff
          await this.sleep(Math.pow(2, attempt - 1) * 1000);
        }
      }
    }

    // All retries exhausted
    const endTime = Date.now();
    const duration = endTime - startTime;

    this.completedMatches.set(task.matchId, {
      matchId: task.matchId,
      whiteBrainName: task.scheduledMatch.whiteBrainName,
      blackBrainName: task.scheduledMatch.blackBrainName,
      result: 'draw', // Default to draw on failure
      moveCount: 0,
      duration,
      attempts: this.config.maxRetriesPerMatch,
      success: false,
      error: lastError?.message || 'Unknown error',
      startTime,
      endTime,
    });

    this.log(`[${task.matchId}] Failed after ${this.config.maxRetriesPerMatch} attempts: ${lastError?.message}`);
  }

  /**
   * Wait for any match to complete and return its ID.
   */
  private async waitForAnyMatch(): Promise<string | null> {
    if (this.inProgressMatches.size === 0) {
      return null;
    }

    // Simple polling approach - in production could use event emitters
    // This is fast enough for reasonable concurrency levels
    while (this.inProgressMatches.size > 0) {
      for (const [matchId] of this.inProgressMatches) {
        if (this.completedMatches.has(matchId)) {
          return matchId;
        }
      }

      // Check every 100ms
      await this.sleep(100);

      // Check abort signal
      if (this.abortController?.signal.aborted) {
        return null;
      }
    }

    return null;
  }

  /**
   * Create a timeout promise.
   */
  private createTimeoutPromise(delayMs: number): Promise<undefined> {
    return new Promise(resolve => {
      const timeoutId = setTimeout(() => resolve(undefined), delayMs);
      this.abortController?.signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        resolve(undefined);
      });
    });
  }

  /**
   * Sleep for a duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cancel execution gracefully.
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isRunning = false;
  }

  /**
   * Get executor state.
   */
  getState(): ExecutorState {
    const completed = this.completedMatches.size;
    const failed = Array.from(this.completedMatches.values()).filter(r => !r.success).length;
    const total = completed + this.matchQueue.length + this.inProgressMatches.size;
    const avgDuration =
      completed > 0
        ? Array.from(this.completedMatches.values()).reduce((sum, r) => sum + r.duration, 0) /
          completed
        : 0;
    const totalDuration = Array.from(this.completedMatches.values()).reduce(
      (sum, r) => sum + r.duration,
      0
    );

    return {
      totalMatches: total,
      completedMatches: completed,
      inProgressMatches: this.inProgressMatches.size,
      failedMatches: failed,
      queuedMatches: this.matchQueue.length,
      successRate: total > 0 ? (completed - failed) / completed : 0,
      avgDurationMs: Math.round(avgDuration),
      totalDurationMs: totalDuration,
    };
  }

  /**
   * Get completed matches.
   */
  getCompletedMatches(): readonly MatchExecutionResult[] {
    return Array.from(this.completedMatches.values());
  }

  /**
   * Get a specific match result.
   */
  getMatchResult(matchId: string): MatchExecutionResult | null {
    return this.completedMatches.get(matchId) || null;
  }

  /**
   * Log a message.
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      console.log(`[ConcurrentExecutor] ${message}`);
    }
  }
}
