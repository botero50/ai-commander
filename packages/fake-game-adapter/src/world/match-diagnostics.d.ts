import type { FakeWorldSnapshot } from './fake-world-state.js';
/**
 * Diagnostic analysis for match failures and performance
 */
export interface FailureAnalysis {
    readonly failureReason: string;
    readonly failureTick: number;
    readonly bottleneck: string;
    readonly suggestions: ReadonlyArray<string>;
    readonly severity: 'critical' | 'major' | 'minor';
}
export interface MatchAnalysis {
    readonly gameWon: boolean;
    readonly gameLost: boolean;
    readonly totalTicks: number;
    readonly totalCommands: number;
    readonly resourceEfficiency: number;
    readonly workerEfficiency: number;
    readonly militaryEfficiency: number;
    readonly combatEfficiency: number;
    readonly failure?: FailureAnalysis;
}
/**
 * Analyze a match for failures and performance
 */
export declare function analyzeMatch(world: FakeWorldSnapshot): MatchAnalysis;
/**
 * Generate human-readable diagnostic report
 */
export declare function generateDiagnosticReport(world: FakeWorldSnapshot): string;
//# sourceMappingURL=match-diagnostics.d.ts.map