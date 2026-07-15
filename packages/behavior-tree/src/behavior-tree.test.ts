/**
 * Behavior Tree Tests
 *
 * Tests for behavior tree execution system
 * - Node execution (selector, sequence, action)
 * - State management
 * - Success/failure propagation
 * - Tree traversal and evaluation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

type NodeStatus = 'success' | 'failure' | 'running';

interface TreeNode {
  id: string;
  type: 'selector' | 'sequence' | 'action';
  children?: TreeNode[];
  execute?: () => NodeStatus;
}

interface ExecutionContext {
  nodeStates: Map<string, NodeStatus>;
  executionCount: number;
}

class MockBehaviorTree {
  private root: TreeNode;
  private context: ExecutionContext = {
    nodeStates: new Map(),
    executionCount: 0,
  };

  constructor(root: TreeNode) {
    this.root = root;
  }

  execute(): NodeStatus {
    return this.evaluateNode(this.root);
  }

  private evaluateNode(node: TreeNode): NodeStatus {
    this.context.executionCount++;

    if (node.type === 'action') {
      const status = node.execute?.() || 'success';
      this.context.nodeStates.set(node.id, status);
      return status;
    }

    if (node.type === 'sequence') {
      for (const child of node.children || []) {
        const status = this.evaluateNode(child);
        if (status !== 'success') {
          this.context.nodeStates.set(node.id, status);
          return status;
        }
      }
      this.context.nodeStates.set(node.id, 'success');
      return 'success';
    }

    if (node.type === 'selector') {
      for (const child of node.children || []) {
        const status = this.evaluateNode(child);
        if (status === 'success') {
          this.context.nodeStates.set(node.id, 'success');
          return 'success';
        }
      }
      this.context.nodeStates.set(node.id, 'failure');
      return 'failure';
    }

    return 'failure';
  }

  getNodeStatus(nodeId: string): NodeStatus | undefined {
    return this.context.nodeStates.get(nodeId);
  }

  getExecutionCount(): number {
    return this.context.executionCount;
  }

  getContext(): ExecutionContext {
    return {
      nodeStates: new Map(this.context.nodeStates),
      executionCount: this.context.executionCount,
    };
  }

  reset(): void {
    this.context.nodeStates.clear();
    this.context.executionCount = 0;
  }
}

describe('BehaviorTree', () => {
  let tree: MockBehaviorTree;

  describe('Action Nodes', () => {
    it('should execute action returning success', () => {
      const root: TreeNode = {
        id: 'action1',
        type: 'action',
        execute: () => 'success',
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
    });

    it('should execute action returning failure', () => {
      const root: TreeNode = {
        id: 'action1',
        type: 'action',
        execute: () => 'failure',
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('failure');
    });

    it('should track action execution', () => {
      const root: TreeNode = {
        id: 'action1',
        type: 'action',
        execute: () => 'success',
      };

      tree = new MockBehaviorTree(root);
      tree.execute();

      expect(tree.getExecutionCount()).toBe(1);
    });
  });

  describe('Sequence Nodes', () => {
    it('should execute all children on success', () => {
      const root: TreeNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          { id: 'a1', type: 'action', execute: () => 'success' },
          { id: 'a2', type: 'action', execute: () => 'success' },
          { id: 'a3', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
      expect(tree.getExecutionCount()).toBe(4); // seq + 3 actions
    });

    it('should stop on first failure', () => {
      const root: TreeNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          { id: 'a1', type: 'action', execute: () => 'success' },
          { id: 'a2', type: 'action', execute: () => 'failure' },
          { id: 'a3', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('failure');
      expect(tree.getNodeStatus('a3')).toBeUndefined(); // a3 not executed
    });

    it('should return failure if any child fails', () => {
      const root: TreeNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          { id: 'a1', type: 'action', execute: () => 'success' },
          { id: 'a2', type: 'action', execute: () => 'failure' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('failure');
    });
  });

  describe('Selector Nodes', () => {
    it('should return success on first success', () => {
      const root: TreeNode = {
        id: 'sel1',
        type: 'selector',
        children: [
          { id: 'a1', type: 'action', execute: () => 'failure' },
          { id: 'a2', type: 'action', execute: () => 'success' },
          { id: 'a3', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
      expect(tree.getNodeStatus('a3')).toBeUndefined(); // a3 not executed
    });

    it('should try all children until success', () => {
      const root: TreeNode = {
        id: 'sel1',
        type: 'selector',
        children: [
          { id: 'a1', type: 'action', execute: () => 'failure' },
          { id: 'a2', type: 'action', execute: () => 'failure' },
          { id: 'a3', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
      expect(tree.getExecutionCount()).toBe(4); // sel + a1, a2, a3
    });

    it('should return failure if all children fail', () => {
      const root: TreeNode = {
        id: 'sel1',
        type: 'selector',
        children: [
          { id: 'a1', type: 'action', execute: () => 'failure' },
          { id: 'a2', type: 'action', execute: () => 'failure' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('failure');
    });
  });

  describe('Composite Behaviors', () => {
    it('should handle nested sequences', () => {
      const root: TreeNode = {
        id: 'root',
        type: 'sequence',
        children: [
          {
            id: 'seq1',
            type: 'sequence',
            children: [
              { id: 'a1', type: 'action', execute: () => 'success' },
              { id: 'a2', type: 'action', execute: () => 'success' },
            ],
          },
          { id: 'a3', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
    });

    it('should handle nested selectors', () => {
      const root: TreeNode = {
        id: 'root',
        type: 'selector',
        children: [
          {
            id: 'sel1',
            type: 'selector',
            children: [
              { id: 'a1', type: 'action', execute: () => 'failure' },
              { id: 'a2', type: 'action', execute: () => 'success' },
            ],
          },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
    });

    it('should handle complex tree structure', () => {
      const root: TreeNode = {
        id: 'root',
        type: 'sequence',
        children: [
          {
            id: 'sel1',
            type: 'selector',
            children: [
              { id: 'a1', type: 'action', execute: () => 'failure' },
              { id: 'a2', type: 'action', execute: () => 'success' },
            ],
          },
          {
            id: 'seq1',
            type: 'sequence',
            children: [
              { id: 'a3', type: 'action', execute: () => 'success' },
              { id: 'a4', type: 'action', execute: () => 'success' },
            ],
          },
        ],
      };

      tree = new MockBehaviorTree(root);
      const status = tree.execute();

      expect(status).toBe('success');
    });
  });

  describe('State Tracking', () => {
    it('should track node execution states', () => {
      const root: TreeNode = {
        id: 'seq1',
        type: 'sequence',
        children: [
          { id: 'a1', type: 'action', execute: () => 'success' },
          { id: 'a2', type: 'action', execute: () => 'success' },
        ],
      };

      tree = new MockBehaviorTree(root);
      tree.execute();

      expect(tree.getNodeStatus('a1')).toBe('success');
      expect(tree.getNodeStatus('a2')).toBe('success');
    });

    it('should reset state', () => {
      const root: TreeNode = {
        id: 'action1',
        type: 'action',
        execute: () => 'success',
      };

      tree = new MockBehaviorTree(root);
      tree.execute();
      expect(tree.getExecutionCount()).toBe(1);

      tree.reset();
      expect(tree.getExecutionCount()).toBe(0);
      expect(tree.getNodeStatus('action1')).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should execute large tree efficiently', () => {
      const children = Array.from({ length: 100 }, (_, i) => ({
        id: `action${i}`,
        type: 'action' as const,
        execute: () => (i < 50 ? 'success' : 'failure'),
      }));

      const root: TreeNode = {
        id: 'selector',
        type: 'selector',
        children,
      };

      tree = new MockBehaviorTree(root);
      const start = Date.now();
      tree.execute();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should handle deep nesting', () => {
      let node: TreeNode = {
        id: 'leaf',
        type: 'action',
        execute: () => 'success',
      };

      for (let i = 0; i < 50; i++) {
        node = {
          id: `seq${i}`,
          type: 'sequence',
          children: [node],
        };
      }

      tree = new MockBehaviorTree(node);
      const start = Date.now();
      const status = tree.execute();
      const elapsed = Date.now() - start;

      expect(status).toBe('success');
      expect(elapsed).toBeLessThan(100);
    });
  });
});
