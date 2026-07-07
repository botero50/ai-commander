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
export class Sequence {
    constructor(id, name, children) {
        this.runningChildIndex = -1;
        this.id = id;
        this.name = name;
        this.children = children;
    }
    async execute(context) {
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
    reset() {
        this.runningChildIndex = -1;
    }
}
/**
 * Create a sequence node.
 */
export function createSequence(id, name, children) {
    if (children.length === 0) {
        throw new Error('Sequence must have at least one child');
    }
    return new Sequence(id, name, children);
}
//# sourceMappingURL=sequence.js.map