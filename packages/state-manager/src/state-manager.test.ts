/**
 * State Manager Tests
 *
 * Tests for application state management
 * - State initialization and snapshots
 * - State mutations and rollback
 * - Change tracking and subscriptions
 * - Memory efficiency
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface StateSnapshot {
  version: number;
  timestamp: number;
  data: Record<string, unknown>;
}

interface StateChange {
  timestamp: number;
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

class MockStateManager {
  private state: Record<string, unknown> = {};
  private history: StateSnapshot[] = [];
  private version = 0;
  private changes: StateChange[] = [];
  private subscribers: Set<(state: Record<string, unknown>) => void> = new Set();

  setState(key: string, value: unknown): void {
    const oldValue = this.state[key];
    this.state[key] = value;

    if (oldValue !== value) {
      this.changes.push({
        timestamp: Date.now(),
        path: key,
        oldValue,
        newValue: value,
      });
    }

    this.notifySubscribers();
  }

  getState(key?: string): unknown {
    if (key) return this.state[key];
    return { ...this.state };
  }

  snapshot(): StateSnapshot {
    const snap: StateSnapshot = {
      version: this.version++,
      timestamp: Date.now(),
      data: { ...this.state },
    };
    this.history.push(snap);
    return snap;
  }

  restore(snapshot: StateSnapshot): void {
    this.state = { ...snapshot.data };
    this.notifySubscribers();
  }

  subscribe(callback: (state: Record<string, unknown>) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notifySubscribers(): void {
    for (const sub of this.subscribers) {
      sub({ ...this.state });
    }
  }

  getHistory(): StateSnapshot[] {
    return [...this.history];
  }

  getChanges(): StateChange[] {
    return [...this.changes];
  }

  getVersion(): number {
    return this.version;
  }

  clear(): void {
    this.state = {};
    this.changes = [];
    this.notifySubscribers();
  }

  rollback(steps: number = 1): boolean {
    if (steps <= 0 || steps > this.history.length) return false;

    const targetIndex = this.history.length - steps;
    const snapshot = this.history[targetIndex];
    this.restore(snapshot);
    return true;
  }
}

describe('StateManager', () => {
  let manager: MockStateManager;

  beforeEach(() => {
    manager = new MockStateManager();
  });

  describe('State Management', () => {
    it('should set state', () => {
      manager.setState('count', 5);
      expect(manager.getState('count')).toBe(5);
    });

    it('should get full state', () => {
      manager.setState('a', 1);
      manager.setState('b', 2);

      const state = manager.getState() as Record<string, unknown>;
      expect(state.a).toBe(1);
      expect(state.b).toBe(2);
    });

    it('should update existing state', () => {
      manager.setState('value', 10);
      manager.setState('value', 20);

      expect(manager.getState('value')).toBe(20);
    });

    it('should handle multiple keys', () => {
      for (let i = 0; i < 10; i++) {
        manager.setState(`key${i}`, i);
      }

      for (let i = 0; i < 10; i++) {
        expect(manager.getState(`key${i}`)).toBe(i);
      }
    });
  });

  describe('Snapshots', () => {
    it('should create snapshot', () => {
      manager.setState('x', 100);
      const snap = manager.snapshot();

      expect(snap.version).toBe(0);
      expect((snap.data as Record<string, unknown>).x).toBe(100);
    });

    it('should increment version', () => {
      manager.snapshot();
      manager.snapshot();
      manager.snapshot();

      expect(manager.getVersion()).toBe(3);
    });

    it('should preserve snapshot data', () => {
      manager.setState('prop', 'value');
      const snap1 = manager.snapshot();

      manager.setState('prop', 'changed');
      const snap2 = manager.snapshot();

      expect((snap1.data as Record<string, unknown>).prop).toBe('value');
      expect((snap2.data as Record<string, unknown>).prop).toBe('changed');
    });

    it('should restore from snapshot', () => {
      manager.setState('a', 1);
      const snap = manager.snapshot();

      manager.setState('a', 999);
      manager.restore(snap);

      expect(manager.getState('a')).toBe(1);
    });
  });

  describe('Change Tracking', () => {
    it('should track state changes', () => {
      manager.setState('count', 0);
      manager.setState('count', 1);

      const changes = manager.getChanges();
      expect(changes.length).toBeGreaterThan(0);
    });

    it('should record old and new values', () => {
      manager.setState('value', 'old');
      manager.setState('value', 'new');

      const changes = manager.getChanges();
      const lastChange = changes[changes.length - 1];

      expect(lastChange.oldValue).toBe('old');
      expect(lastChange.newValue).toBe('new');
    });

    it('should skip unchanged values', () => {
      manager.setState('x', 5);
      const initialCount = manager.getChanges().length;

      manager.setState('x', 5); // Same value
      const finalCount = manager.getChanges().length;

      expect(finalCount).toBe(initialCount);
    });

    it('should track change path', () => {
      manager.setState('user.name', 'Alice');

      const changes = manager.getChanges();
      expect(changes[changes.length - 1].path).toBe('user.name');
    });
  });

  describe('Subscriptions', () => {
    it('should notify on state change', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setState('key', 'value');

      expect(callback).toHaveBeenCalled();
    });

    it('should pass updated state to subscriber', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      manager.setState('count', 42);

      const state = callback.mock.calls[0][0] as Record<string, unknown>;
      expect(state.count).toBe(42);
    });

    it('should support multiple subscribers', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      manager.subscribe(cb1);
      manager.subscribe(cb2);

      manager.setState('x', 10);

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });

    it('should unsubscribe', () => {
      const callback = vi.fn();
      const unsubscribe = manager.subscribe(callback);

      manager.setState('a', 1);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();
      manager.setState('a', 2);
      expect(callback).toHaveBeenCalledTimes(1); // Not called again
    });
  });

  describe('Rollback', () => {
    it('should rollback one step', () => {
      manager.setState('value', 1);
      manager.snapshot();

      manager.setState('value', 2);
      manager.snapshot();

      expect(manager.getState('value')).toBe(2);
      manager.rollback(1);
      expect(manager.getState('value')).toBe(1);
    });

    it('should rollback multiple steps', () => {
      manager.setState('x', 1);
      manager.snapshot();
      manager.setState('x', 2);
      manager.snapshot();
      manager.setState('x', 3);
      manager.snapshot();

      manager.rollback(2);
      expect(manager.getState('x')).toBe(1);
    });

    it('should not rollback beyond history', () => {
      manager.setState('x', 1);
      manager.snapshot();

      const result = manager.rollback(10);
      expect(result).toBe(false);
    });
  });

  describe('History', () => {
    it('should track snapshot history', () => {
      manager.snapshot();
      manager.snapshot();
      manager.snapshot();

      const history = manager.getHistory();
      expect(history).toHaveLength(3);
    });

    it('should maintain chronological order', () => {
      manager.setState('step', 1);
      const snap1 = manager.snapshot();

      manager.setState('step', 2);
      const snap2 = manager.snapshot();

      const history = manager.getHistory();
      expect(history[0].version).toBe(snap1.version);
      expect(history[1].version).toBe(snap2.version);
    });
  });

  describe('Performance', () => {
    it('should handle rapid state changes', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        manager.setState(`key${i}`, i);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('should snapshot efficiently', () => {
      for (let i = 0; i < 100; i++) {
        manager.setState(`key${i}`, i);
      }

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        manager.snapshot();
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });

    it('should handle many subscribers', () => {
      const subscribers = Array.from({ length: 100 }, () => vi.fn());
      subscribers.forEach(cb => manager.subscribe(cb));

      const start = Date.now();
      manager.setState('key', 'value');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null values', () => {
      manager.setState('nullable', null);
      expect(manager.getState('nullable')).toBeNull();
    });

    it('should handle undefined values', () => {
      manager.setState('optional', undefined);
      expect(manager.getState('optional')).toBeUndefined();
    });

    it('should clear all state', () => {
      manager.setState('a', 1);
      manager.setState('b', 2);
      manager.clear();

      const state = manager.getState() as Record<string, unknown>;
      expect(Object.keys(state)).toHaveLength(0);
    });
  });
});
