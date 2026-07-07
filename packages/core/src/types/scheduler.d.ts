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
    schedule(id: string, fn: () => void | Promise<void>, executionTime: number, metadata?: Record<string, unknown>): ScheduledTask;
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
export declare function createScheduler(clock: Clock): Scheduler;
//# sourceMappingURL=scheduler.d.ts.map