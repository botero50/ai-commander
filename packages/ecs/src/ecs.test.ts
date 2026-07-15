/**
 * Entity Component System Tests
 *
 * Tests for ECS architecture
 * - Entity creation and management
 * - Component attachment and removal
 * - Component queries
 * - System interaction
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface Component {
  name: string;
  data: Record<string, unknown>;
}

interface Entity {
  id: string;
  components: Map<string, Component>;
}

class MockECS {
  private entities: Map<string, Entity> = new Map();

  createEntity(id: string): Entity {
    const entity: Entity = {
      id,
      components: new Map(),
    };

    this.entities.set(id, entity);
    return entity;
  }

  addComponent(entityId: string, component: Component): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    entity.components.set(component.name, component);
    return true;
  }

  removeComponent(entityId: string, componentName: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    return entity.components.delete(componentName);
  }

  getComponent(entityId: string, componentName: string): Component | undefined {
    const entity = this.entities.get(entityId);
    return entity?.components.get(componentName);
  }

  getEntity(entityId: string): Entity | undefined {
    return this.entities.get(entityId);
  }

  hasComponent(entityId: string, componentName: string): boolean {
    const entity = this.entities.get(entityId);
    return entity?.components.has(componentName) || false;
  }

  getEntitiesWithComponent(componentName: string): Entity[] {
    return Array.from(this.entities.values()).filter(e =>
      e.components.has(componentName)
    );
  }

  getEntityCount(): number {
    return this.entities.size;
  }

  deleteEntity(entityId: string): boolean {
    return this.entities.delete(entityId);
  }

  getComponentCount(entityId: string): number {
    const entity = this.entities.get(entityId);
    return entity?.components.size || 0;
  }
}

describe('ECS', () => {
  let ecs: MockECS;

  beforeEach(() => {
    ecs = new MockECS();
  });

  describe('Entity Management', () => {
    it('should create entity', () => {
      const entity = ecs.createEntity('e1');

      expect(entity.id).toBe('e1');
      expect(entity.components.size).toBe(0);
    });

    it('should retrieve entity', () => {
      ecs.createEntity('e1');
      const entity = ecs.getEntity('e1');

      expect(entity?.id).toBe('e1');
    });

    it('should delete entity', () => {
      ecs.createEntity('e1');
      const deleted = ecs.deleteEntity('e1');

      expect(deleted).toBe(true);
      expect(ecs.getEntity('e1')).toBeUndefined();
    });

    it('should not delete non-existent entity', () => {
      const deleted = ecs.deleteEntity('missing');
      expect(deleted).toBe(false);
    });

    it('should count entities', () => {
      for (let i = 0; i < 10; i++) {
        ecs.createEntity(`e${i}`);
      }

      expect(ecs.getEntityCount()).toBe(10);
    });
  });

  describe('Component Management', () => {
    beforeEach(() => {
      ecs.createEntity('e1');
    });

    it('should add component', () => {
      const added = ecs.addComponent('e1', {
        name: 'health',
        data: { current: 100, max: 100 },
      });

      expect(added).toBe(true);
      expect(ecs.hasComponent('e1', 'health')).toBe(true);
    });

    it('should add multiple components', () => {
      ecs.addComponent('e1', { name: 'health', data: {} });
      ecs.addComponent('e1', { name: 'velocity', data: {} });
      ecs.addComponent('e1', { name: 'position', data: {} });

      expect(ecs.getComponentCount('e1')).toBe(3);
    });

    it('should retrieve component', () => {
      ecs.addComponent('e1', {
        name: 'velocity',
        data: { x: 10, y: 20 },
      });

      const component = ecs.getComponent('e1', 'velocity');
      expect(component?.data.x).toBe(10);
      expect(component?.data.y).toBe(20);
    });

    it('should remove component', () => {
      ecs.addComponent('e1', { name: 'temp', data: {} });
      const removed = ecs.removeComponent('e1', 'temp');

      expect(removed).toBe(true);
      expect(ecs.hasComponent('e1', 'temp')).toBe(false);
    });

    it('should not add component to missing entity', () => {
      const added = ecs.addComponent('missing', {
        name: 'health',
        data: {},
      });

      expect(added).toBe(false);
    });

    it('should check component presence', () => {
      ecs.addComponent('e1', { name: 'physics', data: {} });

      expect(ecs.hasComponent('e1', 'physics')).toBe(true);
      expect(ecs.hasComponent('e1', 'other')).toBe(false);
    });
  });

  describe('Component Queries', () => {
    beforeEach(() => {
      ecs.createEntity('e1');
      ecs.createEntity('e2');
      ecs.createEntity('e3');

      ecs.addComponent('e1', { name: 'health', data: {} });
      ecs.addComponent('e2', { name: 'health', data: {} });
      ecs.addComponent('e3', { name: 'velocity', data: {} });
    });

    it('should find entities by component', () => {
      const entities = ecs.getEntitiesWithComponent('health');

      expect(entities).toHaveLength(2);
    });

    it('should find entities with velocity', () => {
      const entities = ecs.getEntitiesWithComponent('velocity');

      expect(entities).toHaveLength(1);
      expect(entities[0].id).toBe('e3');
    });

    it('should handle component not found', () => {
      const entities = ecs.getEntitiesWithComponent('nonexistent');

      expect(entities).toHaveLength(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle entity with many components', () => {
      ecs.createEntity('e1');

      for (let i = 0; i < 20; i++) {
        ecs.addComponent('e1', {
          name: `component${i}`,
          data: { index: i },
        });
      }

      expect(ecs.getComponentCount('e1')).toBe(20);
    });

    it('should replace component', () => {
      ecs.createEntity('e1');
      ecs.addComponent('e1', { name: 'transform', data: { x: 0, y: 0 } });
      ecs.addComponent('e1', { name: 'transform', data: { x: 10, y: 20 } });

      const component = ecs.getComponent('e1', 'transform');
      expect(component?.data.x).toBe(10);
    });

    it('should query across many entities', () => {
      for (let i = 0; i < 100; i++) {
        ecs.createEntity(`e${i}`);
        if (i % 2 === 0) {
          ecs.addComponent(`e${i}`, { name: 'physics', data: {} });
        }
      }

      const physics = ecs.getEntitiesWithComponent('physics');
      expect(physics).toHaveLength(50);
    });
  });

  describe('Performance', () => {
    it('should handle 1000 entities with components', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        ecs.createEntity(`e${i}`);
        ecs.addComponent(`e${i}`, {
          name: 'transform',
          data: { x: 0, y: 0 },
        });
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(ecs.getEntityCount()).toBe(1000);
    });

    it('should query efficiently on large sets', () => {
      for (let i = 0; i < 1000; i++) {
        ecs.createEntity(`e${i}`);
        if (i % 3 === 0) {
          ecs.addComponent(`e${i}`, { name: 'physics', data: {} });
        }
      }

      const start = Date.now();
      const physics = ecs.getEntitiesWithComponent('physics');
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(physics.length).toBeGreaterThan(300);
    });

    it('should add many components quickly', () => {
      ecs.createEntity('e1');

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        ecs.addComponent('e1', {
          name: `comp${i}`,
          data: { index: i },
        });
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('should remove all components', () => {
      ecs.createEntity('e1');
      ecs.addComponent('e1', { name: 'a', data: {} });
      ecs.addComponent('e1', { name: 'b', data: {} });

      ecs.removeComponent('e1', 'a');
      ecs.removeComponent('e1', 'b');

      expect(ecs.getComponentCount('e1')).toBe(0);
    });

    it('should remove non-existent component gracefully', () => {
      ecs.createEntity('e1');
      const removed = ecs.removeComponent('e1', 'nonexistent');

      expect(removed).toBe(false);
    });

    it('should handle entity deletion', () => {
      ecs.createEntity('e1');
      ecs.addComponent('e1', { name: 'health', data: {} });
      ecs.deleteEntity('e1');

      const entities = ecs.getEntitiesWithComponent('health');
      expect(entities).toHaveLength(0);
    });
  });
});
