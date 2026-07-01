import type { Agent } from './agent.js';

/**
 * Action represents an action that an agent can take in the game.
 */
export interface Action {
  readonly id: string;
  readonly agent: Agent;
  readonly type: string;
  readonly payload: unknown;
  readonly timestamp: number;
}
