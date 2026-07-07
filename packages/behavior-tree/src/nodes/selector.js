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
export class Selector {
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
    reset() {
        this.runningChildIndex = -1;
    }
}
/**
 * Create a selector node.
 */
export function createSelector(id, name, children) {
    if (children.length === 0) {
        throw new Error('Selector must have at least one child');
    }
    return new Selector(id, name, children);
}
//# sourceMappingURL=selector.js.map