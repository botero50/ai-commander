import type { WorldState, Tick } from '@ai-commander/domain';
import type { EventBus, ServiceRegistry, Clock, Scheduler } from '@ai-commander/core';
import { World } from '@ai-commander/ecs';
import type { Pipeline } from './types/execution-pipeline.js';
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
export declare class Engine {
    private readonly pipeline;
    private readonly config;
    private readonly eventBus;
    private readonly serviceRegistry;
    private readonly clock;
    private readonly scheduler;
    private readonly world;
    private currentTick;
    private worldState;
    private engineState;
    constructor(pipeline: Pipeline, worldState: WorldState, config: EngineConfig, serviceRegistry: ServiceRegistry, eventBus?: EventBus, clock?: Clock, scheduler?: Scheduler);
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    tick(): Promise<TickResult>;
    getState(): EngineState;
    getCurrentTick(): Tick;
    getCurrentWorld(): WorldState;
    isRunning(): boolean;
    isPaused(): boolean;
    getEventBus(): EventBus;
    getServiceRegistry(): ServiceRegistry;
    getClock(): Clock;
    getScheduler(): Scheduler;
    getWorld(): World;
}
//# sourceMappingURL=engine.d.ts.map