import { WorldState, Command } from '@ai-commander/domain';
import { Match } from './match.js';
import { Logger } from '../config/logger.js';
export interface LoopConfig {
    tickDurationMs: number;
    maxIterations?: number;
    observeTimeoutMs?: number;
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
export declare class MatchLoop {
    private match;
    private logger;
    private config;
    private callbacks;
    private running;
    private loopInterval;
    private iterationCount;
    private observeLatencies;
    private decideLatencies;
    private executeLatencies;
    constructor(match: Match, config: LoopConfig, callbacks: LoopCallbacks, logger: Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    private tick;
    private observe;
    private decide;
    private execute;
    isRunning(): boolean;
    getMetrics(): LoopMetrics;
}
//# sourceMappingURL=match-loop.d.ts.map