import type { BehaviorNode, CompositeNode } from './behavior-node.js';
import type { BehaviorContext } from '../types.js';
import { BehaviorStatus } from '../types.js';

/**
 * Selector composite node.
 *
 * Executes children in order until one succeeds or all fail.
 *
 * Returns:
 * - Success if any child succeeds
 * - Failure if all children fail
 * - Running if any child returns running (pauses at that child)
 */
export class Selector implements CompositeNode {
  readonly id: string;
  readonly name: string;
  readonly children: readonly BehaviorNode[];
  private runningChildIndex: number = -1;

  constructor(id: string, name: string, children: readonly BehaviorNode[]) {
    this.id = id;
    this.name = name;
    this.children = children;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    const startIndex = this.runningChildIndex >= 0 ? this.runningChildIndex : 0;

    for (let i = startIndex; i < this.children.length; i++) {
      const child = this.children[i];
      if (!child) {
        throw new Error(`Child at index ${i} is undefined`);
      }
      const status = await child.execute(context);

      if (status === BehaviorStatus.Running) {
        this.runningChildIndex = i;
        return BehaviorStatus.Running;
      }

      if (status === BehaviorStatus.Success) {
        this.runningChildIndex = -1;
        return BehaviorStatus.Success;
      }

      // Failure, continue to next child
    }

    // All children failed
    this.runningChildIndex = -1;
    return BehaviorStatus.Failure;
  }

  reset(): void {
    this.runningChildIndex = -1;
  }
}

/**
 * Create a selector node.
 */
export function createSelector(
  id: string,
  name: string,
  children: readonly BehaviorNode[]
): Selector {
  if (children.length === 0) {
    throw new Error('Selector must have at least one child');
  }
  return new Selector(id, name, children);
}
