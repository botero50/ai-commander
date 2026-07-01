import type { Component } from './types/component.js';
import type { Entity } from './types/entity.js';

/**
 * World is the container for all entities and their components.
 */
export class World {
  private readonly entities = new Map<string, Map<string, Component>>();

  createEntity(id: string): void {
    this.entities.set(id, new Map());
  }

  addComponent(entityId: string, component: Component): void {
    const entity = this.entities.get(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }
    entity.set(component.type, component);
  }

  getEntity(id: string): Entity | undefined {
    const components = this.entities.get(id);
    if (!components) {
      return undefined;
    }
    return {
      id,
      components: new Map(components),
    };
  }

  getAllEntities(): ReadonlyMap<string, Entity> {
    const result = new Map<string, Entity>();
    for (const [id, components] of this.entities) {
      result.set(id, {
        id,
        components: new Map(components),
      });
    }
    return result;
  }
}
