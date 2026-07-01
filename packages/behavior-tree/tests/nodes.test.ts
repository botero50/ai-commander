import { describe, it, expect } from 'vitest';
import {
  BehaviorStatus,
  createBehaviorContext,
  createActionNode,
  createConditionNode,
  createSequence,
  createSelector,
  createInverter,
  createSucceeder,
  createFailureDecorator,
} from '../src/index.js';

describe('Behavior Tree Nodes', () => {
  describe('ActionNode', () => {
    it('should execute action and return success', async () => {
      const node = createActionNode('test', 'Test Action', async () => 'success');
      const context = createBehaviorContext();

      const status = await node.execute(context);
      expect(status).toBe('success');
    });

    it('should execute action and return failure', async () => {
      const node = createActionNode('test', 'Test Action', async () => 'failure');
      const context = createBehaviorContext();

      const status = await node.execute(context);
      expect(status).toBe('failure');
    });

    it('should execute action and return running', async () => {
      const node = createActionNode('test', 'Test Action', async () => 'running');
      const context = createBehaviorContext();

      const status = await node.execute(context);
      expect(status).toBe('running');
    });

    it('should have access to context data', async () => {
      let receivedData: Record<string, unknown> | null = null;

      const node = createActionNode('test', 'Test', async (context) => {
        receivedData = context.data;
        return 'success';
      });

      const context = createBehaviorContext({ value: 42 });
      await node.execute(context);

      expect(receivedData).toEqual({ value: 42 });
    });
  });

  describe('ConditionNode', () => {
    it('should return success if predicate is true', async () => {
      const node = createConditionNode('test', 'Check', () => true);
      const context = createBehaviorContext();

      const status = await node.execute(context);
      expect(status).toBe('success');
    });

    it('should return failure if predicate is false', async () => {
      const node = createConditionNode('test', 'Check', () => false);
      const context = createBehaviorContext();

      const status = await node.execute(context);
      expect(status).toBe('failure');
    });

    it('should have access to context data', async () => {
      const node = createConditionNode('test', 'Check', (context) => {
        const value = context.data.value as number;
        return value > 10;
      });

      const context = createBehaviorContext({ value: 42 });
      const status = await node.execute(context);

      expect(status).toBe('success');
    });
  });

  describe('Sequence', () => {
    it('should succeed when all children succeed', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => true);
      const node2 = createConditionNode('2', 'Check 2', () => true);
      const sequence = createSequence('seq', 'All Succeed', [node1, node2]);

      const context = createBehaviorContext();
      const status = await sequence.execute(context);

      expect(status).toBe('success');
    });

    it('should fail if first child fails', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => false);
      const node2 = createConditionNode('2', 'Check 2', () => true);
      const sequence = createSequence('seq', 'First Fails', [node1, node2]);

      const context = createBehaviorContext();
      const status = await sequence.execute(context);

      expect(status).toBe('failure');
    });

    it('should fail if second child fails', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => true);
      const node2 = createConditionNode('2', 'Check 2', () => false);
      const sequence = createSequence('seq', 'Second Fails', [node1, node2]);

      const context = createBehaviorContext();
      const status = await sequence.execute(context);

      expect(status).toBe('failure');
    });

    it('should return running if child returns running', async () => {
      const node1 = createActionNode('1', 'Running', async () => 'running');
      const node2 = createConditionNode('2', 'Check 2', () => true);
      const sequence = createSequence('seq', 'With Running', [node1, node2]);

      const context = createBehaviorContext();
      const status = await sequence.execute(context);

      expect(status).toBe('running');
    });

    it('should resume from running child on next execution', async () => {
      const order: string[] = [];

      const node1 = createActionNode('1', 'Log 1', async () => {
        order.push('1');
        return 'success';
      });
      const node2 = createActionNode('2', 'Running', async () => {
        order.push('2');
        return 'running';
      });
      const node3 = createActionNode('3', 'Log 3', async () => {
        order.push('3');
        return 'success';
      });

      const sequence = createSequence('seq', 'Resume', [node1, node2, node3]);
      const context = createBehaviorContext();

      // First execution
      const status1 = await sequence.execute(context);
      expect(status1).toBe('running');
      expect(order).toEqual(['1', '2']);

      // Second execution (should resume from node2)
      order.length = 0;
      const status2 = await sequence.execute(context);
      expect(status2).toBe('running');
      expect(order).toEqual(['2']);
    });
  });

  describe('Selector', () => {
    it('should succeed if first child succeeds', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => true);
      const node2 = createConditionNode('2', 'Check 2', () => false);
      const selector = createSelector('sel', 'First Succeeds', [node1, node2]);

      const context = createBehaviorContext();
      const status = await selector.execute(context);

      expect(status).toBe('success');
    });

    it('should succeed if second child succeeds', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => false);
      const node2 = createConditionNode('2', 'Check 2', () => true);
      const selector = createSelector('sel', 'Second Succeeds', [node1, node2]);

      const context = createBehaviorContext();
      const status = await selector.execute(context);

      expect(status).toBe('success');
    });

    it('should fail if all children fail', async () => {
      const node1 = createConditionNode('1', 'Check 1', () => false);
      const node2 = createConditionNode('2', 'Check 2', () => false);
      const selector = createSelector('sel', 'All Fail', [node1, node2]);

      const context = createBehaviorContext();
      const status = await selector.execute(context);

      expect(status).toBe('failure');
    });

    it('should return running if child returns running', async () => {
      const node1 = createActionNode('1', 'Running', async () => 'running');
      const node2 = createConditionNode('2', 'Check 2', () => true);
      const selector = createSelector('sel', 'With Running', [node1, node2]);

      const context = createBehaviorContext();
      const status = await selector.execute(context);

      expect(status).toBe('running');
    });
  });

  describe('Inverter', () => {
    it('should invert success to failure', async () => {
      const node = createConditionNode('test', 'True', () => true);
      const inverter = createInverter('inv', 'Invert', node);

      const context = createBehaviorContext();
      const status = await inverter.execute(context);

      expect(status).toBe('failure');
    });

    it('should invert failure to success', async () => {
      const node = createConditionNode('test', 'False', () => false);
      const inverter = createInverter('inv', 'Invert', node);

      const context = createBehaviorContext();
      const status = await inverter.execute(context);

      expect(status).toBe('success');
    });

    it('should not invert running', async () => {
      const node = createActionNode('test', 'Running', async () => 'running');
      const inverter = createInverter('inv', 'Invert', node);

      const context = createBehaviorContext();
      const status = await inverter.execute(context);

      expect(status).toBe('running');
    });
  });

  describe('Succeeder', () => {
    it('should return success even if child fails', async () => {
      const node = createConditionNode('test', 'False', () => false);
      const succeeder = createSucceeder('succ', 'Always Succeed', node);

      const context = createBehaviorContext();
      const status = await succeeder.execute(context);

      expect(status).toBe('success');
    });

    it('should return success if child succeeds', async () => {
      const node = createConditionNode('test', 'True', () => true);
      const succeeder = createSucceeder('succ', 'Always Succeed', node);

      const context = createBehaviorContext();
      const status = await succeeder.execute(context);

      expect(status).toBe('success');
    });

    it('should not affect running', async () => {
      const node = createActionNode('test', 'Running', async () => 'running');
      const succeeder = createSucceeder('succ', 'Always Succeed', node);

      const context = createBehaviorContext();
      const status = await succeeder.execute(context);

      expect(status).toBe('running');
    });
  });

  describe('FailureDecorator', () => {
    it('should return failure even if child succeeds', async () => {
      const node = createConditionNode('test', 'True', () => true);
      const failure = createFailureDecorator('fail', 'Always Fail', node);

      const context = createBehaviorContext();
      const status = await failure.execute(context);

      expect(status).toBe('failure');
    });

    it('should return failure if child fails', async () => {
      const node = createConditionNode('test', 'False', () => false);
      const failure = createFailureDecorator('fail', 'Always Fail', node);

      const context = createBehaviorContext();
      const status = await failure.execute(context);

      expect(status).toBe('failure');
    });

    it('should not affect running', async () => {
      const node = createActionNode('test', 'Running', async () => 'running');
      const failure = createFailureDecorator('fail', 'Always Fail', node);

      const context = createBehaviorContext();
      const status = await failure.execute(context);

      expect(status).toBe('running');
    });
  });
});
