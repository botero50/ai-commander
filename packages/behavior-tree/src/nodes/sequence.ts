import type { BehaviorNode, CompositeNode } from './behavior-node.js';
import type { BehaviorContext } from '../types.js';
import { BehaviorStatus } from '../types.js';

/**
 * Sequence composite node.
 *
 * Executes children in order until one fails or all succeed.
 *
 * Returns:
 * - Success if all children succeed
 * - Failure if any child fails
 * - Running if any child returns running (pauses at that child)
 */
export class Sequence implements CompositeNode {
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

      if (status === BehaviorStatus.Failure) {
        this.runningChildIndex = -1;
        return BehaviorStatus.Failure;
      }

      // Success, continue to next child
    }

    // All children succeeded
    this.runningChildIndex = -1;
    return BehaviorStatus.Success;
  }

  reset(): void {
    this.runningChildIndex = -1;
  }
}

/**
 * Create a sequence node.
 */
export function createSequence(
  id: string,
  name: string,
  children: readonly BehaviorNode[]
): Sequence {
  if (children.length === 0) {
    throw new Error('Sequence must have at least one child');
  }
  return new Sequence(id, name, children);
}
