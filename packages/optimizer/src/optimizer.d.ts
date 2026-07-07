/**
 * Performance Optimizer — Caching, parallelization, memoization
 *
 * Techniques:
 * 1. Decision cache: memoize identical observations
 * 2. Parallel matches: run multiple matches concurrently
 * 3. Batch API calls: group requests to providers
 * 4. LRU cache with TTL for memory efficiency
 */
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from '@ai-commander/brain';
import type { MatchReplay } from '@ai-commander/match-runner';
export interface DecisionCacheStats {
    readonly hits: number;
    readonly misses: number;
    readonly hitRate: number;
    readonly entriesStored: number;
}
/**
 * CachedBrain: Wrap any brain with decision caching
 *
 * Memoizes decisions based on observation hash + brain name.
 * Avoids redundant LLM calls for identical world states.
 */
export declare class CachedBrain implements Brain {
    private brain;
    readonly name: string;
    readonly version: string;
    private cache;
    private hits;
    private misses;
    private readonly maxCacheSize;
    private readonly ttlMs;
    constructor(brain: Brain, maxCacheSize?: number, ttlMs?: number);
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
    getMetrics(): any;
    getCacheStats(): DecisionCacheStats;
    private getCacheKey;
}
/**
 * ParallelMatchRunner: Execute multiple matches concurrently
 *
 * Limits concurrency to avoid overwhelming API quota.
 */
export declare class ParallelMatchRunner {
    static runBatch(matches: Array<{
        redBrain: Brain;
        blueBrain: Brain;
        mapSeed: number;
        maxTicks: number;
        gameAdapterId: string;
    }>, concurrency?: number): Promise<MatchReplay[]>;
}
/**
 * BatchOptimizer: Collect and batch API calls
 *
 * Group multiple decision requests and send as batch
 * for models that support batch processing.
 */
export declare class BatchOptimizer {
    private queue;
    private batchSize;
    private flushIntervalMs;
    private timer;
    constructor(batchSize?: number, flushIntervalMs?: number);
    decide(brain: Brain, observation: WorldObservation, goals: GoalOption[], commands: CommandOption[], memory: ExecutionMemory): Promise<BrainDecision>;
    private flush;
    flush_all(): Promise<void>;
}
//# sourceMappingURL=optimizer.d.ts.map