/**
 * Observation & Prompt Protocol — Canonical format for all providers
 *
 * Every LLM provider receives EXACTLY the same information in EXACTLY the same format.
 * No provider-specific observations or adaptations.
 * This ensures reproducible benchmarking and fair comparison.
 */
import type { CommandOption, ExecutionMemory, GoalOption, WorldObservation } from './types/brain';
/**
 * Structured JSON observation — Machine-readable format
 */
export interface StructuredObservation {
    readonly tick: number;
    readonly missionId: string;
    readonly agentStatus: {
        readonly position: {
            readonly x: number;
            readonly y: number;
        };
        readonly health: number;
    };
    readonly worldState: {
        readonly friendlyUnits: number;
        readonly enemyUnits: number;
        readonly resources: {
            readonly ore: number;
            readonly gas: number;
        };
        readonly visibility: {
            readonly explored: number;
            readonly visible: number;
            readonly totalMap: number;
        };
    };
    readonly goals: ReadonlyArray<{
        readonly id: string;
        readonly intent: string;
        readonly feasibility: number;
    }>;
    readonly memory: {
        readonly commandsExecuted: number;
        readonly commandsFailed: number;
        readonly goalsCompleted: number;
    };
}
/**
 * Convert world observation to canonical structured format
 */
export declare function observationToStructured(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, memory: ExecutionMemory): StructuredObservation;
/**
 * Canonical prompt template — Used for all text-based LLM providers
 *
 * This prompt is IDENTICAL for every LLM provider.
 * Only model parameters (temperature, max_tokens) vary by provider config.
 */
export interface PromptTemplate {
    readonly system: string;
    readonly user: string;
}
export declare function createCanonicalPrompt(observation: WorldObservation, availableGoals: ReadonlyArray<GoalOption>, availableCommands: ReadonlyArray<CommandOption>, memory: ExecutionMemory): PromptTemplate;
/**
 * Response format that all LLM providers must parse
 */
export interface LLMResponse {
    readonly reasoning: string;
    readonly selectedGoal: string;
    readonly plan: readonly string[];
    readonly commands: readonly string[];
}
/**
 * Parse LLM response from JSON text
 *
 * Robust parsing that handles model variations:
 * - Extra whitespace
 - Different JSON formatting
 - Fields in any order
 */
export declare function parseLLMResponse(text: string): LLMResponse;
//# sourceMappingURL=observation-protocol.d.ts.map