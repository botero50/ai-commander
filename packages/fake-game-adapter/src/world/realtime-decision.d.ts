/**
 * Real-time decision making system for autonomous RTS gameplay
 */
import type { FakeWorldSnapshot } from './fake-world-state.js';
export interface DecisionOption {
    readonly id: string;
    readonly action: string;
    readonly estimatedValue: number;
    readonly executionTime: number;
    readonly riskLevel: 'low' | 'medium' | 'high';
    readonly prerequisites: ReadonlyArray<string>;
    readonly conflictsWith: ReadonlyArray<string>;
    readonly expectedOutcome: string;
}
export interface DecisionContext {
    readonly tick: number;
    readonly timeRemaining: number;
    readonly optionsAvailable: number;
    readonly urgency: 'low' | 'medium' | 'high' | 'critical';
    readonly constraints: ReadonlyArray<string>;
}
export interface SelectedDecision {
    readonly optionId: string;
    readonly action: string;
    readonly confidence: number;
    readonly reasoning: string;
    readonly timeToDecide: number;
    readonly alternativeConsidered: number;
    readonly executedAt: number;
}
export interface DecisionSequence {
    readonly primary: SelectedDecision;
    readonly backup: DecisionOption | null;
    readonly contingency: DecisionOption | null;
}
/**
 * Real-time decision making engine
 */
export declare class RealtimeDecisionMaker {
    private decisionHistory;
    private evaluationCache;
    private lastDecisionTime;
    /**
     * Evaluate a single option
     */
    evaluateOption(option: DecisionOption, world: FakeWorldSnapshot): number;
    /**
     * Rank options by utility
     */
    rankOptions(options: ReadonlyArray<DecisionOption>, world: FakeWorldSnapshot): DecisionOption[];
    /**
     * Determine decision context and urgency
     */
    assessContext(world: FakeWorldSnapshot, deadlineTick: number): DecisionContext;
    /**
     * Select best decision with confidence
     */
    selectDecision(options: ReadonlyArray<DecisionOption>, world: FakeWorldSnapshot, timeLimit?: number): SelectedDecision;
    /**
     * Create decision sequence with backup and contingency
     */
    createDecisionSequence(primaryOptions: ReadonlyArray<DecisionOption>, backupOptions: ReadonlyArray<DecisionOption>, contingencyOptions: ReadonlyArray<DecisionOption>, world: FakeWorldSnapshot): DecisionSequence;
    /**
     * Plan multi-step sequence
     */
    planSequence(goals: ReadonlyArray<{
        name: string;
        deadline: number;
    }>, world: FakeWorldSnapshot): ReadonlyArray<SelectedDecision>;
    /**
     * Handle time pressure by pruning options
     */
    pruneOptionsForTimePressure(options: ReadonlyArray<DecisionOption>, timeRemaining: number, maxPruned?: number): DecisionOption[];
    /**
     * Identify decision conflicts
     */
    identifyConflicts(options: ReadonlyArray<DecisionOption>): ReadonlyArray<{
        optionA: string;
        optionB: string;
    }>;
    /**
     * Check if prerequisites are met
     */
    checkPrerequisites(option: DecisionOption, world: FakeWorldSnapshot): boolean;
    /**
     * Filter feasible options
     */
    filterFeasibleOptions(options: ReadonlyArray<DecisionOption>, world: FakeWorldSnapshot): DecisionOption[];
    /**
     * Generate decision report
     */
    generateDecisionReport(): string;
    /**
     * Reset state
     */
    reset(): void;
    getDecisionHistory(): ReadonlyArray<SelectedDecision>;
}
/**
 * Global decision maker instance
 */
export declare const globalDecisionMaker: RealtimeDecisionMaker;
//# sourceMappingURL=realtime-decision.d.ts.map