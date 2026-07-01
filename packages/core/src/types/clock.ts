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
export function createRealtimeClock(): Clock {
  return Object.freeze({
    now(): number {
      return Date.now();
    },

    advance(): void {
      // No-op for realtime clock
    },
  });
}

/**
 * Game time clock with discrete ticks.
 * Manually advanced via advance() calls.
 */
export function createGameClock(initialTick: number = 0): Clock {
  let currentTick = initialTick;

  if (!Number.isInteger(initialTick) || initialTick < 0) {
    throw new Error('Initial tick must be a non-negative integer');
  }

  return Object.freeze({
    now(): number {
      return currentTick;
    },

    advance(delta: number): void {
      if (!Number.isInteger(delta) || delta < 0) {
        throw new Error('Delta must be a non-negative integer');
      }
      currentTick += delta;
    },
  });
}
