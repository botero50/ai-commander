/**
 * Observation & Prompt Protocol — Canonical format for all providers
 *
 * Every LLM provider receives EXACTLY the same information in EXACTLY the same format.
 * No provider-specific observations or adaptations.
 * This ensures reproducible benchmarking and fair comparison.
 */

import type { CommandOption, ExecutionMemory, GoalOption, WorldObservation } from './types/brain.js';

/**
 * Structured JSON observation — Machine-readable format
 */
export interface StructuredObservation {
  readonly tick: number;
  readonly missionId: string;
  readonly agentStatus: {
    readonly position: { readonly x: number; readonly y: number };
    readonly health: number;
  };
  readonly worldState: {
    readonly friendlyUnits: number;
    readonly enemyUnits: number;
    readonly resources: ReadonlyArray<{
      readonly type: string;
      readonly amount: number;
    }>;
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
export function observationToStructured(
  observation: WorldObservation,
  availableGoals: ReadonlyArray<GoalOption>,
  memory: ExecutionMemory
): StructuredObservation {
  return {
    tick: observation.tick,
    missionId: observation.missionId,
    agentStatus: {
      position: observation.agentPosition,
      health: observation.agentHealth,
    },
    worldState: {
      friendlyUnits: observation.friendlyUnits.length,
      enemyUnits: observation.enemyUnits.length,
      resources: observation.resources,
      visibility: observation.visibility,
    },
    goals: availableGoals.map((g) => ({
      id: g.id,
      intent: g.intent,
      feasibility: g.feasibility,
    })),
    memory: memory.metrics,
  };
}

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

export function createCanonicalPrompt(
  observation: WorldObservation,
  availableGoals: ReadonlyArray<GoalOption>,
  availableCommands: ReadonlyArray<CommandOption>,
  memory: ExecutionMemory
): PromptTemplate {
  const structuredObs = observationToStructured(observation, availableGoals, memory);

  const systemPrompt = `You are an autonomous RTS agent playing a real-time strategy game.

Your role:
1. Analyze the current game state
2. Evaluate available goals and select the best one
3. Plan a sequence of actions
4. Select specific commands to execute

You must respond with a structured decision in JSON format.`;

  const resourcesStr = observation.resources
    .map((r) => `${r.type} ${r.amount}`)
    .join(', ');

  const userPrompt = `Current Game State (Tick ${observation.tick}):
- Agent Position: (${observation.agentPosition.x}, ${observation.agentPosition.y})
- Agent Health: ${observation.agentHealth}
- Friendly Units: ${observation.friendlyUnits.length}
- Enemy Units: ${observation.enemyUnits.length}
- Resources: ${resourcesStr}
- Map Explored: ${observation.visibility.explored}/${observation.visibility.totalMap}

Recent Decisions:
- Commands Executed: ${memory.metrics.commandsExecuted}
- Commands Failed: ${memory.metrics.commandsFailed}
- Goals Completed: ${memory.metrics.goalsCompleted}

Available Goals:
${availableGoals.map((g, i) => `${i + 1}. ${g.intent} (feasibility: ${(g.feasibility * 100).toFixed(0)}%)`).join('\n')}

Available Commands:
${availableCommands.slice(0, 10)
  .map((c, i) => `${i + 1}. ${c.action}${c.target ? ` → ${JSON.stringify(c.target)}` : ''}`)
  .join('\n')}

Decision Required:
1. Select the best goal from available options
2. Describe your reasoning (1-2 sentences)
3. Plan the next 3-5 actions
4. Select 1-3 commands to execute immediately

Respond in JSON format:
{
  "reasoning": "your reasoning",
  "selectedGoal": "goal intent",
  "plan": ["action1", "action2", "action3"],
  "commands": ["command1", "command2"]
}`;

  return { system: systemPrompt, user: userPrompt };
}

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
export function parseLLMResponse(text: string): LLMResponse {
  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

  return {
    reasoning: String(parsed.reasoning || ''),
    selectedGoal: String(parsed.selectedGoal || ''),
    plan: Array.isArray(parsed.plan) ? parsed.plan.map(String) : [],
    commands: Array.isArray(parsed.commands) ? parsed.commands.map(String) : [],
  };
}
