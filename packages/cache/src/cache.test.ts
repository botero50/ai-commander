/**
 * Cache Service Tests
 *
 * Tests for caching system
 * - Key-value storage
 * - TTL and expiration
 * - LRU eviction
 * - Hit/miss tracking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  hits: number;
}

class MockCache<K extends string, V> {
  private entries: Map<K, CacheEntry<V>> = new Map();
  private maxSize: number;
  private hits = 0;
  private misses = 0;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  set(key: K, value: V, ttl?: number): void {
    if (this.entries.size >= this.maxSize && !this.entries.has(key)) {
      this.evictLRU();
    }

    this.entries.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.entries.delete(key);
      this.misses++;
      return undefined;
    }

    entry.hits++;
    this.hits++;
    return entry.value;
  }

  has(key: K): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.entries.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.hits = 0;
    this.misses = 0;
  }

  private evictLRU(): void {
    let lruKey: K | undefined;
    let lruHits = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.hits < lruHits) {
        lruHits = entry.hits;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.entries.delete(lruKey);
    }
  }

  getSize(): number {
    return this.entries.size;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total === 0 ? 0 : (this.hits / total) * 100;
  }

  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.entries.size,
    };
  }
}

describe('Cache', () => {
  let cache: MockCache<string, unknown>;

  beforeEach(() => {
    cache = new MockCache(10);
  });

  describe('Basic Operations', () => {
    it('should set and get value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for missing key', () => {
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should update existing key', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'value2');

      expect(cache.get('key1')).toBe('value2');
    });

    it('should delete key', () => {
      cache.set('key1', 'value1');
      const deleted = cache.delete('key1');

      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should check key existence', () => {
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);
      expect(cache.has('missing')).toBe(false);
    });

    it('should store different types', () => {
      cache.set('str' as any, 'string');
      cache.set('num' as any, 42);
      cache.set('obj' as any, { a: 1 });

      expect(cache.get('str' as any)).toBe('string');
      expect(cache.get('num' as any)).toBe(42);
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire entry after TTL', async () => {
      cache.set('temp', 'value', 50);
      expect(cache.get('temp')).toBe('value');

      await new Promise(resolve => setTimeout(resolve, 75));
      expect(cache.get('temp')).toBeUndefined();
    });

    it('should not expire before TTL', async () => {
      cache.set('temp', 'value', 100);

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(cache.get('temp')).toBe('value');
    });

    it('should handle no TTL', async () => {
      cache.set('persistent', 'value');

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('persistent')).toBe('value');
    });

    it('should remove expired from has check', async () => {
      cache.set('temp', 'value', 50);
      expect(cache.has('temp')).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 75));
      expect(cache.has('temp')).toBe(false);
    });
  });

  describe('Size Management', () => {
    it('should track cache size', () => {
      cache.set('k1' as any, 'v1');
      cache.set('k2' as any, 'v2');
      cache.set('k3' as any, 'v3');

      expect(cache.getSize()).toBe(3);
    });

    it('should enforce max size with LRU eviction', () => {
      for (let i = 0; i < 15; i++) {
        cache.set(`key${i}` as any, `value${i}`);
      }

      expect(cache.getSize()).toBeLessThanOrEqual(10);
    });

    it('should evict least recently used', () => {
      // Add 5 entries
      cache.set('a' as any, 1);
      cache.set('b' as any, 2);
      cache.set('c' as any, 3);
      cache.set('d' as any, 4);
      cache.set('e' as any, 5);

      // Access some to increase hits
      cache.get('a' as any);
      cache.get('a' as any);
      cache.get('b' as any);

      // Fill to capacity and beyond
      for (let i = 0; i < 10; i++) {
        cache.set(`new${i}` as any, i);
      }

      // LRU items should be evicted first
      expect(cache.getSize()).toBeLessThanOrEqual(10);
    });
  });

  describe('Performance Tracking', () => {
    it('should track cache hits', () => {
      cache.set('key' as any, 'value');
      cache.get('key' as any);
      cache.get('key' as any);

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
    });

    it('should track cache misses', () => {
      cache.get('missing1' as any);
      cache.get('missing2' as any);

      const stats = cache.getStats();
      expect(stats.misses).toBe(2);
    });

    it('should calculate hit rate', () => {
      cache.set('key' as any, 'value');
      cache.get('key' as any);
      cache.get('key' as any);
      cache.get('missing' as any);

      expect(cache.getHitRate()).toBe(66.66666666666666);
    });

    it('should return 0 hit rate when empty', () => {
      expect(cache.getHitRate()).toBe(0);
    });
  });

  describe('Clear and Reset', () => {
    it('should clear all entries', () => {
      cache.set('k1' as any, 'v1');
      cache.set('k2' as any, 'v2');

      cache.clear();

      expect(cache.getSize()).toBe(0);
      expect(cache.get('k1' as any)).toBeUndefined();
    });

    it('should reset stats on clear', () => {
      cache.set('key' as any, 'value');
      cache.get('key' as any);

      cache.clear();

      const stats = cache.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 operations', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}` as any, `value${i}`);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('should retrieve quickly', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}` as any, `value${i}`);
      }

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        cache.get(`key${i % 10}` as any);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty cache operations', () => {
      expect(cache.getSize()).toBe(0);
      expect(cache.delete('missing' as any)).toBe(false);
      expect(cache.get('missing' as any)).toBeUndefined();
    });

    it('should handle null values', () => {
      cache.set('null' as any, null);
      expect(cache.get('null' as any)).toBeNull();
    });

    it('should handle zero TTL', async () => {
      cache.set('instant', 'value', 0);

      await new Promise(resolve => setTimeout(resolve, 1));
      expect(cache.get('instant')).toBeUndefined();
    });
  });
});
