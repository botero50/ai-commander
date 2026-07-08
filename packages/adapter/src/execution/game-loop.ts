import { WorldState, Command } from '@ai-commander/domain';
import { GameSession } from '../types/game-session.js';

/**
 * Logger interface - injected, no dependency on specific logger implementation.
 */
interface Logger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  error(message: string, error?: unknown): void;
}

/**
 * Configuration for the game execution loop.
 * Framework-owned orchestration settings.
 */
export interface GameLoopConfig {
  tickDurationMs: number;
  maxIterations?: number;
  observeTimeoutMs?: number;
}

/**
 * Metrics collected during game loop execution.
 */
export interface GameLoopMetrics {
  iterationCount: number;
  observeCount: number;
  decideCount: number;
  executeCount: number;
  avgObserveLatencyMs: number;
  avgDecideLatencyMs: number;
  avgExecuteLatencyMs: number;
  totalLatencyMs: number;
}

/**
 * Callbacks for game loop phases.
 * Adapter provides implementations for game-specific observe/execute.
 */
export interface GameLoopCallbacks {
  onObserve?: (state: WorldState) => Promise<void>;
  onDecide?: (state: WorldState) => Promise<Command[]>;
  onExecute?: (commands: Command[]) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * Orchestrates the core game execution loop: Observe → Plan → Decide → Execute.
 *
 * Framework-owned component that works against the GameSession and GameAdapter interfaces.
 * No game-specific knowledge; fully generic across all game adapters.
 *
 * Architecture:
 * - Observe: Gets world state from GameSession
 * - Plan: Optional callback (reserved for future framework planning)
 * - Decide: Framework DecisionPipeline or callback-driven
 * - Execute: Calls adapter callback (game-specific command execution)
 */
export class GameLoop {
  private session: GameSession;
  private logger: Logger;
  private config: GameLoopConfig;
  private callbacks: GameLoopCallbacks;
  private running: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private iterationCount: number = 0;
  private observeLatencies: number[] = [];
  private decideLatencies: number[] = [];
  private executeLatencies: number[] = [];

  constructor(session: GameSession, config: GameLoopConfig, callbacks: GameLoopCallbacks, logger: Logger) {
    this.session = session;
    this.config = {
      observeTimeoutMs: 5000,
      ...config,
    };
    this.callbacks = callbacks;
    this.logger = logger;
  }

  /**
   * Start the game loop.
   * Initializes tick-based execution.
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('GameLoop already running');
    }

    if (!this.session.isActive()) {
      throw new Error('GameSession not active');
    }

    this.running = true;
    this.iterationCount = 0;
    this.observeLatencies = [];
    this.decideLatencies = [];
    this.executeLatencies = [];

    this.logger.info('Starting game loop', {
      sessionId: this.session.sessionId,
      tickDurationMs: this.config.tickDurationMs,
    });

    this.loopInterval = setInterval(() => {
      this.tick();
    }, this.config.tickDurationMs);
  }

  /**
   * Stop the game loop.
   * Cleans up resources and records final metrics.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    this.logger.info('GameLoop stopped', {
      sessionId: this.session.sessionId,
      iterations: this.iterationCount,
    });
  }

  /**
   * Single iteration of the game loop.
   * Implements: Observe → (Plan) → Decide → Execute
   */
  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }

    // Check iteration limit
    if (this.config.maxIterations && this.iterationCount >= this.config.maxIterations) {
      await this.stop();
      this.logger.info('GameLoop max iterations reached', {
        sessionId: this.session.sessionId,
        maxIterations: this.config.maxIterations,
      });
      return;
    }

    try {
      this.iterationCount++;

      // ===== OBSERVE =====
      const observeStart = Date.now();
      const worldState = await this.observe();
      const observeLatency = Date.now() - observeStart;
      this.observeLatencies.push(observeLatency);

      if (!worldState) {
        this.logger.warn('Failed to observe world state', {
          sessionId: this.session.sessionId,
          iteration: this.iterationCount,
        });
        return;
      }

      // onObserve callback (typically for telemetry/monitoring)
      if (this.callbacks.onObserve) {
        try {
          await this.callbacks.onObserve(worldState);
        } catch (err) {
          this.logger.warn('onObserve callback error', err);
        }
      }

      // ===== DECIDE =====
      const decideStart = Date.now();
      let commands: Command[] = [];
      try {
        commands = await this.decide(worldState);
      } catch (decideErr) {
        const decideLatency = Date.now() - decideStart;
        this.decideLatencies.push(decideLatency);

        if (this.callbacks.onError) {
          try {
            await this.callbacks.onError(decideErr instanceof Error ? decideErr : new Error(String(decideErr)));
          } catch (callbackErr) {
            this.logger.error('onError callback error', callbackErr);
          }
        }
        return;
      }
      const decideLatency = Date.now() - decideStart;
      this.decideLatencies.push(decideLatency);

      if (!commands || commands.length === 0) {
        // No commands this iteration (valid state)
        return;
      }

      // ===== EXECUTE =====
      const executeStart = Date.now();
      await this.execute(commands);
      const executeLatency = Date.now() - executeStart;
      this.executeLatencies.push(executeLatency);

      // Periodic metrics logging
      if (this.iterationCount % 100 === 0) {
        this.logger.debug('GameLoop iteration metrics', {
          iteration: this.iterationCount,
          observeLatencyMs: observeLatency,
          decideLatencyMs: decideLatency,
          executeLatencyMs: executeLatency,
        });
      }
    } catch (err) {
      this.logger.error('GameLoop iteration error', err);

      if (this.callbacks.onError) {
        try {
          await this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        } catch (callbackErr) {
          this.logger.error('onError callback error', callbackErr);
        }
      }
    }
  }

  /**
   * Observe phase: Get current world state.
   * Delegates to GameSession.observationProvider (adapter responsibility).
   */
  private async observe(): Promise<WorldState | null> {
    try {
      const state = await this.session.observationProvider.getWorldState();
      return state;
    } catch (err) {
      this.logger.error('Observation error', err);
      return null;
    }
  }

  /**
   * Decide phase: Determine next commands.
   * Uses callback pattern (adapter can inject decision logic).
   * Framework future: can replace with framework DecisionPipeline.
   */
  private async decide(state: WorldState): Promise<Command[]> {
    if (!this.callbacks.onDecide) {
      return [];
    }

    try {
      const commands = await this.callbacks.onDecide(state);
      return commands || [];
    } catch (err) {
      this.logger.error('Decision error', err);
      return [];
    }
  }

  /**
   * Execute phase: Run commands in game.
   * Delegates to adapter callback (game-specific execution).
   */
  private async execute(commands: Command[]): Promise<void> {
    if (!this.callbacks.onExecute) {
      return;
    }

    try {
      await this.callbacks.onExecute(commands);
    } catch (err) {
      this.logger.error('Execution error', err);
      throw err;
    }
  }

  /**
   * Check if loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get execution metrics.
   * Useful for performance monitoring and profiling.
   */
  getMetrics(): GameLoopMetrics {
    const avgObserve = this.observeLatencies.length > 0
      ? this.observeLatencies.reduce((a, b) => a + b, 0) / this.observeLatencies.length
      : 0;

    const avgDecide = this.decideLatencies.length > 0
      ? this.decideLatencies.reduce((a, b) => a + b, 0) / this.decideLatencies.length
      : 0;

    const avgExecute = this.executeLatencies.length > 0
      ? this.executeLatencies.reduce((a, b) => a + b, 0) / this.executeLatencies.length
      : 0;

    const totalLatency = this.observeLatencies.reduce((a, b) => a + b, 0)
      + this.decideLatencies.reduce((a, b) => a + b, 0)
      + this.executeLatencies.reduce((a, b) => a + b, 0);

    return {
      iterationCount: this.iterationCount,
      observeCount: this.observeLatencies.length,
      decideCount: this.decideLatencies.length,
      executeCount: this.executeLatencies.length,
      avgObserveLatencyMs: parseFloat(avgObserve.toFixed(2)),
      avgDecideLatencyMs: parseFloat(avgDecide.toFixed(2)),
      avgExecuteLatencyMs: parseFloat(avgExecute.toFixed(2)),
      totalLatencyMs: totalLatency,
    };
  }
}
