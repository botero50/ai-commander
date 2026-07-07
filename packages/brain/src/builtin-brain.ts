/**
 * Built-in Brain — Wraps the existing AI Commander decision engine
 *
 * This adapter makes the framework continue working exactly as today,
 * while providing the standard Brain interface that LLM providers will implement.
 */

import type {
  Brain,
  BrainDecision,
  CommandOption,
  ExecutionMemory,
  GoalOption,
  WorldObservation,
} from './types/brain';

/**
 * BuiltinBrain: Adapter for the existing AI Commander decision logic
 *
 * The actual decision-making logic is delegated to the provided decision engine.
 * This allows the framework to work as it does today while providing the Brain interface.
 */
export class BuiltinBrain implements Brain {
  readonly name = 'BuiltinBrain';
  readonly version = '1.0.0';

  constructor(
    private readonly decisionEngine: {
      selectGoal(options: ReadonlyArray<GoalOption>): Promise<string>;
      planGoal(goal: string, observation: WorldObservation): Promise<readonly string[]>;
      selectCommands(
        plan: readonly string[],
        available: ReadonlyArray<CommandOption>,
        observation: WorldObservation
      ): Promise<readonly string[]>;
    }
  ) {}

  async decide(
    observation: WorldObservation,
    availableGoals: ReadonlyArray<GoalOption>,
    availableCommands: ReadonlyArray<CommandOption>,
    memory: ExecutionMemory
  ): Promise<BrainDecision> {
    // Use existing decision engine
    const selectedGoalId = await this.decisionEngine.selectGoal(availableGoals);
    const selectedGoal = availableGoals.find((g) => g.id === selectedGoalId);

    if (!selectedGoal) {
      return {
        reasoning: 'No valid goal selected',
        selectedGoal: 'none',
        plan: [],
        commands: [],
        confidence: 0,
      };
    }

    const plan = await this.decisionEngine.planGoal(selectedGoal.intent, observation);
    const commands = await this.decisionEngine.selectCommands(plan, availableCommands, observation);

    return {
      reasoning: `Selected ${selectedGoal.intent} with confidence ${selectedGoal.feasibility}`,
      selectedGoal: selectedGoal.id,
      plan,
      commands,
      confidence: selectedGoal.feasibility,
    };
  }
}
