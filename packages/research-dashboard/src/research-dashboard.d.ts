/**
 * Research Dashboard — Web UI for tournament analysis
 *
 * Provides:
 * 1. Model comparison tables
 * 2. Tournament results visualization
 * 3. ELO history charts
 * 4. Cost analysis (USD per token)
 * 5. Win rate distributions
 * 6. Interactive filtering and sorting
 */
import type { TournamentResult } from '@ai-commander/tournament-engine';
import type { HistoricalSnapshot } from '@ai-commander/rating-system';
export interface DashboardData {
    readonly tournaments: ReadonlyArray<TournamentResult>;
    readonly ratingHistory: ReadonlyArray<HistoricalSnapshot>;
    readonly selectedModels: ReadonlyArray<string>;
}
/**
 * ResearchDashboard: Generate dashboard HTML
 */
export declare class ResearchDashboard {
    static generateHTML(data: DashboardData): string;
    private static generateModelComparisonTable;
    private static generateCostChart;
    private static generateEloChart;
    private static generateWinRateChart;
}
//# sourceMappingURL=research-dashboard.d.ts.map