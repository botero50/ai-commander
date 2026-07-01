import type { WorldState, Tick } from '@ai-commander/domain';
import { createTick } from '@ai-commander/domain';
import type { EventBus, ServiceRegistry, Clock, Scheduler } from '@ai-commander/core';
import { createGameClock, createEventBus, createScheduler } from '@ai-commander/core';
import { World } from '@ai-commander/ecs';
import type { Pipeline } from './types/execution-pipeline.js';
import type { ExecutionContext } from './types/execution-step.js';
import { EngineState } from './types/engine-state.js';
import type { EngineConfig } from './types/engine-config.js';
import type { TickResult } from './types/tick-result.js';

/**
 * Engine orchestrates tick-based execution using a supplied pipeline.
 *
 * Owns:
 * - Lifecycle (start, pause, resume, stop)
 * - Tick progression
 * - Clock management
 * - Scheduler integration
 * - Generic event publication
 *
 * Does NOT own:
 * - Pipeline composition (higher layers build pipelines)
 * - Pipeline semantics (higher layers define what steps mean)
 * - AI logic, planning, perception, decisions, commands
 * - Game-specific concepts
 */
export class Engine {
  private readonly pipeline: Pipeline;
  private readonly config: EngineConfig;
  private readonly eventBus: EventBus;
  private readonly serviceRegistry: ServiceRegistry;
  private readonly clock: Clock;
  private readonly scheduler: Scheduler;
  private readonly world: World;

  private currentTick: Tick;
  private worldState: WorldState;
  private engineState: EngineState = EngineState.Idle;

  constructor(
    pipeline: Pipeline,
    worldState: WorldState,
    config: EngineConfig,
    serviceRegistry: ServiceRegistry,
    eventBus?: EventBus,
    clock?: Clock,
    scheduler?: Scheduler
  ) {
    this.pipeline = pipeline;
    this.worldState = worldState;
    this.config = config;
    this.serviceRegistry = serviceRegistry;
    this.eventBus = eventBus || createEventBus();
    this.clock = clock || createGameClock(0);
    this.scheduler = scheduler || createScheduler(this.clock);
    this.currentTick = worldState.time.currentTick;
    this.world = new World();
  }

  async start(): Promise<void> {
    if (this.engineState !== EngineState.Idle) {
      throw new Error(
        `Cannot start engine in state ${this.engineState}. Only idle engines can be started.`
      );
    }

    this.engineState = EngineState.Running;

    try {
      await this.eventBus.publish('EngineStarted', {
        tick: this.currentTick.number,
      });
    } catch {
      // Engine still started even if event publishing fails
    }
  }

  async pause(): Promise<void> {
    if (this.engineState !== EngineState.Running) {
      throw new Error(
        `Cannot pause engine in state ${this.engineState}. Only running engines can be paused.`
      );
    }

    this.engineState = EngineState.Paused;

    try {
      await this.eventBus.publish('EnginePaused', {
        tick: this.currentTick.number,
      });
    } catch {
      // Engine still paused even if event publishing fails
    }
  }

  async resume(): Promise<void> {
    if (this.engineState !== EngineState.Paused) {
      throw new Error(
        `Cannot resume engine in state ${this.engineState}. Only paused engines can be resumed.`
      );
    }

    this.engineState = EngineState.Running;

    try {
      await this.eventBus.publish('EngineResumed', {
        tick: this.currentTick.number,
      });
    } catch {
      // Engine still resumed even if event publishing fails
    }
  }

  async stop(): Promise<void> {
    if (this.engineState === EngineState.Stopped) {
      return;
    }

    this.engineState = EngineState.Stopped;

    try {
      await this.eventBus.publish('EngineStopped', {
        tick: this.currentTick.number,
      });
    } catch {
      // Engine still stopped even if event publishing fails
    }
  }

  async tick(): Promise<TickResult> {
    const errors: string[] = [];

    if (this.engineState !== EngineState.Running) {
      return {
        tickNumber: this.currentTick.number,
        engineState: this.engineState,
        pipelineResult: {
          stepsExecuted: [],
          worldState: this.worldState,
          eventsPublished: 0,
          errors: [`Cannot execute tick in state ${this.engineState}. Engine must be running.`],
        },
        maxTicksReached: false,
        errors: [`Cannot execute tick in state ${this.engineState}. Engine must be running.`],
      };
    }

    try {
      // Advance clock
      this.clock.advance(1);

      // Create new tick
      this.currentTick = createTick(this.currentTick.number + 1);

      // Publish tick started
      try {
        await this.eventBus.publish('TickStarted', {
          tickNumber: this.currentTick.number,
        });
      } catch (error) {
        errors.push(
          `Failed to publish TickStarted: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Execute pipeline
      const context: ExecutionContext = {
        eventBus: this.eventBus,
        scheduler: this.scheduler,
        clock: this.clock,
        serviceRegistry: this.serviceRegistry,
        tick: this.currentTick,
      };
      const pipelineResult = await this.pipeline.execute(this.worldState, context);

      // Update world state
      this.worldState = pipelineResult.worldState;

      // Publish tick completed
      try {
        await this.eventBus.publish('TickCompleted', {
          tickNumber: this.currentTick.number,
        });
      } catch (error) {
        errors.push(
          `Failed to publish TickCompleted: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Check max ticks
      const maxTicksReached =
        this.config.maxTicks !== undefined && this.currentTick.number >= this.config.maxTicks;
      if (maxTicksReached) {
        await this.stop();
      }

      return {
        tickNumber: this.currentTick.number,
        engineState: this.engineState,
        pipelineResult,
        maxTicksReached,
        errors,
      };
    } catch (error) {
      errors.push(
        `Tick execution failed: ${error instanceof Error ? error.message : String(error)}`
      );

      return {
        tickNumber: this.currentTick.number,
        engineState: this.engineState,
        pipelineResult: {
          stepsExecuted: [],
          worldState: this.worldState,
          eventsPublished: 0,
          errors,
        },
        maxTicksReached: false,
        errors,
      };
    }
  }

  getState(): EngineState {
    return this.engineState;
  }

  getCurrentTick(): Tick {
    return this.currentTick;
  }

  getCurrentWorld(): WorldState {
    return this.worldState;
  }

  isRunning(): boolean {
    return this.engineState === EngineState.Running;
  }

  isPaused(): boolean {
    return this.engineState === EngineState.Paused;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getServiceRegistry(): ServiceRegistry {
    return this.serviceRegistry;
  }

  getClock(): Clock {
    return this.clock;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getWorld(): World {
    return this.world;
  }
}
