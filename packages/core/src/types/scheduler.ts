import type { Clock } from './clock.js';

/**
 * Task to be scheduled for execution.
 */
export interface ScheduledTaskConfig {
  /**
   * Unique identifier for the task.
   */
  readonly id: string;

  /**
   * Function to execute.
   */
  readonly fn: () => void | Promise<void>;

  /**
   * When to execute (in clock units).
   */
  readonly executionTime: number;

  /**
   * Optional metadata about the task.
   */
  readonly metadata?: Record<string, unknown> | undefined;
}

/**
 * Handle to a scheduled task that can be cancelled.
 */
export interface ScheduledTask {
  /**
   * Task configuration.
   */
  readonly config: ScheduledTaskConfig;

  /**
   * Cancel this task before it executes.
   * Returns true if cancelled, false if already executed.
   */
  cancel(): boolean;

  /**
   * Check if this task has been cancelled.
   */
  isCancelled(): boolean;
}

/**
 * Scheduler for scheduling tasks to execute at specific times.
 * Tasks are executed based on clock time.
 */
export interface Scheduler {
  /**
   * Schedule a task to execute at a specific time.
   * Returns handle that can be used to cancel the task.
   */
  schedule(
    id: string,
    fn: () => void | Promise<void>,
    executionTime: number,
    metadata?: Record<string, unknown>
  ): ScheduledTask;

  /**
   * Execute all tasks whose execution time has arrived.
   * Called periodically by the application.
   */
  tick(): Promise<void>;

  /**
   * Get count of pending (not yet executed) tasks.
   */
  pendingCount(): number;

  /**
   * Clear all pending tasks.
   */
  clear(): void;
}

/**
 * Create a Scheduler instance.
 */
export function createScheduler(clock: Clock): Scheduler {
  const tasks = new Map<string, ScheduledTask>();
  const executed = new Set<string>();

  function createScheduledTask(config: ScheduledTaskConfig): ScheduledTask {
    let cancelled = false;

    return Object.freeze({
      config: Object.freeze(config),

      cancel(): boolean {
        if (executed.has(config.id)) {
          return false;
        }
        cancelled = true;
        tasks.delete(config.id);
        return true;
      },

      isCancelled(): boolean {
        return cancelled;
      },
    });
  }

  return Object.freeze({
    schedule(
      id: string,
      fn: () => void | Promise<void>,
      executionTime: number,
      metadata?: Record<string, unknown>
    ): ScheduledTask {
      if (!id || id.length === 0) {
        throw new Error('Task id cannot be empty');
      }
      if (!fn) {
        throw new Error('Task function cannot be null');
      }
      if (!Number.isInteger(executionTime) || executionTime < 0) {
        throw new Error('Execution time must be a non-negative number');
      }

      const config: ScheduledTaskConfig = Object.freeze({
        id,
        fn,
        executionTime,
        metadata,
      });

      const task = createScheduledTask(config);
      tasks.set(id, task);
      return task;
    },

    async tick(): Promise<void> {
      const now = clock.now();
      const tasksToExecute: ScheduledTask[] = [];

      for (const task of tasks.values()) {
        if (task.config.executionTime <= now && !task.isCancelled()) {
          tasksToExecute.push(task);
        }
      }

      for (const task of tasksToExecute) {
        try {
          await task.config.fn();
          executed.add(task.config.id);
          tasks.delete(task.config.id);
        } catch {
          // Task execution error - remove from pending
          tasks.delete(task.config.id);
          executed.add(task.config.id);
        }
      }
    },

    pendingCount(): number {
      return tasks.size;
    },

    clear(): void {
      tasks.clear();
    },
  });
}
