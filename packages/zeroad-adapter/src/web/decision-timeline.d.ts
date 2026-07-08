/**
 * Decision Timeline
 *
 * Format and display decision history with observation → reasoning → command flow.
 * - Map decisions to timeline frames
 * - Extract observation snapshots
 * - Format reasoning and commands for display
 */
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';
/**
 * Observation data at a tick
 */
export interface ObservationData {
    readonly tick: number;
    readonly unitCount: number;
    readonly buildingCount: number;
    readonly playerCount: number;
    readonly resourcesPerPlayer: Array<Record<string, number>>;
}
/**
 * Formatted command in a decision
 */
export interface FormattedCommand {
    readonly id: string;
    readonly action: string;
    readonly target?: string;
    readonly parameters?: Record<string, unknown>;
}
/**
 * Formatted decision timeline entry
 */
export interface DecisionTimelineEntry {
    readonly tick: number;
    readonly timestamp: number;
    readonly player: 'Player 1' | 'Player 2';
    readonly brain: string;
    readonly observation: ObservationData;
    readonly reasoning: string;
    readonly commands: readonly FormattedCommand[];
    readonly duration: number;
    readonly commandCount: number;
}
/**
 * Decision timeline manager
 */
export declare class DecisionTimeline {
    private entries;
    /**
     * Add decision to timeline
     */
    addDecision(decision: DecisionEvent, observation: TimelineSnapshot): void;
    /**
     * Parse command list from decision
     */
    private parseCommandList;
    /**
     * Get decision at tick
     */
    getDecision(tick: number): DecisionTimelineEntry | null;
    /**
     * Get decisions in range
     */
    getDecisionsInRange(startTick: number, endTick: number): DecisionTimelineEntry[];
    /**
     * Get all decisions
     */
    getAllDecisions(): DecisionTimelineEntry[];
    /**
     * Get decisions by player
     */
    getDecisionsByPlayer(player: 'Player 1' | 'Player 2'): DecisionTimelineEntry[];
    /**
     * Get decisions by brain
     */
    getDecisionsByBrain(brainName: string): DecisionTimelineEntry[];
    /**
     * Search decisions by reasoning keyword
     */
    searchByReasoning(keyword: string): DecisionTimelineEntry[];
    /**
     * Get decision statistics
     */
    getStatistics(): {
        readonly totalDecisions: number;
        readonly averageDuration: number;
        readonly totalCommands: number;
        readonly averageCommandsPerDecision: number;
    };
    /**
     * Get ticks with decisions
     */
    getTicksWithDecisions(): number[];
}
//# sourceMappingURL=decision-timeline.d.ts.map