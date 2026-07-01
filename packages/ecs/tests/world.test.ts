import { describe, it, expect } from 'vitest';
import { World } from '../src/index.js';
import type { Component } from '../src/index.js';

describe('World', () => {
  it('should create entities', () => {
    const world = new World();
    world.createEntity('entity-1');

    const entity = world.getEntity('entity-1');
    expect(entity).toBeDefined();
    expect(entity?.id).toBe('entity-1');
  });

  it('should add components to entities', () => {
    const world = new World();
    world.createEntity('entity-1');

    const component: Component = {
      type: 'position',
    };

    world.addComponent('entity-1', component);

    const entity = world.getEntity('entity-1');
    expect(entity?.components.has('position')).toBe(true);
  });

  it('should throw when adding component to non-existent entity', () => {
    const world = new World();

    const component: Component = {
      type: 'position',
    };

    expect(() => {
      world.addComponent('non-existent', component);
    }).toThrow();
  });

  it('should get all entities', () => {
    const world = new World();
    world.createEntity('entity-1');
    world.createEntity('entity-2');

    const all = world.getAllEntities();
    expect(all.size).toBe(2);
    expect(all.has('entity-1')).toBe(true);
    expect(all.has('entity-2')).toBe(true);
  });
});
