import type { CompositeNode } from './nodes/behavior-node.js';
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
export declare function createBehaviorTree(id: string, name: string, root: CompositeNode): BehaviorTree;
//# sourceMappingURL=behavior-tree.d.ts.map