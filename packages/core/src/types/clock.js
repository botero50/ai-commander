/**
 * Real-world time clock.
 * Always returns current system time.
 */
export function createRealtimeClock() {
    return Object.freeze({
        now() {
            return Date.now();
        },
        advance() {
            // No-op for realtime clock
        },
    });
}
/**
 * Game time clock with discrete ticks.
 * Manually advanced via advance() calls.
 */
export function createGameClock(initialTick = 0) {
    let currentTick = initialTick;
    if (!Number.isInteger(initialTick) || initialTick < 0) {
        throw new Error('Initial tick must be a non-negative integer');
    }
    return Object.freeze({
        now() {
            return currentTick;
        },
        advance(delta) {
            if (!Number.isInteger(delta) || delta < 0) {
                throw new Error('Delta must be a non-negative integer');
            }
            currentTick += delta;
        },
    });
}
//# sourceMappingURL=clock.js.map