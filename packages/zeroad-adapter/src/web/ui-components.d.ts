/**
 * UI Components
 *
 * Reusable components and rendering logic for web match viewer.
 * Framework-agnostic component definitions with TypeScript interfaces.
 * Ready for React, Vue, or any other UI framework.
 */
import type { MatchViewerState } from './match-viewer.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
/**
 * Formatted match status display
 */
export interface FormattedMatchStatus {
    readonly matchId: string;
    readonly status: string;
    readonly brain1: string;
    readonly brain2: string;
    readonly currentTick: number;
    readonly totalTicks: number;
    readonly progress: number;
    readonly duration: string;
    readonly winner?: string;
    readonly isActive: boolean;
}
/**
 * Formatted decision display
 */
export interface FormattedDecision {
    readonly tick: number;
    readonly player: 'Player 1' | 'Player 2';
    readonly brain: string;
    readonly reasoning: string;
    readonly commandCount: number;
    readonly commands: string;
    readonly duration: string;
}
/**
 * Formatted player statistics
 */
export interface FormattedPlayerStats {
    readonly name: string;
    readonly commands: number;
    readonly errors: number;
    readonly commandsPerTick: number;
    readonly errorRate: number;
}
/**
 * Format milliseconds to human-readable duration
 */
export declare function formatDuration(ms: number): string;
/**
 * Format match state for UI display
 */
export declare function formatMatchStatus(state: Partial<MatchViewerState>): FormattedMatchStatus;
/**
 * Format decision for UI display
 */
export declare function formatDecision(decision: DecisionEvent): FormattedDecision;
/**
 * Format player statistics for UI display
 */
export declare function formatPlayerStats(name: string, commands: number, errors: number, totalTicks: number): FormattedPlayerStats;
/**
 * Color for status indicator
 */
export declare function getStatusColor(status: string): string;
/**
 * Color for trend indicator
 */
export declare function getTrendColor(trend: 'increasing' | 'decreasing' | 'stable'): string;
/**
 * Color for player
 */
export declare function getPlayerColor(player: 'player1' | 'player2'): string;
/**
 * Truncate long text
 */
export declare function truncateText(text: string, maxLength: number): string;
/**
 * Format large numbers with separators
 */
export declare function formatNumber(num: number): string;
/**
 * Get progress bar width percentage
 */
export declare function getProgressWidth(current: number, total: number): number;
//# sourceMappingURL=ui-components.d.ts.map