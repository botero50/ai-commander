import { describe, it, expect } from 'vitest';
import {
  createBehaviorTree,
  createBehaviorContext,
  createSequence,
  createSelector,
  createConditionNode,
  createActionNode,
  createInverter,
} from '../src/index.js';

describe('BehaviorTree', () => {
  it('should execute root node on tick', async () => {
    const root = createSequence('root', 'Root', [createConditionNode('1', 'True', () => true)]);

    const tree = createBehaviorTree('tree', 'Test Tree', root);
    const context = createBehaviorContext();

    const status = await tree.tick(context);
    expect(status).toBe('success');
  });

  it('should support complex nested trees', async () => {
    const check1 = createConditionNode('1', 'Check 1', () => true);
    const check2 = createConditionNode('2', 'Check 2', () => true);
    const innerSeq = createSequence('inner', 'Inner', [check1, check2]);

    const check3 = createConditionNode('3', 'Check 3', () => true);
    const root = createSequence('root', 'Root', [innerSeq, check3]);

    const tree = createBehaviorTree('tree', 'Nested Tree', root);
    const context = createBehaviorContext();

    const status = await tree.tick(context);
    expect(status).toBe('success');
  });

  it('should support selector/sequence combinations', async () => {
    const option1 = createConditionNode('1', 'Check 1', () => false);
    const option2 = createConditionNode('2', 'Check 2', () => true);
    const selector = createSelector('sel', 'Choose Option', [option1, option2]);

    const action = createActionNode('act', 'Do Something', async () => 'success');
    const root = createSequence('root', 'Root', [selector, action]);

    const tree = createBehaviorTree('tree', 'Selector+Sequence', root);
    const context = createBehaviorContext();

    const status = await tree.tick(context);
    expect(status).toBe('success');
  });

  it('should pass context through tree', async () => {
    const values: number[] = [];

    const collect = createActionNode('collect', 'Collect', async (context) => {
      values.push(context.data.value as number);
      return 'success';
    });

    const check = createConditionNode('check', 'Check', (context) => {
      return (context.data.value as number) > 10;
    });

    const root = createSequence('root', 'Root', [collect, check]);
    const tree = createBehaviorTree('tree', 'Context Tree', root);

    const context = createBehaviorContext({ value: 42 });
    const status = await tree.tick(context);

    expect(status).toBe('success');
    expect(values).toEqual([42]);
  });

  it('should support deterministic execution', async () => {
    const results1: string[] = [];
    const results2: string[] = [];

    const action1 = createActionNode('a1', 'Action 1', async () => {
      results1.push('1');
      return 'success';
    });
    const action2 = createActionNode('a2', 'Action 2', async () => {
      results1.push('2');
      return 'success';
    });
    const action3 = createActionNode('a3', 'Action 3', async () => {
      results1.push('3');
      return 'success';
    });

    const root1 = createSequence('root', 'Seq', [action1, action2, action3]);
    const tree1 = createBehaviorTree('tree1', 'Tree 1', root1);

    // Run tree 1
    const context1 = createBehaviorContext();
    await tree1.tick(context1);

    // Run tree 2 with same structure
    const action4 = createActionNode('a1', 'Action 1', async () => {
      results2.push('1');
      return 'success';
    });
    const action5 = createActionNode('a2', 'Action 2', async () => {
      results2.push('2');
      return 'success';
    });
    const action6 = createActionNode('a3', 'Action 3', async () => {
      results2.push('3');
      return 'success';
    });

    const root2 = createSequence('root', 'Seq', [action4, action5, action6]);
    const tree2 = createBehaviorTree('tree2', 'Tree 2', root2);

    const context2 = createBehaviorContext();
    await tree2.tick(context2);

    // Both should execute in same order
    expect(results1).toEqual(results2);
    expect(results1).toEqual(['1', '2', '3']);
  });

  it('should reset tree state', async () => {
    let runCount = 0;

    const action = createActionNode('act', 'Count', async () => {
      runCount++;
      return 'running';
    });

    const root = createSequence('root', 'Root', [action]);
    const tree = createBehaviorTree('tree', 'Reset Tree', root);
    const context = createBehaviorContext();

    // First tick
    const status1 = await tree.tick(context);
    expect(status1).toBe('running');
    expect(runCount).toBe(1);

    // Reset
    tree.reset();

    // Second tick should be fresh
    const status2 = await tree.tick(context);
    expect(status2).toBe('running');
    expect(runCount).toBe(2);
  });

  it('should handle complex decision logic', async () => {
    // Decide between two strategies
    const strategy1Ready = createConditionNode('s1Ready', 'Is S1 Ready', () => false);
    const doStrategy1 = createActionNode('s1Do', 'Do S1', async () => 'success');
    const strategy1 = createSequence('strat1', 'Strategy 1', [strategy1Ready, doStrategy1]);

    const strategy2Ready = createConditionNode('s2Ready', 'Is S2 Ready', () => true);
    const doStrategy2 = createActionNode('s2Do', 'Do S2', async () => 'success');
    const strategy2 = createSequence('strat2', 'Strategy 2', [strategy2Ready, doStrategy2]);

    const chooseStrategy = createSelector('choose', 'Choose', [strategy1, strategy2]);

    const cleanup = createActionNode('cleanup', 'Cleanup', async () => 'success');

    const root = createSequence('root', 'Root', [chooseStrategy, cleanup]);
    const tree = createBehaviorTree('tree', 'Decision Tree', root);

    const context = createBehaviorContext();
    const status = await tree.tick(context);

    expect(status).toBe('success');
  });
});
