import type { ActionNode, ConditionNode } from './behavior-node.js';
import type { BehaviorContext } from '../types.js';
import { BehaviorStatus } from '../types.js';

/**
 * Simple action node that calls a function.
 *
 * The function determines success/failure/running status.
 */
export class SimpleActionNode implements ActionNode {
  readonly id: string;
  readonly name: string;
  private action: (context: BehaviorContext) => Promise<BehaviorStatus>;

  constructor(
    id: string,
    name: string,
    action: (context: BehaviorContext) => Promise<BehaviorStatus>
  ) {
    this.id = id;
    this.name = name;
    this.action = action;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    return this.action(context);
  }

  reset(): void {
    // No internal state to reset
  }
}

/**
 * Simple condition node that evaluates a predicate.
 *
 * Returns success if predicate is true, failure if false.
 */
export class SimpleConditionNode implements ConditionNode {
  readonly id: string;
  readonly name: string;
  private predicate: (context: BehaviorContext) => boolean;

  constructor(id: string, name: string, predicate: (context: BehaviorContext) => boolean) {
    this.id = id;
    this.name = name;
    this.predicate = predicate;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    return Promise.resolve(
      this.predicate(context) ? BehaviorStatus.Success : BehaviorStatus.Failure
    );
  }

  reset(): void {
    // No internal state to reset
  }
}

/**
 * Create an action node.
 */
export function createActionNode(
  id: string,
  name: string,
  action: (context: BehaviorContext) => Promise<BehaviorStatus>
): SimpleActionNode {
  return new SimpleActionNode(id, name, action);
}

/**
 * Create a condition node.
 */
export function createConditionNode(
  id: string,
  name: string,
  predicate: (context: BehaviorContext) => boolean
): SimpleConditionNode {
  return new SimpleConditionNode(id, name, predicate);
}
