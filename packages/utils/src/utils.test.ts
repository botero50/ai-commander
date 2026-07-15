/**
 * Utility Functions Tests
 *
 * Tests for common utility functions
 * - Data transformations
 * - Array/object operations
 * - String manipulations
 * - Type conversions
 */

import { describe, it, expect, beforeEach } from 'vitest';

class UtilFunctions {
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  static deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  static flatten(arr: any[]): any[] {
    return arr.flat(Infinity);
  }

  static groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce((acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    }, {} as Record<string, T[]>);
  }

  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  static chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  static memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) return cache.get(key);
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  static debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
  ): T {
    let timeout: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    }) as T;
  }
}

describe('Utility Functions', () => {
  describe('deepClone', () => {
    it('should clone primitives', () => {
      expect(UtilFunctions.deepClone(42)).toBe(42);
      expect(UtilFunctions.deepClone('hello')).toBe('hello');
    });

    it('should clone objects', () => {
      const obj = { a: 1, b: 2 };
      const clone = UtilFunctions.deepClone(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const clone = UtilFunctions.deepClone(obj);

      expect(clone).toEqual(obj);
      clone.a.b.c = 999;
      expect(obj.a.b.c).toBe(1);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, [3, 4]];
      const clone = UtilFunctions.deepClone(arr);

      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
    });
  });

  describe('deepEqual', () => {
    it('should compare equal objects', () => {
      const a = { x: 1, y: 2 };
      const b = { x: 1, y: 2 };

      expect(UtilFunctions.deepEqual(a, b)).toBe(true);
    });

    it('should detect unequal objects', () => {
      const a = { x: 1 };
      const b = { x: 2 };

      expect(UtilFunctions.deepEqual(a, b)).toBe(false);
    });

    it('should compare nested structures', () => {
      const a = { a: { b: { c: 1 } } };
      const b = { a: { b: { c: 1 } } };

      expect(UtilFunctions.deepEqual(a, b)).toBe(true);
    });
  });

  describe('flatten', () => {
    it('should flatten arrays', () => {
      const arr = [1, [2, 3], [4, [5, 6]]];
      const flattened = UtilFunctions.flatten(arr);

      expect(flattened).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('should handle empty arrays', () => {
      expect(UtilFunctions.flatten([])).toEqual([]);
    });

    it('should flatten deeply nested', () => {
      const arr = [1, [2, [3, [4, [5]]]]];
      const flattened = UtilFunctions.flatten(arr);

      expect(flattened).toContain(5);
    });
  });

  describe('groupBy', () => {
    it('should group array by key', () => {
      const items = [
        { type: 'a', val: 1 },
        { type: 'b', val: 2 },
        { type: 'a', val: 3 },
      ];

      const grouped = UtilFunctions.groupBy(items, 'type');

      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });

    it('should handle missing keys', () => {
      const items: any[] = [{ x: 1 }, { x: 2 }, { y: 3 }];
      const grouped = UtilFunctions.groupBy(items, 'x' as any);

      expect(Object.keys(grouped).length).toBeGreaterThan(0);
    });
  });

  describe('unique', () => {
    it('should remove duplicates', () => {
      const arr = [1, 2, 2, 3, 3, 3, 4];
      const unique = UtilFunctions.unique(arr);

      expect(unique).toEqual([1, 2, 3, 4]);
    });

    it('should handle empty arrays', () => {
      expect(UtilFunctions.unique([])).toEqual([]);
    });

    it('should work with strings', () => {
      const arr = ['a', 'b', 'a', 'c'];
      const unique = UtilFunctions.unique(arr);

      expect(unique).toHaveLength(3);
    });
  });

  describe('chunk', () => {
    it('should chunk array', () => {
      const arr = [1, 2, 3, 4, 5];
      const chunks = UtilFunctions.chunk(arr, 2);

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1, 2]);
      expect(chunks[2]).toEqual([5]);
    });

    it('should handle even division', () => {
      const arr = [1, 2, 3, 4];
      const chunks = UtilFunctions.chunk(arr, 2);

      expect(chunks).toHaveLength(2);
      expect(chunks.every(c => c.length === 2)).toBe(true);
    });

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3];
      const chunks = UtilFunctions.chunk(arr, 10);

      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });
  });

  describe('memoize', () => {
    it('should cache function results', () => {
      let callCount = 0;
      const add = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoized = UtilFunctions.memoize(add);

      memoized(1, 2);
      memoized(1, 2);
      memoized(1, 2);

      expect(callCount).toBe(1);
    });

    it('should distinguish different arguments', () => {
      let callCount = 0;
      const fn = (x: number) => {
        callCount++;
        return x * 2;
      };

      const memoized = UtilFunctions.memoize(fn);

      memoized(5);
      memoized(10);
      memoized(5);

      expect(callCount).toBe(2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      let callCount = 0;
      const fn = () => callCount++;
      const debounced = UtilFunctions.debounce(fn, 50);

      debounced();
      debounced();
      debounced();

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(callCount).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle large clones', () => {
      const large = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: { value: i * 2 },
      }));

      const start = Date.now();
      const clone = UtilFunctions.deepClone(large);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(clone).toHaveLength(10000);
    });

    it('should flatten large arrays quickly', () => {
      const large = Array.from({ length: 100 }, (_, i) =>
        Array.from({ length: 100 }, (_, j) => i * 100 + j)
      );

      const start = Date.now();
      const flattened = UtilFunctions.flatten(large);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(flattened).toHaveLength(10000);
    });
  });
});
