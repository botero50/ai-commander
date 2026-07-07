import { type MatchAnalysis } from './match-diagnostics.js';
/**
 * LLM Model identifier for benchmarking
 */
export type LLMModel = 'opus' | 'sonnet' | 'haiku' | 'fable';
/**
 * Single match result with model and metrics
 */
export interface BenchmarkResult {
    readonly model: LLMModel;
    readonly matchId: string;
    readonly seed: number;
    readonly analysis: MatchAnalysis;
    readonly timestamp: number;
}
/**
 * Aggregated metrics for one model across multiple matches
 */
export interface ModelBenchmark {
    readonly model: LLMModel;
    readonly totalMatches: number;
    readonly winsCount: number;
    readonly winRate: number;
    readonly avgTicks: number;
    readonly avgCommandsExecuted: number;
    readonly avgResourceEfficiency: number;
    readonly avgCombatEfficiency: number;
    readonly avgTotalTicks: number;
}
/**
 * Complete benchmark suite comparing all models
 */
export interface BenchmarkSuite {
    readonly models: ReadonlyArray<LLMModel>;
    readonly totalMatches: number;
    readonly matchesPerModel: number;
    readonly benchmarks: ReadonlyMap<LLMModel, ModelBenchmark>;
    readonly results: ReadonlyArray<BenchmarkResult>;
    readonly timestamp: number;
    readonly summary: BenchmarkSummary;
}
/**
 * Summary comparison across all models
 */
export interface BenchmarkSummary {
    readonly bestWinRate: LLMModel;
    readonly bestResourceEfficiency: LLMModel;
    readonly bestCombatEfficiency: LLMModel;
    readonly fastestAverageTicks: LLMModel;
    readonly overallWinner: LLMModel;
    readonly scores: ReadonlyMap<LLMModel, number>;
}
/**
 * Record a single match benchmark result
 */
export declare function recordBenchmarkResult(model: LLMModel, matchId: string, seed: number, analysis: MatchAnalysis): BenchmarkResult;
/**
 * Aggregate results for a single model
 */
export declare function aggregateModelBenchmark(model: LLMModel, results: ReadonlyArray<BenchmarkResult>): ModelBenchmark;
/**
 * Compile benchmark suite from all results
 */
export declare function compileBenchmarkSuite(models: ReadonlyArray<LLMModel>, results: ReadonlyArray<BenchmarkResult>): BenchmarkSuite;
/**
 * Generate human-readable benchmark report
 */
export declare function generateBenchmarkReport(suite: BenchmarkSuite): string;
//# sourceMappingURL=benchmark.d.ts.map