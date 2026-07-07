/**
 * Brain SDK - Standard interface for autonomous decision makers
 *
 * A Brain receives complete world observation and returns reasoned decisions.
 * All brains use identical input/output contract regardless of provider.
 */
import type { FakeWorldSnapshot } from './fake-world-state.js';
export type CommandType = 'move' | 'gather' | 'deposit' | 'produce' | 'train' | 'scout' | 'attack';
export interface Command {
    readonly type: CommandType;
    readonly unitId?: string;
    readonly targetX?: number;
    readonly targetY?: number;
    readonly unitType?: 'worker' | 'infantry' | 'ranged' | 'tank';
}
export interface Goal {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly priority: number;
    readonly deadline?: number;
    readonly reward: number;
}
export interface AvailableAction {
    readonly action: string;
    readonly description: string;
    readonly precondition: string;
    readonly cost?: number;
    readonly estimatedDuration: number;
}
export interface BrainMemory {
    readonly lastObservation?: FakeWorldSnapshot;
    readonly previousDecisions: ReadonlyArray<{
        goal: string;
        commands: ReadonlyArray<Command>;
        tick: number;
        outcome: string;
    }>;
    readonly knownStrategies: ReadonlyArray<{
        name: string;
        successRate: number;
        lastUsed: number;
    }>;
    readonly opponentModels: ReadonlyMap<string, {
        strategy: string;
        strength: number;
    }>;
}
export interface BrainInput {
    readonly world: FakeWorldSnapshot;
    readonly availableGoals: ReadonlyArray<Goal>;
    readonly availableActions: ReadonlyArray<AvailableAction>;
    readonly memory: BrainMemory;
    readonly executionHistory: ReadonlyArray<{
        tick: number;
        commandsIssued: number;
        successRate: number;
    }>;
}
export interface BrainReasoning {
    readonly thought: string;
    readonly analysis: string;
    readonly riskAssessment: string;
    readonly confidence: number;
}
export interface BrainPlan {
    readonly immediateGoal: string;
    readonly steps: ReadonlyArray<string>;
    readonly alternativePlans: ReadonlyArray<string>;
    readonly estimatedDuration: number;
}
export interface BrainOutput {
    readonly reasoning: BrainReasoning;
    readonly selectedGoal: string;
    readonly plan: BrainPlan;
    readonly commands: ReadonlyArray<Command>;
    readonly metadata: {
        readonly thinkingTimeMs: number;
        readonly modelUsed: string;
        readonly tokensUsed?: number;
        readonly confidence: number;
    };
}
/**
 * Brain interface - all decision makers must implement this
 */
export interface Brain {
    readonly name: string;
    readonly version: string;
    /**
     * Make a decision given world state and available options
     */
    decide(input: BrainInput): Promise<BrainOutput>;
    /**
     * Update memory with match outcome
     */
    updateMemory(observation: FakeWorldSnapshot, executed: ReadonlyArray<Command>, succeeded: boolean): void;
    /**
     * Reset brain state (e.g., between matches)
     */
    reset(): void;
}
/**
 * Built-in Brain using AI Commander's existing planner
 * This brain uses the existing strategic intelligence and decision-making systems
 */
export declare class BuiltinBrain implements Brain {
    readonly name = "builtin-ai-commander";
    readonly version = "1.0";
    private memory;
    decide(input: BrainInput): Promise<BrainOutput>;
    updateMemory(observation: FakeWorldSnapshot, executed: ReadonlyArray<Command>, succeeded: boolean): void;
    reset(): void;
    private analyzeSituation;
    private analyzeResources;
    private assessRisk;
    private selectGoal;
    private createPlan;
    private generateCommands;
}
/**
 * Brain registry for managing available brains
 */
export declare class BrainRegistry {
    private brains;
    register(id: string, brain: Brain): void;
    get(id: string): Brain | undefined;
    list(): ReadonlyArray<{
        id: string;
        name: string;
        version: string;
    }>;
    reset(): void;
}
/**
 * Global brain registry
 */
export declare const globalBrainRegistry: BrainRegistry;
//# sourceMappingURL=brain-sdk.d.ts.map