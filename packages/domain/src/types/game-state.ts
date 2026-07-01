import type { Entity } from './entity.js';

/**
 * GameState represents the complete state of the game at a point in time.
 */
export interface GameState {
  readonly tick: number;
  readonly entities: ReadonlyMap<string, Entity>;
  readonly timestamp: number;
}
