/**
 * Event represents something that happened in the game.
 */
export interface Event {
  readonly id: string;
  readonly type: string;
  readonly tick: number;
  readonly payload: unknown;
  readonly timestamp: number;
}
