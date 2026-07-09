/**
 * Status Cache
 * Optimizes broadcast performance by caching status updates and detecting changes
 */

export interface CacheEntry<T> {
  value: T;
  hash: string;
  timestamp: number;
  ttl: number; // milliseconds
}

export interface CacheStats {
  totalHits: number;
  totalMisses: number;
  hitRate: number; // 0-1
  cachedKeys: number;
  totalSize: number; // estimated bytes
}

/**
 * Status Cache
 * Generic cache for broadcast status updates with change detection
 */
export class StatusCache<T extends Record<string, unknown>> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private totalHits = 0;
  private totalMisses = 0;
  private defaultTTL: number;

  constructor(ttlSeconds: number = 5) {
    this.defaultTTL = ttlSeconds * 1000;
  }

  /**
   * Simple hash function for object comparison
   */
  private hashValue(value: T): string {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    const hash = this.hashValue(value);
    this.cache.set(key, {
      value,
      hash,
      timestamp: Date.now(),
      ttl: ttlMs ?? this.defaultTTL,
    });
  }

  /**
   * Get a value from the cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (!this.isValid(entry)) {
      this.cache.delete(key);
      this.totalMisses++;
      return null;
    }

    this.totalHits++;
    return entry.value;
  }

  /**
   * Check if value has changed since last cache
   */
  hasChanged(key: string, value: T): boolean {
    const entry = this.cache.get(key);

    if (!entry || !this.isValid(entry)) {
      return true; // No cached value or expired = changed
    }

    const newHash = this.hashValue(value);
    return newHash !== entry.hash;
  }

  /**
   * Get or compute value
   * Returns cached value if valid and unchanged, otherwise computes new value
   */
  getOrCompute(key: string, compute: () => T, ttlMs?: number): { value: T; changed: boolean } {
    const cached = this.get(key);
    const newValue = compute();

    if (cached) {
      const newHash = this.hashValue(newValue);
      const cachedHash = this.hashValue(cached);

      if (newHash === cachedHash) {
        return { value: cached, changed: false };
      }
    }

    this.set(key, newValue, ttlMs);
    return { value: newValue, changed: true };
  }

  /**
   * Clear a specific key
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  pruneExpired(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.totalHits + this.totalMisses;
    const hitRate = total > 0 ? this.totalHits / total : 0;

    let totalSize = 0;
    for (const entry of this.cache.values()) {
      try {
        totalSize += JSON.stringify(entry.value).length;
      } catch {
        totalSize += 100; // Estimate
      }
    }

    return {
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate,
      cachedKeys: this.cache.size,
      totalSize,
    };
  }

  /**
   * Reset statistics (but not cache data)
   */
  resetStats(): void {
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  /**
   * Batch check multiple values for changes
   */
  detectChanges(
    updates: Array<{ key: string; value: T }>
  ): Array<{ key: string; changed: boolean }> {
    return updates.map(({ key, value }) => ({
      key,
      changed: this.hasChanged(key, value),
    }));
  }

  /**
   * Get all cached keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get size of cache (number of entries)
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * Broadcast Status Cache
 * Specialized cache for broadcast status data (AI status, minimap, etc.)
 */
export class BroadcastStatusCache {
  private caches: Map<string, StatusCache<any>> = new Map();
  private defaultTTL: number;

  constructor(ttlSeconds: number = 5) {
    this.defaultTTL = ttlSeconds * 1000;
  }

  /**
   * Get or create a cache for a specific data type
   */
  getCache<T extends Record<string, unknown>>(
    name: string,
    ttlMs?: number
  ): StatusCache<T> {
    if (!this.caches.has(name)) {
      this.caches.set(name, new StatusCache<T>(this.defaultTTL / 1000));
    }

    return this.caches.get(name)!;
  }

  /**
   * Set value in a named cache
   */
  set<T extends Record<string, unknown>>(
    cacheName: string,
    key: string,
    value: T,
    ttlMs?: number
  ): void {
    const cache = this.getCache<T>(cacheName, ttlMs);
    cache.set(key, value, ttlMs);
  }

  /**
   * Get value from a named cache
   */
  get<T extends Record<string, unknown>>(cacheName: string, key: string): T | null {
    const cache = this.caches.get(cacheName);
    if (!cache) return null;

    return cache.get(key);
  }

  /**
   * Check if value has changed
   */
  hasChanged<T extends Record<string, unknown>>(
    cacheName: string,
    key: string,
    value: T
  ): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return true;

    return cache.hasChanged(key, value);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.caches.clear();
  }

  /**
   * Prune expired entries from all caches
   */
  pruneExpired(): number {
    let totalPruned = 0;

    for (const cache of this.caches.values()) {
      totalPruned += cache.pruneExpired();
    }

    return totalPruned;
  }

  /**
   * Get stats for all caches
   */
  getAllStats(): Map<string, CacheStats> {
    const stats = new Map<string, CacheStats>();

    for (const [name, cache] of this.caches.entries()) {
      stats.set(name, cache.getStats());
    }

    return stats;
  }

  /**
   * Get total cache size across all caches
   */
  getTotalSize(): number {
    let total = 0;

    for (const cache of this.caches.values()) {
      total += cache.getStats().totalSize;
    }

    return total;
  }

  /**
   * Destroy all caches
   */
  destroy(): void {
    this.clearAll();
  }
}
