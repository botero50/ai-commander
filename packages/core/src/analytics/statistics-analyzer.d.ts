/**
 * Match Statistics Analyzer
 * Orchestrates statistical analysis via specialized metric and trend analyzers
 */
import { GameState } from '../state/state-types.js';
export interface EconomyMetrics {
    foodIncome: number;
    woodIncome: number;
    stoneIncome: number;
    metalIncome: number;
    totalIncome: number;
    resourceSpent: number;
    economyScore: number;
}
export interface MilitaryMetrics {
    unitCount: number;
    militaryValue: number;
    casualtyRate: number;
    avgUnitHealth: number;
    militaryScore: number;
}
export interface TechMetrics {
    techsUnlocked: number;
    techProgressRate: number;
    avgTechTiming: number;
    techTree: string[];
}
export interface PlayerActivity {
    expansions: number;
    attacks: number;
    defenses: number;
    buildEvents: number;
    activityScore: number;
}
export interface GamePaceMetrics {
    phase: 'early' | 'mid' | 'late';
    paceScore: number;
    gameTime: number;
    eventDensity: number;
}
export interface StatisticsSnapshot {
    tick: number;
    timestamp: number;
    playerId: number;
    economy: EconomyMetrics;
    military: MilitaryMetrics;
    tech: TechMetrics;
    activity: PlayerActivity;
    pace: GamePaceMetrics;
}
export interface MatchStatistics {
    matchDuration: number;
    totalSnapshots: number;
    playerStats: Record<number, StatisticsSnapshot[]>;
    trends: Record<number, {
        economy: string;
        military: string;
        tech: string;
    }>;
    comparativeMetrics: {
        economyDifference: number;
        militaryDifference: number;
        activityDifference: number;
    };
}
/**
 * Analyzes match statistics and trends
 */
export declare class StatisticsAnalyzer {
    private snapshots;
    private previousState;
    private unitCounts;
    private techHistory;
    private eventCounts;
    private metricsCalculator;
    private trendAnalyzer;
    private unitValueMap;
    constructor();
    /**
     * Update statistics with new game state
     */
    update(state: GameState): void;
    /**
     * Create statistics snapshot for a player
     */
    private createSnapshot;
    /**
     * Get all statistics
     */
    getStatistics(): MatchStatistics;
    /**
     * Get player statistics
     */
    getPlayerStatistics(playerId: number): StatisticsSnapshot[];
    /**
     * Get trend analysis
     */
    getTrendAnalysis(playerId: number): string;
    /**
     * Helper: extract tech names from buildings
     */
    private extractTechs;
    /**
     * Reset analyzer
     */
    reset(): void;
}
//# sourceMappingURL=statistics-analyzer.d.ts.map