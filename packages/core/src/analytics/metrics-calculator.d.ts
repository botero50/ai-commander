/**
 * Metrics Calculator
 *
 * Stateless metric computation for economy, military, tech, activity, and pace.
 * Separates calculation logic from state management.
 */
import { GameState, Player } from '../state/state-types.js';
import { EconomyMetrics, MilitaryMetrics, TechMetrics, PlayerActivity, GamePaceMetrics } from './statistics-analyzer.js';
export declare class MetricsCalculator {
    /**
     * Calculate economy metrics from game state
     */
    calculateEconomy(player: Player, state: GameState): EconomyMetrics;
    /**
     * Calculate military metrics from game state
     */
    calculateMilitary(playerId: number, state: GameState, unitValueMap: Record<string, number>): MilitaryMetrics;
    /**
     * Calculate technology metrics
     */
    calculateTech(techsUnlocked: number, gameTime: number): TechMetrics;
    /**
     * Calculate activity metrics
     */
    calculateActivity(playerId: number, state: GameState): PlayerActivity;
    /**
     * Calculate game pace metrics
     */
    calculateGamePace(gameTime: number, unitCount: number, buildingCount: number): GamePaceMetrics;
    /**
     * Check if unit type is military
     */
    private isMilitaryUnit;
}
//# sourceMappingURL=metrics-calculator.d.ts.map