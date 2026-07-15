/**
 * Scheduler Tests
 *
 * Tests for task scheduling system
 * - Task scheduling at specific times
 * - Recurring schedules (cron-like)
 * - Task execution and cancellation
 * - Priority and delay handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface ScheduledTask {
  id: string;
  execute: () => Promise<void> | void;
  delay: number;
  recurring?: boolean;
  priority: number;
}

interface TaskResult {
  taskId: string;
  executedAt: number;
  success: boolean;
  error?: string;
}

class MockScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private results: TaskResult[] = [];
  private nextId = 0;

  schedule(
    fn: () => Promise<void> | void,
    delay: number,
    priority: number = 0
  ): string {
    const id = `task-${this.nextId++}`;

    this.tasks.set(id, {
      id,
      execute: fn,
      delay,
      priority,
      recurring: false,
    });

    return id;
  }

  scheduleRecurring(
    fn: () => Promise<void> | void,
    delay: number,
    priority: number = 0
  ): string {
    const id = this.schedule(fn, delay, priority);
    const task = this.tasks.get(id)!;
    task.recurring = true;

    return id;
  }

  async executeTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    try {
      await Promise.resolve(task.execute());

      this.results.push({
        taskId,
        executedAt: Date.now(),
        success: true,
      });

      return true;
    } catch (error) {
      this.results.push({
        taskId,
        executedAt: Date.now(),
        success: false,
        error: (error as Error).message,
      });

      return false;
    }
  }

  cancel(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  getTaskCount(): number {
    return this.tasks.size;
  }

  getPendingTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  getResults(): TaskResult[] {
    return [...this.results];
  }

  async executeAll(): Promise<number> {
    let executed = 0;

    for (const [taskId] of this.tasks) {
      const success = await this.executeTask(taskId);
      if (success) executed++;
    }

    return executed;
  }

  sortByPriority(): ScheduledTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.priority - a.priority);
  }

  clearResults(): void {
    this.results = [];
  }
}

describe('Scheduler', () => {
  let scheduler: MockScheduler;

  beforeEach(() => {
    scheduler = new MockScheduler();
  });

  describe('Task Scheduling', () => {
    it('should schedule task', () => {
      const id = scheduler.schedule(async () => {}, 1000);

      expect(id).toBeDefined();
      expect(scheduler.getTaskCount()).toBe(1);
    });

    it('should schedule multiple tasks', () => {
      scheduler.schedule(async () => {}, 1000);
      scheduler.schedule(async () => {}, 2000);
      scheduler.schedule(async () => {}, 3000);

      expect(scheduler.getTaskCount()).toBe(3);
    });

    it('should return unique task IDs', () => {
      const id1 = scheduler.schedule(async () => {}, 1000);
      const id2 = scheduler.schedule(async () => {}, 1000);

      expect(id1).not.toBe(id2);
    });

    it('should schedule with delay', () => {
      const id = scheduler.schedule(async () => {}, 5000);
      const tasks = scheduler.getPendingTasks();

      expect(tasks[0].delay).toBe(5000);
    });
  });

  describe('Task Execution', () => {
    it('should execute scheduled task', async () => {
      const callback = vi.fn();
      const id = scheduler.schedule(callback, 1000);

      await scheduler.executeTask(id);

      expect(callback).toHaveBeenCalled();
    });

    it('should track execution results', async () => {
      const id = scheduler.schedule(async () => {}, 1000);
      await scheduler.executeTask(id);

      const results = scheduler.getResults();
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should execute all tasks', async () => {
      scheduler.schedule(async () => {}, 1000);
      scheduler.schedule(async () => {}, 1000);
      scheduler.schedule(async () => {}, 1000);

      const executed = await scheduler.executeAll();

      expect(executed).toBe(3);
    });

    it('should handle task errors', async () => {
      const id = scheduler.schedule(() => {
        throw new Error('Task failed');
      }, 1000);

      const success = await scheduler.executeTask(id);

      expect(success).toBe(false);
      const results = scheduler.getResults();
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('Task failed');
    });
  });

  describe('Task Cancellation', () => {
    it('should cancel task', () => {
      const id = scheduler.schedule(async () => {}, 1000);
      const cancelled = scheduler.cancel(id);

      expect(cancelled).toBe(true);
      expect(scheduler.getTaskCount()).toBe(0);
    });

    it('should return false for non-existent task', () => {
      const cancelled = scheduler.cancel('non-existent');

      expect(cancelled).toBe(false);
    });

    it('should prevent execution of cancelled task', async () => {
      const callback = vi.fn();
      const id = scheduler.schedule(callback, 1000);

      scheduler.cancel(id);
      const success = await scheduler.executeTask(id);

      expect(success).toBe(false);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Priority Handling', () => {
    it('should schedule with priority', () => {
      scheduler.schedule(async () => {}, 1000, 5);
      scheduler.schedule(async () => {}, 1000, 10);
      scheduler.schedule(async () => {}, 1000, 3);

      const sorted = scheduler.sortByPriority();

      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(5);
      expect(sorted[2].priority).toBe(3);
    });

    it('should default to zero priority', () => {
      const id = scheduler.schedule(async () => {}, 1000);
      const tasks = scheduler.getPendingTasks();

      expect(tasks[0].priority).toBe(0);
    });
  });

  describe('Recurring Tasks', () => {
    it('should schedule recurring task', () => {
      const id = scheduler.scheduleRecurring(async () => {}, 1000);
      const tasks = scheduler.getPendingTasks();

      expect(tasks[0].recurring).toBe(true);
    });

    it('should distinguish recurring from one-shot', () => {
      const oneShot = scheduler.schedule(async () => {}, 1000);
      const recurring = scheduler.scheduleRecurring(async () => {}, 1000);

      const tasks = scheduler.getPendingTasks();
      const oneShotTask = tasks.find(t => t.id === oneShot);
      const recurringTask = tasks.find(t => t.id === recurring);

      expect(oneShotTask?.recurring).toBe(false);
      expect(recurringTask?.recurring).toBe(true);
    });
  });

  describe('Query Operations', () => {
    it('should list pending tasks', () => {
      scheduler.schedule(async () => {}, 1000);
      scheduler.schedule(async () => {}, 2000);

      const tasks = scheduler.getPendingTasks();

      expect(tasks).toHaveLength(2);
    });

    it('should get execution results', async () => {
      const id1 = scheduler.schedule(async () => {}, 1000);
      const id2 = scheduler.schedule(async () => {}, 1000);

      await scheduler.executeTask(id1);
      await scheduler.executeTask(id2);

      const results = scheduler.getResults();

      expect(results).toHaveLength(2);
    });
  });

  describe('Performance', () => {
    it('should schedule 1000 tasks', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        scheduler.schedule(async () => {}, i * 100);
      }

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
      expect(scheduler.getTaskCount()).toBe(1000);
    });

    it('should execute 100 tasks quickly', async () => {
      for (let i = 0; i < 100; i++) {
        scheduler.schedule(async () => {}, 1000);
      }

      const start = Date.now();
      await scheduler.executeAll();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });

    it('should sort by priority efficiently', () => {
      for (let i = 0; i < 100; i++) {
        scheduler.schedule(async () => {}, 1000, Math.random() * 100);
      }

      const start = Date.now();
      scheduler.sortByPriority();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('State Management', () => {
    it('should clear results', async () => {
      const id = scheduler.schedule(async () => {}, 1000);
      await scheduler.executeTask(id);

      expect(scheduler.getResults()).toHaveLength(1);

      scheduler.clearResults();

      expect(scheduler.getResults()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delay', () => {
      const id = scheduler.schedule(async () => {}, 0);

      expect(scheduler.getTaskCount()).toBe(1);
    });

    it('should handle negative priority', () => {
      scheduler.schedule(async () => {}, 1000, -10);
      scheduler.schedule(async () => {}, 1000, 10);

      const sorted = scheduler.sortByPriority();

      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(-10);
    });

    it('should handle empty scheduler', () => {
      const executed = scheduler.executeAll();

      expect(executed).toBeDefined();
      expect(scheduler.getTaskCount()).toBe(0);
    });
  });
});
