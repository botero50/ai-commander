/**
 * Built-in Brain — Wraps the existing AI Commander decision engine
 *
 * This adapter makes the framework continue working exactly as today,
 * while providing the standard Brain interface that LLM providers will implement.
 */
import type { Brain, BrainDecision, CommandOption, ExecutionMemory, GoalOption, WorldObservation } from './types/brain.js';
/**
 * BuiltinBrain: Adapter for the existing AI Commander decision logic
 *
 * The actual decision-making logic is delegated to the provided decision engine.
 * This allows the framework to work as it does today while providing the Brain interface.
 */
export declare class BuiltinBrain implements Brain {
    private readonly decisionEngine;
    readonly name = "BuiltinBrain";
    readonly version = "1.0.0";
    constructor(decisionEngine: {
        selectGoal(options: ReadonlyArray<GoalOption>): Promise<string>;
        planGoal(goal: string, observation: WorldObservation): Promise<readonly string[]>;
        selectCommands(plan: readonly string[], available: ReadonlyArray<CommandOption>, observation: WorldObservation): Promise<readonly string[]>;
    });
    decide(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): Promise<BrainDecision>;
}
//# sourceMappingURL=builtin-brain.d.ts.map