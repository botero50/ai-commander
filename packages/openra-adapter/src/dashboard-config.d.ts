/**
 * Dashboard Config — Web UI for tournament results
 *
 * Provides:
 * 1. Real-time tournament progress
 * 2. Live standings and ratings
 * 3. Match history and replays
 * 4. Cost analytics dashboard
 * 5. Strategy comparison charts
 */
import type { TournamentResult } from "./tournament-engine";
import type { TournamentCostAnalysis } from "./cost-analyzer";
import type { Rating } from "./rating-engine";
import type { Replay } from "./replay-engine";
export interface DashboardData {
    readonly tournament: TournamentResult;
    readonly ratings: Map<string, Rating>;
    readonly costAnalysis: TournamentCostAnalysis;
    readonly replays: Map<string, Replay>;
    readonly lastUpdated: number;
}
export interface DashboardWidget {
    readonly id: string;
    readonly title: string;
    readonly type: "standings" | "ratings" | "cost" | "strategy" | "replays";
    readonly data: unknown;
}
/**
 * DashboardConfig: Organize data for web display
 *
 * Web server (separate) would:
 * 1. Run tournament
 * 2. Update this dashboard data
 * 3. Serve via HTTP/WebSocket
 * 4. React frontend displays widgets
 */
export declare class DashboardConfig {
    /**
     * Create dashboard from tournament results.
     */
    static createDashboard(tournament: TournamentResult, ratings: Map<string, Rating>, costAnalysis: TournamentCostAnalysis, replays: Map<string, Replay>): DashboardData;
    /**
     * Generate standings widget.
     */
    static standingsWidget(tournament: TournamentResult): DashboardWidget;
    /**
     * Generate ratings widget.
     */
    static ratingsWidget(ratings: Map<string, Rating>): DashboardWidget;
    /**
     * Generate cost analytics widget.
     */
    static costWidget(costAnalysis: TournamentCostAnalysis): DashboardWidget;
    /**
     * Generate strategy comparison widget.
     */
    static strategyWidget(tournament: TournamentResult): DashboardWidget;
    /**
     * Generate replays widget.
     */
    static replaysWidget(replays: Map<string, Replay>): DashboardWidget;
    /**
     * Get all widgets for a dashboard.
     */
    static getWidgets(dashboard: DashboardData): DashboardWidget[];
    /**
     * Export dashboard as JSON for web service.
     */
    static exportJSON(dashboard: DashboardData): string;
    /**
     * Generate HTML dashboard (simple static version).
     */
    static generateHTML(dashboard: DashboardData): string;
}
//# sourceMappingURL=dashboard-config.d.ts.map