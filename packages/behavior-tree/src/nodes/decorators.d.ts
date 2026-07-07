import type { BehaviorNode, DecoratorNode } from './behavior-node.js';
import type { BehaviorContext } from '../types.js';
import { BehaviorStatus } from '../types.js';
/**
 * Inverter decorator.
 *
 * Inverts the child's result:
 * - Success → Failure
 * - Failure → Success
 * - Running → Running (unchanged)
 */
export declare class Inverter implements DecoratorNode {
    readonly id: string;
    readonly name: string;
    readonly child: BehaviorNode;
    constructor(id: string, name: string, child: BehaviorNode);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Succeeder decorator.
 *
 * Always returns success:
 * - Success → Success
 * - Failure → Success
 * - Running → Running (unchanged)
 */
export declare class Succeeder implements DecoratorNode {
    readonly id: string;
    readonly name: string;
    readonly child: BehaviorNode;
    constructor(id: string, name: string, child: BehaviorNode);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Failure decorator.
 *
 * Always returns failure:
 * - Success → Failure
 * - Failure → Failure
 * - Running → Running (unchanged)
 */
export declare class FailureDecorator implements DecoratorNode {
    readonly id: string;
    readonly name: string;
    readonly child: BehaviorNode;
    constructor(id: string, name: string, child: BehaviorNode);
    execute(context: BehaviorContext): Promise<BehaviorStatus>;
    reset(): void;
}
/**
 * Create an inverter decorator.
 */
export declare function createInverter(id: string, name: string, child: BehaviorNode): Inverter;
/**
 * Create a succeeder decorator.
 */
export declare function createSucceeder(id: string, name: string, child: BehaviorNode): Succeeder;
/**
 * Create a failure decorator.
 */
export declare function createFailureDecorator(id: string, name: string, child: BehaviorNode): FailureDecorator;
//# sourceMappingURL=decorators.d.ts.map