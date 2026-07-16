/**
 * AI Loop Orchestrator
 *
 * Connects the complete loop:
 * Observe → WorldState → Brain Decision → Execute → Observe
 *
 * Measures:
 * - Latency per tick
 * - Observation quality
 * - Command execution success
 * - Brain responsiveness
 */
import { Logger } from '../config/logger.js';
import { RLHTTPClient, GameCommand } from './http-client.js';
import { ObservationReceiver } from './observation-receiver.js';
import { CommandExecutor } from './command-executor.js';
import { WorldStateMapper } from './world-state-mapper.js';
import type { WorldState } from '@ai-commander/domain';
export interface BrainDecision {
    playerID: number;
    commands: GameCommand[];
    reasoning?: string;
    timestamp: Date;
}
export interface LoopMetrics {
    tick: number;
    timestamp: Date;
    observationTime: number;
    mappingTime: number;
    brainTime: number;
    executionTime: number;
    totalTime: number;
    observationValid: boolean;
    commandsExecuted: number;
    commandsSuccessful: number;
}
export interface LoopState {
    running: boolean;
    currentTick: number;
    totalTicks: number;
    metrics: LoopMetrics[];
    startTime: Date;
}
/**
 * Brain interface - implement this to create custom AI
 */
export interface AIBrain {
    /**
     * Make decisions based on world state
     */
    decide(worldState: WorldState): Promise<BrainDecision>;
    /**
     * Optional initialization
     */
    initialize?(): Promise<void>;
    /**
     * Optional cleanup
     */
    shutdown?(): Promise<void>;
}
/**
 * Simple test brain that makes random moves
 */
export declare class DummyBrain implements AIBrain {
    private logger;
    constructor(logger: Logger);
    decide(worldState: WorldState): Promise<BrainDecision>;
}
export declare class AILoopOrchestrator {
    private client;
    private observationReceiver;
    private commandExecutor;
    private worldStateMapper;
    private brain;
    private logger;
    private state;
    constructor(client: RLHTTPClient, observationReceiver: ObservationReceiver, commandExecutor: CommandExecutor, worldStateMapper: WorldStateMapper, brain: AIBrain, logger: Logger);
    /**
     * Run the complete AI loop for N ticks
     *
     * Non-blocking mode: While brain decides, advance game with empty ticks.
     * Only decision ticks count toward the N ticks limit.
     */
    runLoop(ticks: number): Promise<LoopState>;
    /**
     * Execute a decision that has finished
     */
    private executeDecision;
    /**
     * Run a single tick of the loop
     */
    private runTick;
    /**
     * Get average latency across all ticks
     */
    private getAverageLatency;
    /**
     * Generate performance report
     */
    generateReport(): string;
}
//# sourceMappingURL=ai-loop-orchestrator.d.ts.map