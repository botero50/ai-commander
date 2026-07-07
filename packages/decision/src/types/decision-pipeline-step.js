/**
 * Decision pipeline step.
 *
 * Bridges the Engine runtime with the Decision layer.
 * Implements PipelineStep but contains no AI logic itself.
 */
export function createDecisionPipelineStep(engine, policy) {
    return {
        id: 'decision',
        execute: async (worldState, executionCtx) => {
            const errors = [];
            try {
                // Request decision from engine
                const decisionContext = {
                    executionContext: executionCtx,
                    policy,
                };
                const agentId = worldState.agents[0]?.agentId;
                if (!agentId) {
                    return {
                        stepId: 'decision',
                        worldState,
                        eventsPublished: 0,
                        errors: ['No agents in world state'],
                    };
                }
                const result = await engine.decide({
                    agentId,
                    worldState,
                    context: decisionContext,
                });
                // Publish decision event if command produced
                if (result.command) {
                    try {
                        await executionCtx.eventBus.publish('CommandDecided', {
                            agentId,
                            command: result.command,
                            confidence: result.confidence,
                            tick: executionCtx.tick.number,
                        });
                    }
                    catch (publishError) {
                        errors.push(`Failed to publish CommandDecided: ${publishError instanceof Error ? publishError.message : String(publishError)}`);
                    }
                }
                return {
                    stepId: 'decision',
                    worldState,
                    eventsPublished: result.command ? 1 : 0,
                    errors: [...errors, ...result.errors],
                };
            }
            catch (stepError) {
                errors.push(`Decision step failed: ${stepError instanceof Error ? stepError.message : String(stepError)}`);
                return {
                    stepId: 'decision',
                    worldState,
                    eventsPublished: 0,
                    errors,
                };
            }
        },
    };
}
//# sourceMappingURL=decision-pipeline-step.js.map