import type { DecisionEngine } from './types/decision-engine.js';
import type { DecisionRequest } from './types/decision-request.js';
import type { DecisionResult } from './types/decision-result.js';
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
export declare class ReferenceDecisionEngine implements DecisionEngine {
    /**
     * Request a decision.
     *
     * Examines the current plan and selects the first executable incomplete step.
     *
     * @param request The decision request containing the current plan
     * @returns A decision result with the selected command or empty result
     */
    decide(request: DecisionRequest): Promise<DecisionResult>;
    /**
     * Synchronous decision logic.
     */
    private decideSync;
}
//# sourceMappingURL=reference-decision-engine.d.ts.map