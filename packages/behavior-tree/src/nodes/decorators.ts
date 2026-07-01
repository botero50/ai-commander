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
export class Inverter implements DecoratorNode {
  readonly id: string;
  readonly name: string;
  readonly child: BehaviorNode;

  constructor(id: string, name: string, child: BehaviorNode) {
    this.id = id;
    this.name = name;
    this.child = child;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    const status = await this.child.execute(context);

    if (status === BehaviorStatus.Running) {
      return BehaviorStatus.Running;
    }

    return status === BehaviorStatus.Success ? BehaviorStatus.Failure : BehaviorStatus.Success;
  }

  reset(): void {
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
export class Succeeder implements DecoratorNode {
  readonly id: string;
  readonly name: string;
  readonly child: BehaviorNode;

  constructor(id: string, name: string, child: BehaviorNode) {
    this.id = id;
    this.name = name;
    this.child = child;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    const status = await this.child.execute(context);

    if (status === BehaviorStatus.Running) {
      return BehaviorStatus.Running;
    }

    return BehaviorStatus.Success;
  }

  reset(): void {
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
export class FailureDecorator implements DecoratorNode {
  readonly id: string;
  readonly name: string;
  readonly child: BehaviorNode;

  constructor(id: string, name: string, child: BehaviorNode) {
    this.id = id;
    this.name = name;
    this.child = child;
  }

  async execute(context: BehaviorContext): Promise<BehaviorStatus> {
    const status = await this.child.execute(context);

    if (status === BehaviorStatus.Running) {
      return BehaviorStatus.Running;
    }

    return BehaviorStatus.Failure;
  }

  reset(): void {
    this.child.reset();
  }
}

/**
 * Create an inverter decorator.
 */
export function createInverter(id: string, name: string, child: BehaviorNode): Inverter {
  return new Inverter(id, name, child);
}

/**
 * Create a succeeder decorator.
 */
export function createSucceeder(id: string, name: string, child: BehaviorNode): Succeeder {
  return new Succeeder(id, name, child);
}

/**
 * Create a failure decorator.
 */
export function createFailureDecorator(
  id: string,
  name: string,
  child: BehaviorNode
): FailureDecorator {
  return new FailureDecorator(id, name, child);
}
