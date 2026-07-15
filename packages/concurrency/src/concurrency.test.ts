/**
 * Concurrency Control Tests
 *
 * Tests for semaphores and locks
 * - Semaphore acquire/release
 * - Concurrent limit enforcement
 * - Queue management
 * - Deadlock prevention
 */

import { describe, it, expect, beforeEach } from 'vitest';

class MockSemaphore {
  private available: number;
  private waiting: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    this.available = maxConcurrency;
  }

  async acquire(): Promise<void> {
    if (this.available > 0) {
      this.available--;
      return;
    }

    return new Promise(resolve => {
      this.waiting.push(() => {
        this.available--;
        resolve();
      });
    });
  }

  release(): void {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve?.();
    } else {
      this.available++;
    }
  }

  getAvailable(): number {
    return this.available;
  }

  getWaitingCount(): number {
    return this.waiting.length;
  }

  getMaxConcurrency(): number {
    return this.available + this.getWaitingCount();
  }
}

describe('Semaphore', () => {
  let sem: MockSemaphore;

  beforeEach(() => {
    sem = new MockSemaphore(3);
  });

  describe('Basic Operations', () => {
    it('should acquire lock', async () => {
      await sem.acquire();
      expect(sem.getAvailable()).toBe(2);
    });

    it('should release lock', async () => {
      await sem.acquire();
      sem.release();
      expect(sem.getAvailable()).toBe(3);
    });

    it('should acquire multiple locks', async () => {
      await sem.acquire();
      await sem.acquire();
      expect(sem.getAvailable()).toBe(1);
    });

    it('should release multiple locks', async () => {
      await sem.acquire();
      await sem.acquire();

      sem.release();
      sem.release();

      expect(sem.getAvailable()).toBe(3);
    });
  });

  describe('Concurrency Enforcement', () => {
    it('should enforce max concurrency', async () => {
      await sem.acquire();
      await sem.acquire();
      await sem.acquire();

      expect(sem.getAvailable()).toBe(0);
    });

    it('should queue excess requests', async () => {
      await sem.acquire();
      await sem.acquire();
      await sem.acquire();

      const promise = sem.acquire();
      expect(sem.getWaitingCount()).toBe(1);

      sem.release();
      await promise;
      expect(sem.getAvailable()).toBe(0);
    });

    it('should process queue in order', async () => {
      for (let i = 0; i < 3; i++) {
        await sem.acquire();
      }

      const order: number[] = [];
      const promises = Array.from({ length: 3 }, (_, i) =>
        sem.acquire().then(() => order.push(i))
      );

      for (let i = 0; i < 3; i++) {
        sem.release();
      }

      await Promise.all(promises);
      expect(order).toEqual([0, 1, 2]);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent acquires', async () => {
      const promises = Array.from({ length: 5 }, () => sem.acquire());

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
      expect(sem.getWaitingCount()).toBe(2);
    });

    it('should handle acquire-release cycles', async () => {
      for (let i = 0; i < 10; i++) {
        await sem.acquire();
        sem.release();
      }

      expect(sem.getAvailable()).toBe(3);
    });

    it('should process pending requests on release', async () => {
      for (let i = 0; i < 5; i++) {
        sem.acquire().catch(() => {});
      }

      const initial = sem.getWaitingCount();

      sem.release();

      // Waiting queue should decrease
      expect(sem.getWaitingCount()).toBeLessThanOrEqual(initial - 1);
    });
  });

  describe('Starvation Prevention', () => {
    it('should not starve waiting requests', async () => {
      for (let i = 0; i < 3; i++) {
        await sem.acquire();
      }

      let gotLock = false;
      const waiter = sem.acquire().then(() => {
        gotLock = true;
      });

      sem.release();
      await new Promise(r => setTimeout(r, 50));

      expect(gotLock).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle many concurrent operations', async () => {
      const sem10 = new MockSemaphore(10);
      const promises = Array.from({ length: 100 }, () => sem10.acquire());

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(1000);
    });

    it('should acquire quickly when available', async () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        await sem.acquire();
        sem.release();
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single semaphore', async () => {
      const single = new MockSemaphore(1);

      await single.acquire();
      expect(single.getAvailable()).toBe(0);

      single.release();
      expect(single.getAvailable()).toBe(1);
    });

    it('should handle large semaphore', async () => {
      const large = new MockSemaphore(1000);

      for (let i = 0; i < 500; i++) {
        await large.acquire();
      }

      expect(large.getAvailable()).toBe(500);
    });

    it('should handle rapid release', () => {
      for (let i = 0; i < 10; i++) {
        sem.release();
      }

      expect(sem.getAvailable()).toBeGreaterThan(3);
    });
  });
});
