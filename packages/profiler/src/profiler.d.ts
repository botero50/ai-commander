/**
 * Profiler — Log and profile decision timing, token usage, costs
 *
 * Provides:
 * 1. Decision timing (input → output latency)
 * 2. Token breakdown (input vs output)
 * 3. Cost breakdown (prompt vs completion)
 * 4. Batch statistics
 * 5. Export to JSON/CSV for analysis
 */
export interface DecisionMetrics {
    readonly timestamp: number;
    readonly brainName: string;
    readonly tick: number;
    readonly durationMs: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
    readonly totalTokens: number;
    readonly inputCost: number;
    readonly outputCost: number;
    readonly totalCost: number;
    readonly model: string;
    readonly temperature: number;
    readonly confidence: number;
}
export interface ProfileSummary {
    readonly brainName: string;
    readonly totalDecisions: number;
    readonly avgDurationMs: number;
    readonly minDurationMs: number;
    readonly maxDurationMs: number;
    readonly p95DurationMs: number;
    readonly totalInputTokens: number;
    readonly totalOutputTokens: number;
    readonly avgTokensPerDecision: number;
    readonly totalCost: number;
    readonly avgCostPerDecision: number;
    readonly tokenBreakdown: {
        readonly input: number;
        readonly output: number;
    };
    readonly costBreakdown: {
        readonly input: number;
        readonly output: number;
    };
}
/**
 * Profiler: Collect and analyze performance metrics
 */
export declare class Profiler {
    private metrics;
    recordDecision(metrics: DecisionMetrics): void;
    getMetrics(): ReadonlyArray<DecisionMetrics>;
    getSummary(brainName?: string): ProfileSummary;
    getComparison(brainNames: ReadonlyArray<string>): Array<ProfileSummary>;
    exportJSON(): string;
    exportCSV(): string;
    generateReport(): string;
}
//# sourceMappingURL=profiler.d.ts.map