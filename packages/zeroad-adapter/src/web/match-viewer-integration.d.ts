/**
 * Match Viewer Integration
 *
 * Connects live match execution to web viewer for real-time visualization.
 * - Routes decisions to viewer
 * - Routes state observations to viewer
 * - Synchronizes timeline data
 * - Handles match completion
 */
import { MatchViewer } from './match-viewer.js';
import type { LiveMatchResult } from '../match/live-match-runner.js';
import type { DecisionSubscriber } from '../match/decision-overlay.js';
import type { ObserverCallback } from '../match/match-observer.js';
/**
 * Create viewer callbacks for live match integration
 */
export declare function createViewerIntegration(viewer: MatchViewer): {
    readonly onDecision: DecisionSubscriber;
    readonly onObserve: ObserverCallback;
};
/**
 * Bind match result to viewer for completion
 */
export declare function bindMatchResultToViewer(viewer: MatchViewer, result: LiveMatchResult): void;
/**
 * Create a view-ready snapshot from match result
 */
export declare function matchResultToViewerState(matchId: string, result: LiveMatchResult): {
    matchId: string;
    status: 'completed';
    currentTick: number;
    totalTicks: number;
    duration: number;
    winner: string | undefined;
    brain1: string;
    brain2: string;
    player1Stats: {
        commands: number;
        errors: number;
    };
    player2Stats: {
        commands: number;
        errors: number;
    };
    decisionCount: number;
    snapshotCount: number;
    unitCountTrend: 'increasing' | 'decreasing' | 'stable';
    buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
};
//# sourceMappingURL=match-viewer-integration.d.ts.map