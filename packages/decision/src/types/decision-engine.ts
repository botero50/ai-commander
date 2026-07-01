import type { DecisionRequest } from './decision-request.js';
import type { DecisionResult } from './decision-result.js';

/**
 * Primary interface implemented by every decision engine.
 *
 * Responsibility:
 * - Accept a DecisionRequest
 * - Produce a DecisionResult
 *
 * No implementation logic. Only the contract.
 */
export interface DecisionEngine {
  /**
   * Request a decision.
   *
   * @param request The decision request
   * @returns The decision result
   */
  decide(request: DecisionRequest): Promise<DecisionResult>;
}
