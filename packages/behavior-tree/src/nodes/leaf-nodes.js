import { BehaviorStatus } from '../types.js';
/**
 * Simple action node that calls a function.
 *
 * The function determines success/failure/running status.
 */
export class SimpleActionNode {
    constructor(id, name, action) {
        this.id = id;
        this.name = name;
        this.action = action;
    }
    async execute(context) {
        return this.action(context);
    }
    reset() {
        // No internal state to reset
    }
}
/**
 * Simple condition node that evaluates a predicate.
 *
 * Returns success if predicate is true, failure if false.
 */
export class SimpleConditionNode {
    constructor(id, name, predicate) {
        this.id = id;
        this.name = name;
        this.predicate = predicate;
    }
    async execute(context) {
        return Promise.resolve(this.predicate(context) ? BehaviorStatus.Success : BehaviorStatus.Failure);
    }
    reset() {
        // No internal state to reset
    }
}
/**
 * Create an action node.
 */
export function createActionNode(id, name, action) {
    return new SimpleActionNode(id, name, action);
}
/**
 * Create a condition node.
 */
export function createConditionNode(id, name, predicate) {
    return new SimpleConditionNode(id, name, predicate);
}
//# sourceMappingURL=leaf-nodes.js.map