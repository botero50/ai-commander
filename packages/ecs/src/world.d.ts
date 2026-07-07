import type { Component } from './types/component.js';
import type { Entity } from './types/entity.js';
/**
 * World is the container for all entities and their components.
 */
export declare class World {
    private readonly entities;
    createEntity(id: string): void;
    addComponent(entityId: string, component: Component): void;
    getEntity(id: string): Entity | undefined;
    getAllEntities(): ReadonlyMap<string, Entity>;
}
//# sourceMappingURL=world.d.ts.map