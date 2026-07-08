import { WorldState, Command } from '@ai-commander/domain';
import { Match } from './match.js';
import { Logger } from '../config/logger.js';
import { BrainAdapter } from './brain-adapter.js';
import { DecisionPipeline, type DecisionPipelineConfig } from './decision-pipeline.js';
import { BrainLifecycle, type BrainLifecycleConfig } from './brain-lifecycle.js';

// Brain interface - injected via dependency, no SDK imports
interface Brain {
  readonly name: string;
  readonly version: string;
  decide(observation: any, goals: any, commands: any, memory: any): Promise<any>;
}

export interface LoopConfig {
  tickDurationMs: number;
  maxIterations?: number;
  observeTimeoutMs?: number;
  decisionPipeline?: Partial<DecisionPipelineConfig>;
  brainLifecycle?: Partial<BrainLifecycleConfig>;
}

export interface LoopMetrics {
  iterationCount: number;
  observeCount: number;
  decideCount: number;
  executeCount: number;
  avgObserveLatencyMs: number;
  avgDecideLatencyMs: number;
  avgExecuteLatencyMs: number;
  totalLatencyMs: number;
}

export interface LoopCallbacks {
  onObserve?: (state: WorldState) => Promise<void>;
  onDecide?: (state: WorldState) => Promise<Command[]>;
  onExecute?: (commands: Command[]) => Promise<void>;
  onError?: (error: Error) => Promise<void>;
}

export class MatchLoop {
  private match: Match;
  private logger: Logger;
  private config: LoopConfig;
  private callbacks: LoopCallbacks;
  private brain: Brain | null = null;
  private decisionPipeline: DecisionPipeline;
  private brainLifecycle: BrainLifecycle;
  private running: boolean = false;
  private loopInterval: NodeJS.Timeout | null = null;
  private iterationCount: number = 0;
  private observeLatencies: number[] = [];
  private decideLatencies: number[] = [];
  private executeLatencies: number[] = [];

  constructor(match: Match, config: LoopConfig, callbacks: LoopCallbacks, logger: Logger, brain?: Brain) {
    this.match = match;
    this.config = {
      observeTimeoutMs: 5000,
      ...config,
    };
    this.callbacks = callbacks;
    this.brain = brain ?? null;
    this.logger = logger;
    this.decisionPipeline = new DecisionPipeline(config.decisionPipeline ?? {}, logger);
    this.brainLifecycle = new BrainLifecycle(config.brainLifecycle ?? {}, logger);
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Loop already running');
    }

    if (!this.match.isActive()) {
      throw new Error('Match not active');
    }

    // Initialize Brain lifecycle if Brain is provided
    if (this.brain) {
      try {
        await this.brainLifecycle.initialize();

        if (!this.brainLifecycle.isReady()) {
          throw new Error('Brain failed to initialize');
        }
      } catch (err) {
        this.logger.error('Brain initialization failed', err);
        throw err;
      }
    }

    this.running = true;
    this.iterationCount = 0;
    this.observeLatencies = [];
    this.decideLatencies = [];
    this.executeLatencies = [];

    this.logger.info('Starting match loop', {
      matchId: this.match.matchId,
      tickDurationMs: this.config.tickDurationMs,
      brainReady: this.brainLifecycle.isReady(),
    });

    this.loopInterval = setInterval(() => {
      this.tick();
    }, this.config.tickDurationMs);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    // Shutdown Brain lifecycle if Brain is provided
    if (this.brain && this.brainLifecycle.isReady()) {
      try {
        await this.brainLifecycle.shutdown();
      } catch (err) {
        this.logger.error('Brain shutdown error', err);
      }
    }

    this.logger.info('Match loop stopped', {
      matchId: this.match.matchId,
      iterations: this.iterationCount,
    });
  }

  private async tick(): Promise<void> {
    if (!this.running) {
      return;
    }

    if (this.config.maxIterations && this.iterationCount >= this.config.maxIterations) {
      await this.stop();
      this.logger.info('Match loop max iterations reached', {
        matchId: this.match.matchId,
        maxIterations: this.config.maxIterations,
      });
      return;
    }

    try {
      this.iterationCount++;

      // Observe
      const observeStart = Date.now();
      const worldState = await this.observe();
      const observeLatency = Date.now() - observeStart;
      this.observeLatencies.push(observeLatency);

      if (!worldState) {
        this.logger.warn('Failed to observe world state', {
          matchId: this.match.matchId,
          iteration: this.iterationCount,
        });
        return;
      }

      // Callback: onObserve
      if (this.callbacks.onObserve) {
        try {
          await this.callbacks.onObserve(worldState);
        } catch (err) {
          this.logger.warn('onObserve callback error', err);
        }
      }

      // Decide
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
        // No commands to execute this iteration
        return;
      }

      // Execute
      const executeStart = Date.now();
      await this.execute(commands);
      const executeLatency = Date.now() - executeStart;
      this.executeLatencies.push(executeLatency);

      if (this.iterationCount % 100 === 0) {
        this.logger.debug('Loop iteration metrics', {
          iteration: this.iterationCount,
          observeLatencyMs: observeLatency,
          decideLatencyMs: decideLatency,
          executeLatencyMs: executeLatency,
        });
      }
    } catch (err) {
      this.logger.error('Loop iteration error', err);

      if (this.callbacks.onError) {
        try {
          await this.callbacks.onError(err instanceof Error ? err : new Error(String(err)));
        } catch (callbackErr) {
          this.logger.error('onError callback error', callbackErr);
        }
      }
    }
  }

  private async observe(): Promise<WorldState | null> {
    try {
      const state = await this.match.getCurrentWorldState();
      return state;
    } catch (err) {
      this.logger.error('Observation error', err);
      return null;
    }
  }

  setBrain(brain: Brain): void {
    this.brain = brain;
  }

  getDecisionPipeline(): DecisionPipeline {
    return this.decisionPipeline;
  }

  getBrainLifecycle(): BrainLifecycle {
    return this.brainLifecycle;
  }

  private async decide(state: WorldState): Promise<Command[]> {
    // If Brain is injected, use decision pipeline with lifecycle management
    if (this.brain && this.brainLifecycle.isReady()) {
      const tick = state.time.currentTick.number;

      // Check Brain health before decision
      const health = await this.brainLifecycle.performHealthCheck();

      if (!health.isHealthy && health.details.recentErrors > 0) {
        this.logger.warn('Brain health degraded, attempting recovery', {
          tick,
          recentErrors: health.details.recentErrors,
        });

        const recovered = await this.brainLifecycle.attemptRecovery();
        if (!recovered) {
          this.logger.error('Brain recovery failed', { tick });
          return [];
        }
      }

      const result = await this.decisionPipeline.executeDecision(
        async (token) => {
          // Check for cancellation before calling brain
          if (token.isCancelled) {
            throw new Error('Decision cancelled');
          }

          const observation = BrainAdapter.worldStateToObservation(state, this.match.matchId, 'primary-agent');
          const goals = BrainAdapter.getDefaultGoals();
          const availableCommands = BrainAdapter.getDefaultCommands();
          const memory = BrainAdapter.getExecutionMemory();

          const decision = await this.brain!.decide(observation, goals, availableCommands, memory);

          // Check again after brain.decide() completes
          if (token.isCancelled) {
            throw new Error('Decision cancelled');
          }

          return decision;
        },
        tick,
        { matchId: this.match.matchId, agents: state.agents.length }
      );

      if (result.success && result.decision) {
        const commands = BrainAdapter.brainDecisionToCommands(result.decision, 'primary-agent', tick);
        return commands;
      }

      // Pipeline failed - record error and return empty
      if (result.error) {
        this.brainLifecycle.recordError(result.error);

        this.logger.warn('Brain decision pipeline failed', {
          tick,
          attempts: result.attemptNumber,
          timeout: result.timeoutOccurred,
          cancelled: result.wasCancelled,
          error: result.error.message,
        });
      }

      return [];
    }

    // Fall back to callback if no Brain injected
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

  isRunning(): boolean {
    return this.running;
  }

  getMetrics(): LoopMetrics {
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
