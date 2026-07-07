/**
 * Built-in Brain — Wraps the existing AI Commander decision engine
 *
 * This adapter makes the framework continue working exactly as today,
 * while providing the standard Brain interface that LLM providers will implement.
 */
/**
 * BuiltinBrain: Adapter for the existing AI Commander decision logic
 *
 * The actual decision-making logic is delegated to the provided decision engine.
 * This allows the framework to work as it does today while providing the Brain interface.
 */
export class BuiltinBrain {
    constructor(decisionEngine) {
        this.decisionEngine = decisionEngine;
        this.name = 'BuiltinBrain';
        this.version = '1.0.0';
    }
    async decide(observation, availableGoals, availableCommands, memory) {
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
//# sourceMappingURL=builtin-brain.js.map