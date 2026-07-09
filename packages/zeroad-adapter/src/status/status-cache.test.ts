import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatusCache, BroadcastStatusCache, type CacheStats } from './status-cache.js';

describe('Status Cache', () => {
  let cache: StatusCache<{ id: string; value: number }>;

  beforeEach(() => {
    cache = new StatusCache(1); // 1 second TTL
  });

  describe('Basic operations', () => {
    it('should create cache', () => {
      expect(cache).toBeDefined();
    });

    it('should set and get values', () => {
      const data = { id: 'test', value: 42 };
      cache.set('key1', data);

      const retrieved = cache.get('key1');
      expect(retrieved).toEqual(data);
    });

    it('should return null for missing keys', () => {
      const retrieved = cache.get('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should clear specific keys', () => {
      const data = { id: 'test', value: 42 };
      cache.set('key1', data);
      cache.clear('key1');

      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      cache.set('key1', { id: 'test1', value: 1 });
      cache.set('key2', { id: 'test2', value: 2 });

      cache.clearAll();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should track cache size', () => {
      cache.set('key1', { id: 'test1', value: 1 });
      cache.set('key2', { id: 'test2', value: 2 });

      expect(cache.size()).toBe(2);
    });
  });

  describe('Change detection', () => {
    it('should detect value changes', () => {
      const data1 = { id: 'test', value: 42 };
      cache.set('key1', data1);

      const data2 = { id: 'test', value: 99 };
      const changed = cache.hasChanged('key1', data2);

      expect(changed).toBe(true);
    });

    it('should not report change when value is same', () => {
      const data = { id: 'test', value: 42 };
      cache.set('key1', data);

      const changed = cache.hasChanged('key1', data);

      expect(changed).toBe(false);
    });

    it('should report change for missing keys', () => {
      const data = { id: 'test', value: 42 };
      const changed = cache.hasChanged('nonexistent', data);

      expect(changed).toBe(true);
    });
  });

  describe('Get or compute', () => {
    it('should compute and cache value', () => {
      const compute = vi.fn(() => ({ id: 'test', value: 42 }));

      const result = cache.getOrCompute('key1', compute);

      expect(result.value).toEqual({ id: 'test', value: 42 });
      expect(result.changed).toBe(true);
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('should return cached value without recompute', () => {
      const compute = vi.fn(() => ({ id: 'test', value: 42 }));

      cache.getOrCompute('key1', compute);
      const result = cache.getOrCompute('key1', compute);

      expect(result.changed).toBe(false);
      expect(compute).toHaveBeenCalledTimes(2); // Still called to check for changes
    });

    it('should report change when computed value differs', () => {
      const compute1 = () => ({ id: 'test', value: 42 });
      const compute2 = () => ({ id: 'test', value: 99 });

      cache.getOrCompute('key1', compute1);
      const result = cache.getOrCompute('key1', compute2);

      expect(result.changed).toBe(true);
      expect(result.value.value).toBe(99);
    });

    it('should use custom TTL if provided', () => {
      const compute = () => ({ id: 'test', value: 42 });
      cache.getOrCompute('key1', compute, 5000); // 5 seconds

      const entry = cache['cache'].get('key1');
      expect(entry?.ttl).toBe(5000);
    });
  });

  describe('Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortCache = new StatusCache(0.1); // 100ms TTL
      shortCache.set('key1', { id: 'test', value: 42 });

      expect(shortCache.get('key1')).not.toBeNull();

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortCache.get('key1')).toBeNull();
    });

    it('should prune expired entries', async () => {
      const shortCache = new StatusCache(0.1); // 100ms TTL
      shortCache.set('key1', { id: 'test1', value: 1 });
      shortCache.set('key2', { id: 'test2', value: 2 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const pruned = shortCache.pruneExpired();
      expect(pruned).toBe(2);
      expect(shortCache.size()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', () => {
      cache.set('key1', { id: 'test', value: 42 });

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('missing'); // Miss

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(2);
      expect(stats.totalMisses).toBe(1);
    });

    it('should calculate hit rate', () => {
      cache.set('key1', { id: 'test', value: 42 });

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('missing'); // Miss
      cache.get('missing'); // Miss

      const stats = cache.getStats();
      expect(stats.hitRate).toBeCloseTo(0.5); // 2 hits out of 4 accesses
    });

    it('should reset statistics', () => {
      cache.set('key1', { id: 'test', value: 42 });
      cache.get('key1');

      cache.resetStats();

      const stats = cache.getStats();
      expect(stats.totalHits).toBe(0);
      expect(stats.totalMisses).toBe(0);
    });

    it('should estimate cache size', () => {
      cache.set('key1', { id: 'test', value: 42 });
      cache.set('key2', { id: 'test', value: 99 });

      const stats = cache.getStats();
      expect(stats.cachedKeys).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
    });
  });

  describe('Batch operations', () => {
    it('should detect changes for multiple values', () => {
      const data1 = { id: 'test1', value: 1 };
      const data2 = { id: 'test2', value: 2 };
      const data3 = { id: 'test3', value: 3 };

      cache.set('key1', data1);
      cache.set('key2', data2);

      const changes = cache.detectChanges([
        { key: 'key1', value: data1 }, // No change
        { key: 'key2', value: { id: 'test2', value: 99 } }, // Change
        { key: 'key3', value: data3 }, // New key
      ]);

      expect(changes[0]!.changed).toBe(false);
      expect(changes[1]!.changed).toBe(true);
      expect(changes[2]!.changed).toBe(true);
    });

    it('should list all cached keys', () => {
      cache.set('key1', { id: 'test1', value: 1 });
      cache.set('key2', { id: 'test2', value: 2 });
      cache.set('key3', { id: 'test3', value: 3 });

      const keys = cache.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
      expect(keys.length).toBe(3);
    });
  });
});

describe('Broadcast Status Cache', () => {
  let broadcastCache: BroadcastStatusCache;

  beforeEach(() => {
    broadcastCache = new BroadcastStatusCache(1);
  });

  describe('Multi-cache management', () => {
    it('should manage multiple named caches', () => {
      broadcastCache.set('ai-status', 'player1', { id: 'ai1', value: 100 });
      broadcastCache.set('minimap', 'map1', { id: 'map', value: 200 });

      const aiData = broadcastCache.get('ai-status', 'player1');
      const mapData = broadcastCache.get('minimap', 'map1');

      expect(aiData).toEqual({ id: 'ai1', value: 100 });
      expect(mapData).toEqual({ id: 'map', value: 200 });
    });

    it('should isolate caches by name', () => {
      broadcastCache.set('ai-status', 'key1', { id: 'ai1', value: 100 });
      broadcastCache.set('minimap', 'key1', { id: 'map1', value: 200 });

      const aiData = broadcastCache.get('ai-status', 'key1');
      const mapData = broadcastCache.get('minimap', 'key1');

      expect(aiData?.value).toBe(100);
      expect(mapData?.value).toBe(200);
    });

    it('should detect changes across caches', () => {
      const data1 = { id: 'ai1', value: 100 };
      const data2 = { id: 'ai1', value: 999 };

      broadcastCache.set('ai-status', 'player1', data1);

      const changed = broadcastCache.hasChanged('ai-status', 'player1', data2);
      expect(changed).toBe(true);
    });
  });

  describe('Broadcast cache operations', () => {
    it('should clear all caches', () => {
      broadcastCache.set('ai-status', 'p1', { id: 'ai1', value: 100 });
      broadcastCache.set('minimap', 'map', { id: 'map', value: 200 });

      broadcastCache.clearAll();

      expect(broadcastCache.get('ai-status', 'p1')).toBeNull();
      expect(broadcastCache.get('minimap', 'map')).toBeNull();
    });

    it('should prune expired across all caches', async () => {
      const shortCache = new BroadcastStatusCache(0.1); // 100ms TTL
      shortCache.set('ai-status', 'p1', { id: 'ai1', value: 100 });
      shortCache.set('minimap', 'map', { id: 'map', value: 200 });

      await new Promise((resolve) => setTimeout(resolve, 150));

      const pruned = shortCache.pruneExpired();
      expect(pruned).toBe(2);
    });

    it('should get stats for all caches', () => {
      broadcastCache.set('ai-status', 'p1', { id: 'ai1', value: 100 });
      broadcastCache.set('minimap', 'map', { id: 'map', value: 200 });

      broadcastCache.get('ai-status', 'p1');
      broadcastCache.get('ai-status', 'missing'); // Miss

      const stats = broadcastCache.getAllStats();
      expect(stats.has('ai-status')).toBe(true);
      expect(stats.has('minimap')).toBe(true);

      const aiStats = stats.get('ai-status')!;
      expect(aiStats.totalHits).toBe(1);
      expect(aiStats.totalMisses).toBe(1);
    });

    it('should calculate total cache size', () => {
      broadcastCache.set('ai-status', 'p1', { id: 'ai1', value: 100 });
      broadcastCache.set('minimap', 'map', { id: 'map', value: 200 });

      const totalSize = broadcastCache.getTotalSize();
      expect(totalSize).toBeGreaterThan(0);
    });
  });

  describe('Auto-create caches', () => {
    it('should auto-create cache on first set', () => {
      broadcastCache.set('new-cache', 'key1', { id: 'test', value: 42 });

      const value = broadcastCache.get('new-cache', 'key1');
      expect(value).toEqual({ id: 'test', value: 42 });
    });

    it('should return null for non-existent cache', () => {
      const value = broadcastCache.get('nonexistent', 'key1');
      expect(value).toBeNull();
    });
  });
});
