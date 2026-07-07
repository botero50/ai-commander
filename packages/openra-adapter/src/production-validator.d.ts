/**
 * Production Validator — End-to-end system validation
 *
 * Validates:
 * 1. All providers initialize successfully
 * 2. Match orchestration works
 * 3. Tournament automation works
 * 4. Reports generate correctly
 * 5. Replays record correctly
 * 6. Cost calculations work
 * 7. Ratings calculate correctly
 */
import type { SingleMatchResult } from "./single-match-runner";
import type { TournamentResult } from "./tournament-engine";
export interface ProductionValidationResult {
    readonly passed: boolean;
    readonly checks: {
        readonly providersInitialize: boolean;
        readonly matchOrchestration: boolean;
        readonly tournamentAutomation: boolean;
        readonly reportGeneration: boolean;
        readonly replayRecording: boolean;
        readonly costCalculation: boolean;
        readonly ratingCalculation: boolean;
        readonly fairPlay: boolean;
    };
    readonly errors: string[];
    readonly performance: {
        readonly avgMatchTime: number;
        readonly totalTime: number;
    };
}
/**
 * ProductionValidator: Full end-to-end validation
 */
export declare class ProductionValidator {
    /**
     * Validate the entire system.
     */
    static validateSystem(): Promise<ProductionValidationResult>;
    /**
     * Validate a single match result.
     */
    static validateMatchResult(result: SingleMatchResult): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Validate a tournament result.
     */
    static validateTournamentResult(result: TournamentResult): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Generate validation report.
     */
    static generateReport(result: ProductionValidationResult): string;
    /**
     * System health check.
     */
    static healthCheck(): Promise<{
        status: "healthy" | "degraded" | "down";
        checks: Record<string, boolean>;
    }>;
}
//# sourceMappingURL=production-validator.d.ts.map