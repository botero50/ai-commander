/**
 * Single Match Runner — Run one match between two providers
 *
 * Orchestrates:
 * 1. Initialize two brains from provider config
 * 2. Launch OpenRA game
 * 3. Run match to completion
 * 4. Record result with stats
 * 5. Validate fair play
 */
import type { BrainManagerConfig } from "@ai-commander/brain";
import type { MatchResult } from "./match-orchestrator";
export interface SingleMatchConfig {
    readonly provider1: BrainManagerConfig;
    readonly provider2: BrainManagerConfig;
    readonly player1Name?: string;
    readonly player2Name?: string;
    readonly maxTicks?: number;
}
export interface SingleMatchResult {
    readonly match: MatchResult;
    readonly provider1Name: string;
    readonly provider2Name: string;
    readonly winner: "provider1" | "provider2" | "draw";
    readonly ticks: number;
    readonly durationMs: number;
    readonly validationPassed: boolean;
    readonly stats: {
        readonly provider1Resources: number;
        readonly provider2Resources: number;
        readonly provider1Units: number;
        readonly provider2Units: number;
        readonly provider1Buildings: number;
        readonly provider2Buildings: number;
    };
}
/**
 * SingleMatchRunner: Run one match between two providers
 *
 * Example:
 * ```
 * const result = await SingleMatchRunner.runMatch({
 *   provider1: { provider: 'claude', claude: { apiKey, model: 'claude-3-opus-20240229' } },
 *   provider2: { provider: 'openai', openai: { apiKey, model: 'gpt-4' } },
 * });
 * ```
 */
export declare class SingleMatchRunner {
    /**
     * Run a single match between two providers.
     */
    static runMatch(config: SingleMatchConfig): Promise<SingleMatchResult>;
    /**
     * Generate human-readable report.
     */
    static generateReport(result: SingleMatchResult): string;
}
//# sourceMappingURL=single-match-runner.d.ts.map