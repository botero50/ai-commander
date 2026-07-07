/**
 * Implementation of Pipeline.
 * YAGNI: Simple, direct implementation without abstraction layers.
 */
export class PipelineImpl {
    constructor(steps) {
        this.steps = steps;
    }
    get stepIds() {
        return this.steps.map((s) => s.id);
    }
    async execute(worldState, context) {
        const stepsExecuted = [];
        let currentWorldState = worldState;
        let totalEventsPublished = 0;
        const errors = [];
        for (const step of this.steps) {
            try {
                const result = await step.execute(currentWorldState, context);
                stepsExecuted.push(result.stepId);
                currentWorldState = result.worldState;
                totalEventsPublished += result.eventsPublished;
                errors.push(...result.errors);
            }
            catch (error) {
                errors.push(`Step ${step.id} failed: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        return {
            stepsExecuted,
            worldState: currentWorldState,
            eventsPublished: totalEventsPublished,
            errors,
        };
    }
}
//# sourceMappingURL=execution-pipeline.js.map