// Types
export { BehaviorStatus, createBehaviorContext } from './types.js';
export type { BehaviorContext } from './types.js';

// Behavior Tree
export { createBehaviorTree } from './behavior-tree.js';
export type { BehaviorTree } from './behavior-tree.js';

// Node contracts
export type {
  BehaviorNode,
  CompositeNode,
  DecoratorNode,
  LeafNode,
  ActionNode,
  ConditionNode,
} from './nodes/behavior-node.js';

// Composite nodes
export { createSequence } from './nodes/sequence.js';
export { createSelector } from './nodes/selector.js';

// Decorators
export {
  Inverter,
  Succeeder,
  FailureDecorator,
  createInverter,
  createSucceeder,
  createFailureDecorator,
} from './nodes/decorators.js';

// Leaf nodes
export {
  SimpleActionNode,
  SimpleConditionNode,
  createActionNode,
  createConditionNode,
} from './nodes/leaf-nodes.js';
