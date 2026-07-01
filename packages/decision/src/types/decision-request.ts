import type { WorldState } from '@ai-commander/domain';
import type { Plan } from '@ai-commander/planner';
import type { DecisionContext } from './decision-context.js';

/**
 * Immutable request object for decision engines.
 *
 * Contains only the information necessary to request a decision.
 *
 * The Plan is passed through here so the decision engine can inspect
 * and select which step to execute next.
 *
 * In initial implementation, Plan may be unavailable while runtime architecture
 * is finalized. The decision engine must handle missing plans gracefully.
 */
export interface DecisionRequest {
  /**
   * Agent identifier.
   */
  readonly agentId: string;

  /**
   * Current world state.
   */
  readonly worldState: WorldState;

  /**
   * Current plan to execute.
   *
   * The decision engine selects which step to execute next.
   * May be undefined while runtime integration is being finalized.
   */
  readonly plan?: Plan;

  /**
   * Execution context with infrastructure.
   */
  readonly context: DecisionContext;

  /**
   * Optional metadata.
   */
  readonly metadata?: Record<string, unknown>;
}
