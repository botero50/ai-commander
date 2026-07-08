/**
 * Decision Overlay
 *
 * Captures and streams AI decisions in real-time for live visualization.
 * - Records each brain decision with reasoning and commands
 * - Timestamp each decision for replay/analysis
 * - Stream decisions to subscribers (UI, logging, replay)
 */
/**
 * Single decision event captured during match
 */
export interface DecisionEvent {
    readonly tick: number;
    readonly timestamp: number;
    readonly player: 'player1' | 'player2';
    readonly brainName: string;
    readonly reasoning?: string;
    readonly commands: readonly string[];
    readonly commandCount: number;
    readonly durationMs: number;
}
/**
 * Callback for decision subscribers
 */
export type DecisionSubscriber = (event: DecisionEvent) => void | Promise<void>;
/**
 * Real-time decision overlay and telemetry
 */
export declare class DecisionOverlay {
    private decisions;
    private subscribers;
    private maxDecisions;
    /**
     * Record a brain decision
     */
    recordDecision(tick: number, player: 'player1' | 'player2', brainName: string, reasoning: string | undefined, commands: readonly string[], durationMs: number): void;
    /**
     * Subscribe to decision events in real-time
     */
    subscribe(subscriber: DecisionSubscriber): () => void;
    /**
     * Get all recorded decisions (for replay)
     */
    getDecisions(filter?: {
        readonly tick?: number;
        readonly player?: 'player1' | 'player2';
        readonly brainName?: string;
    }): readonly DecisionEvent[];
    /**
     * Get the last N decisions (for UI display)
     */
    getLatestDecisions(count?: number): readonly DecisionEvent[];
    /**
     * Get stats about recorded decisions
     */
    getStats(): {
        readonly totalDecisions: number;
        readonly player1Decisions: number;
        readonly player2Decisions: number;
        readonly averageCommandsPerDecision: number;
        readonly latestTick: number | null;
    };
    /**
     * Clear all recorded decisions (for new match)
     */
    clear(): void;
}
//# sourceMappingURL=decision-overlay.d.ts.map