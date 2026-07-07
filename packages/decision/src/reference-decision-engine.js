import { isTerminalStepStatus } from '@ai-commander/planner';
/**
 * Reference implementation of DecisionEngine.
 *
 * Validates the framework contracts without implementing intelligence.
 *
 * Responsibility:
 * - Accept a DecisionRequest with a Plan
 * - Find the first executable incomplete step
 * - Return the associated Command
 * - Return empty decision if no executable step exists
 *
 * Does NOT:
 * - Perform planning
 * - Optimize plans
 * - Evaluate goals
 * - Implement heuristics or search
 * - Mutate the plan or goal
 * - Update step statuses
 */
export class ReferenceDecisionEngine {
    /**
     * Request a decision.
     *
     * Examines the current plan and selects the first executable incomplete step.
     *
     * @param request The decision request containing the current plan
     * @returns A decision result with the selected command or empty result
     */
    decide(request) {
        return Promise.resolve(this.decideSync(request));
    }
    /**
     * Synchronous decision logic.
     */
    decideSync(request) {
        const startTime = Date.now();
        const errors = [];
        try {
            // Validate request
            if (!request) {
                errors.push('DecisionRequest is required');
                return Object.freeze({
                    confidence: 0,
                    metadata: Object.freeze({
                        engineType: 'reference',
                        timestamp: startTime,
                        processingTimeMs: Date.now() - startTime,
                    }),
                    errors,
                });
            }
            const plan = request.plan;
            if (!plan) {
                errors.push('Plan is required in DecisionRequest');
                return Object.freeze({
                    confidence: 0,
                    metadata: Object.freeze({
                        engineType: 'reference',
                        timestamp: startTime,
                        processingTimeMs: Date.now() - startTime,
                    }),
                    errors,
                });
            }
            // Validate plan
            if (!plan.steps || plan.steps.length === 0) {
                // Empty plan is valid: no executable steps
                return Object.freeze({
                    confidence: 1,
                    metadata: Object.freeze({
                        engineType: 'reference',
                        timestamp: startTime,
                        processingTimeMs: Date.now() - startTime,
                        reason: 'plan_empty',
                    }),
                    errors: [],
                });
            }
            // Find first executable incomplete step
            for (const step of plan.steps) {
                // Skip terminal steps (completed, failed, skipped)
                if (step.status && isTerminalStepStatus(step.status)) {
                    continue;
                }
                // Return the first non-terminal step
                return Object.freeze({
                    command: step.command,
                    confidence: 1,
                    metadata: Object.freeze({
                        engineType: 'reference',
                        timestamp: startTime,
                        processingTimeMs: Date.now() - startTime,
                        selectedStepId: step.id,
                        selectedStepSequence: step.sequenceNumber,
                    }),
                    errors: [],
                });
            }
            // All steps are terminal: no executable step available
            return Object.freeze({
                confidence: 1,
                metadata: Object.freeze({
                    engineType: 'reference',
                    timestamp: startTime,
                    processingTimeMs: Date.now() - startTime,
                    reason: 'all_steps_terminal',
                }),
                errors: [],
            });
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            errors.push(`Decision engine error: ${errorMsg}`);
            return Object.freeze({
                confidence: 0,
                metadata: Object.freeze({
                    engineType: 'reference',
                    timestamp: startTime,
                    processingTimeMs: Date.now() - startTime,
                }),
                errors,
            });
        }
    }
}
//# sourceMappingURL=reference-decision-engine.js.map