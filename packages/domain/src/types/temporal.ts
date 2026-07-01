/**
 * A game tick is a discrete time step in the game.
 * Abstract number that games interpret as needed:
 * - Turn in turn-based game
 * - Frame in real-time game
 * - Simulation step
 */
export interface Tick {
  /**
   * Monotonically increasing tick number.
   * Starts at 0, increments by 1 each tick.
   * Never resets during a game.
   */
  readonly number: number;
}

/**
 * Create a Tick value object.
 */
export function createTick(number: number): Tick {
  if (!Number.isInteger(number) || number < 0) {
    throw new Error('Tick number must be a non-negative integer');
  }
  return Object.freeze({ number });
}

/**
 * Check if a tick is the first tick of the game.
 */
export function isFirstTick(tick: Tick): boolean {
  return tick.number === 0;
}

/**
 * Compare two ticks.
 */
export function compareTicks(a: Tick, b: Tick): number {
  return a.number - b.number;
}

/**
 * Phase of the game turn.
 * Allows breaking a tick into multiple phases for multi-step resolution.
 */
export interface Phase {
  /**
   * Unique identifier for this phase within a tick.
   * Examples: "perception", "decision", "action", "resolution"
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Ordinal position in the turn sequence.
   * 0 = first phase, increments each phase.
   */
  readonly order: number;

  /**
   * Tick during which this phase occurs.
   */
  readonly tick: Tick;
}

/**
 * Create a Phase value object.
 */
export function createPhase(id: string, name: string, order: number, tick: Tick): Phase {
  if (!id || id.length === 0) {
    throw new Error('Phase id cannot be empty');
  }
  if (!name || name.length === 0) {
    throw new Error('Phase name cannot be empty');
  }
  if (!Number.isInteger(order) || order < 0) {
    throw new Error('Phase order must be a non-negative integer');
  }

  return Object.freeze({ id, name, order, tick });
}

/**
 * Abstract representation of time in the game.
 * Games may track time differently (real-time, game-days, etc.)
 */
export interface GameTime {
  /**
   * Total elapsed ticks since game start.
   */
  readonly elapsedTicks: number;

  /**
   * Current tick.
   */
  readonly currentTick: Tick;

  /**
   * Current phase within the tick (if applicable).
   * null if game doesn't use phases.
   */
  readonly currentPhase: Phase | null;

  /**
   * Game-specific time interpretation.
   * Examples: "Day 3, Morning", "Turn 150", "12:30 PM"
   */
  readonly displayTime: string;
}

/**
 * Create a GameTime value object.
 */
export function createGameTime(
  currentTick: Tick,
  currentPhase: Phase | null,
  displayTime: string
): GameTime {
  if (!displayTime || displayTime.length === 0) {
    throw new Error('displayTime cannot be empty');
  }

  return Object.freeze({
    elapsedTicks: currentTick.number,
    currentTick,
    currentPhase,
    displayTime,
  });
}
