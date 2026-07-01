import type { Planner, PlanningRequest, PlanningResult } from '@ai-commander/planner';
import type { DecisionEngine, DecisionRequest, DecisionResult } from '@ai-commander/decision';

/**
 * Test double: Stub Planner
 *
 * Used in tests to satisfy the AgentRuntime API without implementing real planning.
 * A real application would provide a proper planning algorithm (A*, GOAP, HTN, etc.).
 */
export const testPlanner: Planner = {
  async plan(request: PlanningRequest): Promise<PlanningResult> {
    return {
      plan: undefined as any,
      metadata: {
        timestamp: Date.now(),
        plannerType: 'test-stub',
      },
      errors: ['Test stub: planning not implemented'],
    };
  },
};

/**
 * Test double: Stub DecisionEngine
 *
 * Used in tests to satisfy the AgentRuntime API without implementing real decision-making.
 * A real application would provide a decision engine (Behavior Trees, Utility AI, FSM, etc.).
 */
export const testDecisionEngine: DecisionEngine = {
  async decide(request: DecisionRequest): Promise<DecisionResult> {
    return {
      command: undefined as any,
      metadata: {
        timestamp: Date.now(),
        processingTimeMs: 0,
        engineType: 'test-stub',
      },
      errors: ['Test stub: decision-making not implemented'],
    };
  },
};
