import type { BehaviorStatus, BehaviorContext } from '../types.js';

/**
 * Base interface for all behavior tree nodes.
 *
 * A node is a unit of behavior that returns success, failure, or running.
 */
export interface BehaviorNode {
  /**
   * Unique identifier for this node.
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Execute this node in the given context.
   *
   * Must be deterministic: same input → same output.
   *
   * @param context The execution context with world state
   * @returns Status of execution
   */
  execute(context: BehaviorContext): Promise<BehaviorStatus>;

  /**
   * Reset any internal state (for running nodes).
   *
   * Called when a running node should be reset.
   */
  reset(): void;
}

/**
 * Composite node that has children.
 *
 * Controls child execution order and success/failure logic.
 */
export interface CompositeNode extends BehaviorNode {
  readonly children: readonly BehaviorNode[];
}

/**
 * Decorator node that wraps another node.
 *
 * Modifies child behavior (inverter, succeeder, etc.).
 */
export interface DecoratorNode extends BehaviorNode {
  readonly child: BehaviorNode;
}

/**
 * Leaf node with no children.
 *
 * Either an action or a condition.
 */
export type LeafNode = BehaviorNode;

/**
 * Action node that performs an action.
 *
 * Returns success if action completed, failure if it cannot execute, or running if still in progress.
 */
export type ActionNode = LeafNode;

/**
 * Condition node that evaluates a condition.
 *
 * Returns success if condition is true, failure if false.
 * Should never return running.
 */
export type ConditionNode = LeafNode;
