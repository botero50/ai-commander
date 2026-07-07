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
export declare class Sequence implements CompositeNode {
    readonly id: string;
    readonly name: string;
    readonly children: readonly BehaviorNode[];
    private runningChildIndex;
    constructor(id: string, name: string, children: readonly BehaviorNode[]);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Create a sequence node.
 */
export declare function createSequence(id: string, name: string, children: readonly BehaviorNode[]): Sequence;
//# sourceMappingURL=sequence.d.ts.map