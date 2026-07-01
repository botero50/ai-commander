import { describe, it, expect } from 'vitest';
import { Engine } from '../src/index.js';

describe('Engine', () => {
  it('should create an engine with config', () => {
    const engine = new Engine({ tickRate: 60 });
    expect(engine.getCurrentTick()).toBe(0);
  });

  it('should start and stop', () => {
    const engine = new Engine({ tickRate: 60 });

    engine.start();
    engine.tick();
    expect(engine.getCurrentTick()).toBe(1);

    engine.stop();
    engine.tick();
    expect(engine.getCurrentTick()).toBe(1);
  });

  it('should respect maxTicks config', () => {
    const engine = new Engine({ tickRate: 60, maxTicks: 5 });

    engine.start();
    for (let i = 0; i < 10; i++) {
      engine.tick();
    }

    expect(engine.getCurrentTick()).toBe(5);
  });

  it('should provide access to world', () => {
    const engine = new Engine({ tickRate: 60 });
    const world = engine.getWorld();

    world.createEntity('test-entity');
    const entity = world.getEntity('test-entity');
    expect(entity?.id).toBe('test-entity');
  });
});
