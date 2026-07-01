import type { Entity } from './entity.js';

/**
 * Agent represents an AI-controlled entity in the game.
 */
export interface Agent extends Entity {
  readonly type: 'agent';
  readonly name: string;
}
