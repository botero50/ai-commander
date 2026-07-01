import type { Component } from './component.js';

/**
 * Entity in the ECS system.
 */
export interface Entity {
  readonly id: string;
  readonly components: ReadonlyMap<string, Component>;
}
