import { BehaviorStatus } from '../types.js';
/**
 * Inverter decorator.
 *
 * Inverts the child's result:
 * - Success → Failure
 * - Failure → Success
 * - Running → Running (unchanged)
 */
export class Inverter {
    constructor(id, name, child) {
        this.id = id;
        this.name = name;
        this.child = child;
    }
    async execute(context) {
        const status = await this.child.execute(context);
        if (status === BehaviorStatus.Running) {
            return BehaviorStatus.Running;
        }
        return status === BehaviorStatus.Success ? BehaviorStatus.Failure : BehaviorStatus.Success;
    }
    reset() {
        this.child.reset();
    }
}
/**
 * Succeeder decorator.
 *
 * Always returns success:
 * - Success → Success
 * - Failure → Success
 * - Running → Running (unchanged)
 */
export class Succeeder {
    constructor(id, name, child) {
        this.id = id;
        this.name = name;
        this.child = child;
    }
    async execute(context) {
        const status = await this.child.execute(context);
        if (status === BehaviorStatus.Running) {
            return BehaviorStatus.Running;
        }
        return BehaviorStatus.Success;
    }
    reset() {
        this.child.reset();
    }
}
/**
 * Failure decorator.
 *
 * Always returns failure:
 * - Success → Failure
 * - Failure → Failure
 * - Running → Running (unchanged)
 */
export class FailureDecorator {
    constructor(id, name, child) {
        this.id = id;
        this.name = name;
        this.child = child;
    }
    async execute(context) {
        const status = await this.child.execute(context);
        if (status === BehaviorStatus.Running) {
            return BehaviorStatus.Running;
        }
        return BehaviorStatus.Failure;
    }
    reset() {
        this.child.reset();
    }
}
/**
 * Create an inverter decorator.
 */
export function createInverter(id, name, child) {
    return new Inverter(id, name, child);
}
/**
 * Create a succeeder decorator.
 */
export function createSucceeder(id, name, child) {
    return new Succeeder(id, name, child);
}
/**
 * Create a failure decorator.
 */
export function createFailureDecorator(id, name, child) {
    return new FailureDecorator(id, name, child);
}
//# sourceMappingURL=decorators.js.map