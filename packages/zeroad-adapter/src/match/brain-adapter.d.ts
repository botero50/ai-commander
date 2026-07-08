import { WorldState, Command } from '@ai-commander/domain';
interface WorldObservation {
    readonly tick: number;
    readonly timestamp: number;
    readonly missionId: string;
    readonly agentId: string;
    readonly agentName: string;
    readonly agentPosition: {
        readonly x: number;
        readonly y: number;
    };
    readonly agentHealth: number;
    readonly friendlyUnits: ReadonlyArray<{
        readonly id: string;
        readonly name: string;
        readonly type: string;
        readonly position: {
            readonly x: number;
            readonly y: number;
        };
        readonly health: number;
    }>;
    readonly enemyUnits: ReadonlyArray<{
        readonly id: string;
        readonly type: string;
        readonly position: {
            readonly x: number;
            readonly y: number;
        };
        readonly health: number;
        readonly threat: number;
    }>;
    readonly resources: ReadonlyArray<{
        readonly type: string;
        readonly amount: number;
    }>;
    readonly structures: ReadonlyArray<{
        readonly id: string;
        readonly type: string;
        readonly position: {
            readonly x: number;
            readonly y: number;
        };
        readonly health: number;
        readonly owner: 'friendly' | 'enemy';
    }>;
    readonly visibility: {
        readonly explored: number;
        readonly visible: number;
        readonly totalMap: number;
        readonly visibleEnemyCount: number;
        readonly visibleResourceCount: number;
    };
}
interface GoalOption {
    readonly id: string;
    readonly intent: string;
    readonly priority: 'high' | 'medium' | 'low';
    readonly feasibility: number;
    readonly expectedDuration: number;
    readonly estimatedValue: number;
}
interface CommandOption {
    readonly id: string;
    readonly action: string;
    readonly target?: {
        readonly x: number;
        readonly y: number;
    } | string;
    readonly expectedDuration: number;
    readonly expectedCost: number;
    readonly description: string;
}
interface ExecutionMemory {
    readonly recentEvents: ReadonlyArray<{
        readonly tick: number;
        readonly type: string;
        readonly detail: string;
    }>;
    readonly recentDecisions: ReadonlyArray<{
        readonly tick: number;
        readonly goal: string;
        readonly commands: string[];
        readonly outcome: string;
    }>;
    readonly metrics: {
        readonly commandsExecuted: number;
        readonly commandsFailed: number;
        readonly goalsCompleted: number;
        readonly goalsAbandoned: number;
    };
}
interface BrainDecision {
    readonly reasoning: string;
    readonly selectedGoal: string;
    readonly plan: readonly string[];
    readonly commands: readonly string[];
    readonly confidence: number;
}
/**
 * Converts framework WorldState to Brain SDK WorldObservation.
 * Adapts domain model to Brain's expected observation format while maintaining immutability.
 */
export declare class BrainAdapter {
    static worldStateToObservation(worldState: WorldState, missionId: string, agentId: string): WorldObservation;
    /**
     * Returns default goal options for the current state.
     * Framework-provided, no provider-specific logic.
     */
    static getDefaultGoals(): readonly GoalOption[];
    /**
     * Returns default command options for the current state.
     * Framework-provided, no provider-specific logic.
     */
    static getDefaultCommands(): readonly CommandOption[];
    /**
     * Returns execution memory for context.
     * Minimal initial state, expanded in future stories.
     */
    static getExecutionMemory(): ExecutionMemory;
    /**
     * Converts Brain decision to framework Commands.
     * Maintains type safety and immutability of framework Command objects.
     */
    static brainDecisionToCommands(decision: BrainDecision, agentId: string, tick: number): Command[];
}
export {};
//# sourceMappingURL=brain-adapter.d.ts.map