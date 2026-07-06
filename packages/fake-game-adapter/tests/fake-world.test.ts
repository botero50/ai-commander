import { describe, it, expect } from 'vitest';
import {
  createInitialWorld,
  progressTick,
  moveWorker,
  waitWorker,
  FakeWorldSnapshot,
} from '../src/world/fake-world-state.js';

describe('FakeWorldSnapshot', () => {
  it('should create initial world at origin', () => {
    const world = createInitialWorld();

    expect(world.tick).toBe(0);
    expect(world.workers[0].x).toBe(0);
    expect(world.workers[0].y).toBe(0);
    expect(world.commandsExecuted).toBe(0);
  });

  it('should be immutable (frozen)', () => {
    const world = createInitialWorld();

    expect(() => {
      (world as any).tick = 5;
    }).toThrow();
  });

  it('should progress tick deterministically', () => {
    const world0 = createInitialWorld();
    const world1 = progressTick(world0);

    expect(world1.tick).toBe(1);
    expect(world1.workers[0].x).toBe(0);
    expect(world1.workers[0].y).toBe(0);
    expect(world0.tick).toBe(0);
  });

  it('should move worker by delta', () => {
    const world0 = createInitialWorld();
    const world1 = moveWorker(world0, 0, 3, 2);

    expect(world1.workers[0].x).toBe(3);
    expect(world1.workers[0].y).toBe(2);
    expect(world1.commandsExecuted).toBe(1);
    expect(world0.workers[0].x).toBe(0);
  });

  it('should move worker in negative direction', () => {
    const world0 = createInitialWorld();
    const world1 = moveWorker(world0, 0, 5, 0);
    const world2 = moveWorker(world1, 0, -3, -2);

    expect(world2.workers[0].x).toBe(2);
    expect(world2.workers[0].y).toBe(-2);
    expect(world2.commandsExecuted).toBe(2);
  });

  it('should wait without changing position', () => {
    const world0 = createInitialWorld();
    const world1 = moveWorker(world0, 0, 5, 3);
    const world2 = waitWorker(world1, 0);

    expect(world2.workers[0].x).toBe(5);
    expect(world2.workers[0].y).toBe(3);
    expect(world2.commandsExecuted).toBe(2);
  });

  it('should support multi-step sequence', () => {
    let world = createInitialWorld();

    // Move right
    world = moveWorker(world, 0, 1, 0);
    expect(world.workers[0].x).toBe(1);
    expect(world.commandsExecuted).toBe(1);

    // Move up
    world = moveWorker(world, 0, 0, 1);
    expect(world.workers[0].x).toBe(1);
    expect(world.workers[0].y).toBe(1);
    expect(world.commandsExecuted).toBe(2);

    // Wait
    world = waitWorker(world, 0);
    expect(world.workers[0].x).toBe(1);
    expect(world.workers[0].y).toBe(1);
    expect(world.commandsExecuted).toBe(3);

    // Move left
    world = moveWorker(world, 0, -1, 0);
    expect(world.workers[0].x).toBe(0);
    expect(world.workers[0].y).toBe(1);
    expect(world.commandsExecuted).toBe(4);
  });

  it('should maintain immutability across operations', () => {
    const world1 = createInitialWorld();
    const world2 = moveWorker(world1, 0, 2, 2);
    const world3 = moveWorker(world2, 0, -1, -1);

    expect(world1.workers[0].x).toBe(0);
    expect(world1.workers[0].y).toBe(0);
    expect(world1.commandsExecuted).toBe(0);

    expect(world2.workers[0].x).toBe(2);
    expect(world2.workers[0].y).toBe(2);
    expect(world2.commandsExecuted).toBe(1);

    expect(world3.workers[0].x).toBe(1);
    expect(world3.workers[0].y).toBe(1);
    expect(world3.commandsExecuted).toBe(2);
  });

  it('should be deterministic: same input = same output', () => {
    const world0a = createInitialWorld();
    const world0b = createInitialWorld();

    const world1a = moveWorker(world0a, 0, 3, 4);
    const world1b = moveWorker(world0b, 0, 3, 4);

    expect(world1a.workers[0].x).toBe(world1b.workers[0].x);
    expect(world1a.workers[0].y).toBe(world1b.workers[0].y);
    expect(world1a.commandsExecuted).toBe(world1b.commandsExecuted);
  });
});
