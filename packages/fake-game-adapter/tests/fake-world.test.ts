import { describe, it, expect } from 'vitest';
import {
  createInitialWorld,
  progressTick,
  moveAgent,
  waitAgent,
  FakeWorldSnapshot,
} from '../src/world/fake-world-state.js';

describe('FakeWorldSnapshot', () => {
  it('should create initial world at origin', () => {
    const world = createInitialWorld();

    expect(world.tick).toBe(0);
    expect(world.agentX).toBe(0);
    expect(world.agentY).toBe(0);
    expect(world.agentState).toBe('idle');
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
    expect(world1.agentX).toBe(0);
    expect(world1.agentY).toBe(0);
    expect(world0.tick).toBe(0); // Original unchanged
  });

  it('should move agent by delta', () => {
    const world0 = createInitialWorld();
    const world1 = moveAgent(world0, 3, 2);

    expect(world1.agentX).toBe(3);
    expect(world1.agentY).toBe(2);
    expect(world1.commandsExecuted).toBe(1);
    expect(world0.agentX).toBe(0); // Original unchanged
  });

  it('should move agent in negative direction', () => {
    const world0 = createInitialWorld();
    const world1 = moveAgent(world0, 5, 0);
    const world2 = moveAgent(world1, -3, -2);

    expect(world2.agentX).toBe(2);
    expect(world2.agentY).toBe(-2);
    expect(world2.commandsExecuted).toBe(2);
  });

  it('should wait without changing position', () => {
    const world0 = createInitialWorld();
    const world1 = moveAgent(world0, 5, 3);
    const world2 = waitAgent(world1);

    expect(world2.agentX).toBe(5);
    expect(world2.agentY).toBe(3);
    expect(world2.commandsExecuted).toBe(2);
  });

  it('should support multi-step sequence', () => {
    let world = createInitialWorld();

    // Move right
    world = moveAgent(world, 1, 0);
    expect(world.agentX).toBe(1);
    expect(world.commandsExecuted).toBe(1);

    // Move up
    world = moveAgent(world, 0, 1);
    expect(world.agentX).toBe(1);
    expect(world.agentY).toBe(1);
    expect(world.commandsExecuted).toBe(2);

    // Wait
    world = waitAgent(world);
    expect(world.agentX).toBe(1);
    expect(world.agentY).toBe(1);
    expect(world.commandsExecuted).toBe(3);

    // Move left
    world = moveAgent(world, -1, 0);
    expect(world.agentX).toBe(0);
    expect(world.agentY).toBe(1);
    expect(world.commandsExecuted).toBe(4);
  });

  it('should maintain immutability across operations', () => {
    const world1 = createInitialWorld();
    const world2 = moveAgent(world1, 2, 2);
    const world3 = moveAgent(world2, -1, -1);

    expect(world1.agentX).toBe(0);
    expect(world1.agentY).toBe(0);
    expect(world1.commandsExecuted).toBe(0);

    expect(world2.agentX).toBe(2);
    expect(world2.agentY).toBe(2);
    expect(world2.commandsExecuted).toBe(1);

    expect(world3.agentX).toBe(1);
    expect(world3.agentY).toBe(1);
    expect(world3.commandsExecuted).toBe(2);
  });

  it('should be deterministic: same input = same output', () => {
    const world0a = createInitialWorld();
    const world0b = createInitialWorld();

    const world1a = moveAgent(world0a, 3, 4);
    const world1b = moveAgent(world0b, 3, 4);

    expect(world1a.agentX).toBe(world1b.agentX);
    expect(world1a.agentY).toBe(world1b.agentY);
    expect(world1a.commandsExecuted).toBe(world1b.commandsExecuted);
  });
});
