/**
 * Create a Scheduler instance.
 */
export function createScheduler(clock) {
    const tasks = new Map();
    const executed = new Set();
    function createScheduledTask(config) {
        let cancelled = false;
        return Object.freeze({
            config: Object.freeze(config),
            cancel() {
                if (executed.has(config.id)) {
                    return false;
                }
                cancelled = true;
                tasks.delete(config.id);
                return true;
            },
            isCancelled() {
                return cancelled;
            },
        });
    }
    return Object.freeze({
        schedule(id, fn, executionTime, metadata) {
            if (!id || id.length === 0) {
                throw new Error('Task id cannot be empty');
            }
            if (!fn) {
                throw new Error('Task function cannot be null');
            }
            if (!Number.isInteger(executionTime) || executionTime < 0) {
                throw new Error('Execution time must be a non-negative number');
            }
            const config = Object.freeze({
                id,
                fn,
                executionTime,
                metadata,
            });
            const task = createScheduledTask(config);
            tasks.set(id, task);
            return task;
        },
        async tick() {
            const now = clock.now();
            const tasksToExecute = [];
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
                }
                catch {
                    // Task execution error - remove from pending
                    tasks.delete(task.config.id);
                    executed.add(task.config.id);
                }
            }
        },
        pendingCount() {
            return tasks.size;
        },
        clear() {
            tasks.clear();
        },
    });
}
//# sourceMappingURL=scheduler.js.map