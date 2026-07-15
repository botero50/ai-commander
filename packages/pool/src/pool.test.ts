/**
 * Thread/Worker Pool Tests
 *
 * Tests for worker pool management
 * - Pool creation and lifecycle
 * - Task queueing and execution
 * - Worker management
 * - Resource cleanup
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface PoolTask<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

interface PoolWorker {
  id: string;
  busy: boolean;
  tasksCompleted: number;
}

class MockWorkerPool {
  private workers: Map<string, PoolWorker> = new Map();
  private taskQueue: PoolTask<any>[] = [];
  private nextWorkerId = 0;
  private nextTaskId = 0;
  private isRunning = false;

  constructor(private poolSize: number) {
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.poolSize; i++) {
      const id = `worker-${this.nextWorkerId++}`;
      this.workers.set(id, {
        id,
        busy: false,
        tasksCompleted: 0,
      });
    }
  }

  start(): void {
    this.isRunning = true;
  }

  stop(): void {
    this.isRunning = false;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const task: PoolTask<T> = {
        id: `task-${this.nextTaskId++}`,
        fn,
        resolve,
        reject,
      };

      // Try to find an idle worker
      const idleWorker = Array.from(this.workers.values()).find(w => !w.busy);

      if (idleWorker) {
        this.executeTask(task, idleWorker);
      } else {
        // Queue task if no idle workers
        this.taskQueue.push(task);
      }
    });
  }

  private async executeTask<T>(task: PoolTask<T>, worker: PoolWorker): Promise<void> {
    worker.busy = true;

    try {
      const result = await task.fn();
      worker.tasksCompleted++;
      task.resolve(result);
    } catch (error) {
      task.reject(error as Error);
    } finally {
      worker.busy = false;

      // Process next queued task if available
      if (this.taskQueue.length > 0 && this.isRunning) {
        const nextTask = this.taskQueue.shift();
        if (nextTask) {
          this.executeTask(nextTask, worker);
        }
      }
    }
  }

  getPoolSize(): number {
    return this.workers.size;
  }

  getQueueSize(): number {
    return this.taskQueue.length;
  }

  getIdleWorkerCount(): number {
    return Array.from(this.workers.values()).filter(w => !w.busy).length;
  }

  getBusyWorkerCount(): number {
    return Array.from(this.workers.values()).filter(w => w.busy).length;
  }

  getWorkerStats(): { id: string; busy: boolean; tasksCompleted: number }[] {
    return Array.from(this.workers.values()).map(w => ({
      id: w.id,
      busy: w.busy,
      tasksCompleted: w.tasksCompleted,
    }));
  }

  getTotalTasksCompleted(): number {
    return Array.from(this.workers.values()).reduce((sum, w) => sum + w.tasksCompleted, 0);
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  drain(): void {
    this.taskQueue = [];
  }
}

describe('WorkerPool', () => {
  let pool: MockWorkerPool;

  beforeEach(() => {
    pool = new MockWorkerPool(4);
    pool.start();
  });

  describe('Pool Initialization', () => {
    it('should create pool with specified size', () => {
      expect(pool.getPoolSize()).toBe(4);
    });

    it('should start with all workers idle', () => {
      expect(pool.getIdleWorkerCount()).toBe(4);
      expect(pool.getBusyWorkerCount()).toBe(0);
    });

    it('should create pools of different sizes', () => {
      const pool2 = new MockWorkerPool(8);
      expect(pool2.getPoolSize()).toBe(8);
    });

    it('should initialize with empty queue', () => {
      expect(pool.getQueueSize()).toBe(0);
    });
  });

  describe('Task Execution', () => {
    it('should execute task', async () => {
      const callback = vi.fn(() => Promise.resolve(42));

      const result = await pool.execute(callback);

      expect(result).toBe(42);
      expect(callback).toHaveBeenCalled();
    });

    it('should execute multiple tasks concurrently', async () => {
      const tasks = Array.from({ length: 4 }, (_, i) =>
        pool.execute(async () => i)
      );

      const results = await Promise.all(tasks);

      expect(results).toEqual([0, 1, 2, 3]);
    });

    it('should queue tasks when workers busy', async () => {
      // Fill all workers
      const tasks = Array.from({ length: 4 }, () =>
        pool.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'done';
        })
      );

      // This should be queued
      const extraTask = pool.execute(async () => 'extra');

      expect(pool.getQueueSize()).toBeGreaterThan(0);

      const results = await Promise.all([...tasks, extraTask]);
      expect(results).toHaveLength(5);
    });

    it('should handle task errors', async () => {
      const fn = async () => {
        throw new Error('Task failed');
      };

      await expect(pool.execute(fn)).rejects.toThrow('Task failed');
    });
  });

  describe('Worker Management', () => {
    it('should track busy workers', async () => {
      pool.execute(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'done';
        }
      );

      expect(pool.getBusyWorkerCount()).toBeGreaterThan(0);
    });

    it('should track idle workers', async () => {
      expect(pool.getIdleWorkerCount()).toBe(4);
    });

    it('should return workers to idle after task', async () => {
      await pool.execute(async () => 'done');

      expect(pool.getIdleWorkerCount()).toBe(4);
      expect(pool.getBusyWorkerCount()).toBe(0);
    });

    it('should report worker statistics', async () => {
      await pool.execute(async () => 'task1');
      await pool.execute(async () => 'task2');

      const stats = pool.getWorkerStats();

      expect(stats).toHaveLength(4);
      expect(stats.every(s => s.tasksCompleted >= 0)).toBe(true);
    });
  });

  describe('Queue Management', () => {
    it('should queue tasks when all workers busy', async () => {
      // Fill all 4 workers
      for (let i = 0; i < 4; i++) {
        pool.execute(
          async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return i;
          }
        );
      }

      // Queue more tasks
      pool.execute(async () => 'queued1');
      pool.execute(async () => 'queued2');

      expect(pool.getQueueSize()).toBe(2);
    });

    it('should process queue as workers become available', async () => {
      const shortTask = pool.execute(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'short';
      });

      // Queue additional tasks
      pool.execute(async () => 'queued');

      const result = await shortTask;
      expect(result).toBe('short');

      // Queue should be processed
      expect(pool.getQueueSize()).toBeLessThan(1);
    });

    it('should drain queue', () => {
      pool.execute(async () => 'task1');
      pool.execute(async () => 'task2');

      pool.drain();

      expect(pool.getQueueSize()).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should track total tasks completed', async () => {
      await pool.execute(async () => 'task1');
      await pool.execute(async () => 'task2');
      await pool.execute(async () => 'task3');

      expect(pool.getTotalTasksCompleted()).toBe(3);
    });

    it('should maintain task count accuracy', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) =>
        pool.execute(async () => i)
      );

      await Promise.all(tasks);

      expect(pool.getTotalTasksCompleted()).toBe(10);
    });
  });

  describe('Pool Lifecycle', () => {
    it('should support start and stop', () => {
      pool.stop();
      expect(pool.isRunning()).toBe(false);

      pool.start();
      expect(pool.isRunning()).toBe(true);
    });

    it('should not process queued tasks when stopped', () => {
      pool.stop();

      pool.execute(async () => 'should not process');

      expect(pool.getQueueSize()).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle 100 sequential tasks', async () => {
      const start = Date.now();

      const tasks = Array.from({ length: 100 }, (_, i) =>
        pool.execute(async () => i)
      );

      await Promise.all(tasks);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(pool.getTotalTasksCompleted()).toBe(100);
    });

    it('should parallelize work across workers', async () => {
      const start = Date.now();

      const tasks = Array.from({ length: 8 }, () =>
        pool.execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'done';
        })
      );

      await Promise.all(tasks);
      const elapsed = Date.now() - start;

      // With 4 workers, 8 tasks of 100ms each should take ~200ms
      expect(elapsed).toBeLessThan(400);
    });

    it('should handle rapid task submission', async () => {
      const start = Date.now();

      const promises: Promise<number>[] = [];
      for (let i = 0; i < 50; i++) {
        promises.push(pool.execute(async () => i));
      }

      await Promise.all(promises);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(pool.getTotalTasksCompleted()).toBe(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single worker pool', async () => {
      const singlePool = new MockWorkerPool(1);
      singlePool.start();

      const task1 = singlePool.execute(async () => 1);
      const task2 = singlePool.execute(async () => 2);

      const results = await Promise.all([task1, task2]);
      expect(results).toEqual([1, 2]);
    });

    it('should handle large pool', async () => {
      const largePool = new MockWorkerPool(100);
      largePool.start();

      const tasks = Array.from({ length: 100 }, (_, i) =>
        largePool.execute(async () => i)
      );

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(100);
    });

    it('should handle very fast tasks', async () => {
      const tasks = Array.from({ length: 100 }, (_, i) =>
        pool.execute(async () => i)
      );

      const results = await Promise.all(tasks);
      expect(results).toHaveLength(100);
    });
  });
});
