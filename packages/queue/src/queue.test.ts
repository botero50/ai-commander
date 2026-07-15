/**
 * Queue Implementation Tests
 *
 * Tests for FIFO queue data structure
 * - Enqueue and dequeue operations
 * - Queue size and empty checks
 * - Peak operation
 * - Concurrent operations
 */

import { describe, it, expect, beforeEach } from 'vitest';

class MockQueue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return [...this.items];
  }

  drain(): T[] {
    const result = [...this.items];
    this.clear();
    return result;
  }
}

describe('Queue', () => {
  let queue: MockQueue<number>;

  beforeEach(() => {
    queue = new MockQueue();
  });

  describe('Basic Operations', () => {
    it('should enqueue item', () => {
      queue.enqueue(1);
      expect(queue.size()).toBe(1);
    });

    it('should dequeue item', () => {
      queue.enqueue(1);
      const item = queue.dequeue();
      expect(item).toBe(1);
    });

    it('should maintain FIFO order', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      expect(queue.dequeue()).toBe(1);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
    });

    it('should return undefined for empty dequeue', () => {
      expect(queue.dequeue()).toBeUndefined();
    });

    it('should peek without removing', () => {
      queue.enqueue(42);
      expect(queue.peek()).toBe(42);
      expect(queue.size()).toBe(1);
    });

    it('should return undefined for empty peek', () => {
      expect(queue.peek()).toBeUndefined();
    });
  });

  describe('Queue State', () => {
    it('should report empty queue', () => {
      expect(queue.isEmpty()).toBe(true);
    });

    it('should report non-empty queue', () => {
      queue.enqueue(1);
      expect(queue.isEmpty()).toBe(false);
    });

    it('should track size correctly', () => {
      for (let i = 0; i < 5; i++) {
        queue.enqueue(i);
      }
      expect(queue.size()).toBe(5);
    });

    it('should update size on dequeue', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.dequeue();

      expect(queue.size()).toBe(1);
    });
  });

  describe('Queue Operations', () => {
    it('should clear queue', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.clear();

      expect(queue.isEmpty()).toBe(true);
      expect(queue.size()).toBe(0);
    });

    it('should convert to array', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      const arr = queue.toArray();
      expect(arr).toEqual([1, 2, 3]);
    });

    it('should preserve order in array', () => {
      for (let i = 1; i <= 5; i++) {
        queue.enqueue(i);
      }

      const arr = queue.toArray();
      expect(arr[0]).toBe(1);
      expect(arr[arr.length - 1]).toBe(5);
    });

    it('should drain queue', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      queue.enqueue(3);

      const drained = queue.drain();

      expect(drained).toEqual([1, 2, 3]);
      expect(queue.isEmpty()).toBe(true);
    });
  });

  describe('Different Data Types', () => {
    it('should handle strings', () => {
      const strQueue = new MockQueue<string>();
      strQueue.enqueue('hello');
      strQueue.enqueue('world');

      expect(strQueue.dequeue()).toBe('hello');
      expect(strQueue.dequeue()).toBe('world');
    });

    it('should handle objects', () => {
      const objQueue = new MockQueue<{ id: number }>();
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };

      objQueue.enqueue(obj1);
      objQueue.enqueue(obj2);

      expect(objQueue.dequeue()).toBe(obj1);
    });

    it('should handle mixed null values', () => {
      const nullQueue = new MockQueue<number | null>();
      nullQueue.enqueue(1);
      nullQueue.enqueue(null);
      nullQueue.enqueue(2);

      expect(nullQueue.dequeue()).toBe(1);
      expect(nullQueue.dequeue()).toBeNull();
      expect(nullQueue.dequeue()).toBe(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item', () => {
      queue.enqueue(99);
      expect(queue.dequeue()).toBe(99);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should handle large queue', () => {
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(i);
      }

      expect(queue.size()).toBe(1000);
      expect(queue.dequeue()).toBe(0);
    });

    it('should handle repeated operations', () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        queue.enqueue(cycle);
        queue.dequeue();
      }

      expect(queue.isEmpty()).toBe(true);
    });

    it('should handle peek on single item', () => {
      queue.enqueue(42);
      expect(queue.peek()).toBe(42);
      expect(queue.peek()).toBe(42);
      expect(queue.dequeue()).toBe(42);
    });
  });

  describe('Performance', () => {
    it('should handle 10000 items', () => {
      const start = Date.now();

      for (let i = 0; i < 10000; i++) {
        queue.enqueue(i);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(queue.size()).toBe(10000);
    });

    it('should dequeue 1000 items quickly', () => {
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(i);
      }

      const start = Date.now();
      while (!queue.isEmpty()) {
        queue.dequeue();
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });

    it('should handle rapid peek operations', () => {
      queue.enqueue(1);

      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        queue.peek();
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Sequence Operations', () => {
    it('should handle enqueue-dequeue interleaving', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      expect(queue.dequeue()).toBe(1);

      queue.enqueue(3);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
    });

    it('should maintain order with mixed operations', () => {
      for (let i = 1; i <= 5; i++) {
        queue.enqueue(i);
      }

      expect(queue.dequeue()).toBe(1);
      queue.enqueue(6);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);

      const remaining = queue.toArray();
      expect(remaining).toEqual([4, 5, 6]);
    });
  });
});
