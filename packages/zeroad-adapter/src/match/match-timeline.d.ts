/**
 * Match Timeline
 *
 * Captures temporal events during match execution for visualization and analysis.
 * - Records game state snapshots at regular intervals
 * - Correlates state changes with AI decisions
 * - Enables replay of match progression
 * - Provides timeline statistics
 */
import { DecisionEvent } from './decision-overlay.js';
/**
 * Single state snapshot at a point in time
 */
export interface TimelineSnapshot {
    readonly tick: number;
    readonly timestamp: number;
    readonly gameState: {
        readonly unitCount: number;
        readonly buildingCount: number;
        readonly playerCount: number;
        readonly resourcesPerPlayer: readonly Record<string, number>[];
    };
    readonly decisions: readonly DecisionEvent[];
}
/**
 * Timeline event (state change or decision)
 */
export interface TimelineEvent {
    readonly tick: number;
    readonly timestamp: number;
    readonly type: 'snapshot' | 'decision' | 'error' | 'milestone';
    readonly data: unknown;
}
/**
 * Match timeline builder and analyzer
 */
export declare class MatchTimeline {
    private snapshots;
    private events;
    private maxSnapshots;
    private startTimestamp;
    /**
     * Record a game state snapshot
     */
    recordSnapshot(tick: number, unitCount: number, buildingCount: number, playerCount: number, resourcesPerPlayer: Record<string, number>[]): void;
    /**
     * Correlate a decision with the current timeline state
     */
    addDecisionToTimeline(decision: DecisionEvent): void;
    /**
     * Record a significant game event (milestone)
     */
    recordMilestone(tick: number, description: string, data?: unknown): void;
    /**
     * Record an error during match
     */
    recordError(tick: number, error: Error | string): void;
    /**
     * Get all snapshots in order
     */
    getSnapshots(): readonly TimelineSnapshot[];
    /**
     * Get snapshots within a tick range
     */
    getSnapshotsInRange(startTick: number, endTick: number): readonly TimelineSnapshot[];
    /**
     * Get all timeline events in order
     */
    getEvents(): readonly TimelineEvent[];
    /**
     * Get events of a specific type
     */
    getEventsByType(type: TimelineEvent['type']): readonly TimelineEvent[];
    /**
     * Get events within a tick range
     */
    getEventsInRange(startTick: number, endTick: number): readonly TimelineEvent[];
    /**
     * Analyze game state progression
     */
    analyzeProgression(): {
        readonly totalTicks: number;
        readonly totalSnapshots: number;
        readonly totalEvents: number;
        readonly unitCountTrend: 'increasing' | 'decreasing' | 'stable';
        readonly buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
        readonly firstSnapshot: TimelineSnapshot | null;
        readonly lastSnapshot: TimelineSnapshot | null;
        readonly unitCountChange: number;
        readonly buildingCountChange: number;
    };
    /**
     * Find decisions that led to significant state changes
     */
    findImpactfulDecisions(threshold?: number): readonly DecisionEvent[];
    /**
     * Clear timeline for new match
     */
    clear(): void;
    /**
     * Get total duration since timeline started
     */
    getDuration(): number;
}
//# sourceMappingURL=match-timeline.d.ts.map