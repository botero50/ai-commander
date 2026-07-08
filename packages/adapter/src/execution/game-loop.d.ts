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
export declare class GameLoop {
    private session;
    private logger;
    private config;
    private callbacks;
    private running;
    private loopInterval;
    private iterationCount;
    private observeLatencies;
    private decideLatencies;
    private executeLatencies;
    constructor(session: GameSession, config: GameLoopConfig, callbacks: GameLoopCallbacks, logger: Logger);
    /**
     * Start the game loop.
     * Initializes tick-based execution.
     */
    start(): Promise<void>;
    /**
     * Stop the game loop.
     * Cleans up resources and records final metrics.
     */
    stop(): Promise<void>;
    /**
     * Single iteration of the game loop.
     * Implements: Observe → (Plan) → Decide → Execute
     */
    private tick;
    /**
     * Observe phase: Get current world state.
     * Delegates to GameSession.observationProvider (adapter responsibility).
     */
    private observe;
    /**
     * Decide phase: Determine next commands.
     * Uses callback pattern (adapter can inject decision logic).
     * Framework future: can replace with framework DecisionPipeline.
     */
    private decide;
    /**
     * Execute phase: Run commands in game.
     * Delegates to adapter callback (game-specific execution).
     */
    private execute;
    /**
     * Check if loop is currently running.
     */
    isRunning(): boolean;
    /**
     * Get execution metrics.
     * Useful for performance monitoring and profiling.
     */
    getMetrics(): GameLoopMetrics;
}
export {};
//# sourceMappingURL=game-loop.d.ts.map