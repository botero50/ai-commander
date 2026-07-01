import type { BehaviorNode, CompositeNode, DecoratorNode } from './nodes/behavior-node.js';
import type { BehaviorStatus, BehaviorContext } from './types.js';

/**
 * A behavior tree is a tree of nodes that defines how an agent acts.
 *
 * The tree is executed from the root node, which controls how children are executed.
 * Each node returns success, failure, or running.
 *
 * Trees are game-agnostic: they define behavior patterns, not game logic.
 */
export interface BehaviorTree {
  /**
   * Unique identifier for this tree.
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Root node of the tree.
   *
   * Typically a composite (Sequence or Selector).
   */
  readonly root: CompositeNode;

  /**
   * Execute one frame of the behavior tree.
   *
   * @param context Execution context with world state
   * @returns Status of the root node
   */
  tick(context: BehaviorContext): Promise<BehaviorStatus>;

  /**
   * Reset the tree to initial state.
   *
   * Called when tree execution should be restarted.
   */
  reset(): void;
}

/**
 * Create a behavior tree.
 */
export function createBehaviorTree(id: string, name: string, root: CompositeNode): BehaviorTree {
  return Object.freeze({
    id,
    name,
    root,
    async tick(context: BehaviorContext): Promise<BehaviorStatus> {
      return root.execute(context);
    },
    reset(): void {
      resetNode(root);
    },
  });
}

/**
 * Reset a node and all its children recursively.
 */
function resetNode(node: BehaviorNode): void {
  node.reset();

  // Reset children if it's a composite or decorator
  const composite = node as CompositeNode | undefined;
  if (composite && 'children' in composite) {
    for (const child of composite.children) {
      resetNode(child);
    }
  }

  const decorator = node as DecoratorNode | undefined;
  if (decorator && 'child' in decorator && decorator.child) {
    resetNode(decorator.child);
  }
}
