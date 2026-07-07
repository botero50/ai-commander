/**
 * Observation & Prompt Protocol — Canonical format for all providers
 *
 * Every LLM provider receives EXACTLY the same information in EXACTLY the same format.
 * No provider-specific observations or adaptations.
 * This ensures reproducible benchmarking and fair comparison.
 */
/**
 * Convert world observation to canonical structured format
 */
export function observationToStructured(observation, availableGoals, memory) {
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
export function createCanonicalPrompt(observation, availableGoals, availableCommands, memory) {
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
 * Parse LLM response from JSON text
 *
 * Robust parsing that handles model variations:
 * - Extra whitespace
 - Different JSON formatting
 - Fields in any order
 */
export function parseLLMResponse(text) {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('No JSON object found in response');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
        reasoning: String(parsed.reasoning || ''),
        selectedGoal: String(parsed.selectedGoal || ''),
        plan: Array.isArray(parsed.plan) ? parsed.plan.map(String) : [],
        commands: Array.isArray(parsed.commands) ? parsed.commands.map(String) : [],
    };
}
//# sourceMappingURL=observation-protocol.js.map