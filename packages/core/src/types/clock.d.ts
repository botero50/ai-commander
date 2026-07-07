/**
 * Abstract clock interface for time representation.
 * Can be real-world time or game time.
 */
export interface Clock {
    /**
     * Get the current time.
     * For RealtimeClock: milliseconds since epoch.
     * For GameClock: discrete tick number.
     */
    now(): number;
    /**
     * Advance the clock by the specified amount.
     * For RealtimeClock: ignored (real time always advances).
     * For GameClock: advances by tick count.
     */
    advance(delta: number): void;
}
/**
 * Real-world time clock.
 * Always returns current system time.
 */
export declare function createRealtimeClock(): Clock;
/**
 * Game time clock with discrete ticks.
 * Manually advanced via advance() calls.
 */
export declare function createGameClock(initialTick?: number): Clock;
//# sourceMappingURL=clock.d.ts.map