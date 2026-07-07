import type { ActionNode, ConditionNode } from './behavior-node.js';
import type { BehaviorContext } from '../types.js';
import { BehaviorStatus } from '../types.js';
/**
 * Simple action node that calls a function.
 *
 * The function determines success/failure/running status.
 */
export declare class SimpleActionNode implements ActionNode {
    readonly id: string;
    readonly name: string;
    private action;
    constructor(id: string, name: string, action: (context: BehaviorContext) => Promise<BehaviorStatus>);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Simple condition node that evaluates a predicate.
 *
 * Returns success if predicate is true, failure if false.
 */
export declare class SimpleConditionNode implements ConditionNode {
    readonly id: string;
    readonly name: string;
    private predicate;
    constructor(id: string, name: string, predicate: (context: BehaviorContext) => boolean);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Create an action node.
 */
export declare function createActionNode(id: string, name: string, action: (context: BehaviorContext) => Promise<BehaviorStatus>): SimpleActionNode;
/**
 * Create a condition node.
 */
export declare function createConditionNode(id: string, name: string, predicate: (context: BehaviorContext) => boolean): SimpleConditionNode;
//# sourceMappingURL=leaf-nodes.d.ts.map