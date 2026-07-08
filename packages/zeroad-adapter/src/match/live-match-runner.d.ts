/**
 * Live Match Runner
 *
 * Orchestrates a visible 0 A.D. match with:
 * - Automatic game launch
 * - Window stays open during match
 * - Real-time AI decisions
 * - Match completion with results
 */
import { ZeroADAdapter } from '../adapter.js';
import { BrainInterface, MatchResult } from './simple-match.js';
import { DecisionOverlay, DecisionSubscriber } from './decision-overlay.js';
import { MatchTimeline } from './match-timeline.js';
import { MatchObserver, ObserverCallback } from './match-observer.js';
export interface LiveMatchConfig {
    readonly brain1: BrainInterface;
    readonly brain2: BrainInterface;
    readonly maxTicks?: number;
    readonly keepWindowOpen?: boolean;
    readonly onDecision?: DecisionSubscriber;
    readonly onObserve?: ObserverCallback;
}
export interface LiveMatchResult extends MatchResult {
    readonly overlay: DecisionOverlay;
    readonly timeline: MatchTimeline;
    readonly observer: MatchObserver;
}
/**
 * Run a live match with visible 0 A.D. window
 * Automatically launches the game, runs the match, captures decisions in real-time
 */
export declare function runLiveMatch(adapter: ZeroADAdapter, config: LiveMatchConfig): Promise<LiveMatchResult>;
//# sourceMappingURL=live-match-runner.d.ts.map