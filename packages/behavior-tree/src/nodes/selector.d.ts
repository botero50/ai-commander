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
export declare class Selector implements CompositeNode {
    readonly id: string;
    readonly name: string;
    readonly children: readonly BehaviorNode[];
    private runningChildIndex;
    constructor(id: string, name: string, children: readonly BehaviorNode[]);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Create a selector node.
 */
export declare function createSelector(id: string, name: string, children: readonly BehaviorNode[]): Selector;
//# sourceMappingURL=selector.d.ts.map