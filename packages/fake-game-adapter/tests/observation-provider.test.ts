import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { FakeGameSession } from '../src/fake-game-session.js';
import { createInitialWorld, moveAgent } from '../src/world/fake-world-state.js';

describe('FakeObservationProvider', () => {
  let adapter: FakeGameAdapter;
  let session: FakeGameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as FakeGameSession;
  });

  it('should provide initial world state', async () => {
    await session.start();
    const worldState = await session.observationProvider.getWorldState();

    expect(worldState).toBeDefined();
    expect(worldState.time.currentTick.number).toBe(0);
    expect(worldState.agents).toBeDefined();
    expect(worldState.agents.length).toBe(1);
  });

  it('should report observation available when active', async () => {
    await session.start();
    const available = await session.observationProvider.isObservationAvailable();
    expect(available).toBe(true);
  });

  it('should report observation unavailable when inactive', async () => {
    const available = await session.observationProvider.isObservationAvailable();
    expect(available).toBe(false);
  });

  it('should provide agent position in customData', async () => {
    await session.start();
    const worldState = await session.observationProvider.getWorldState();

    expect(worldState.agents[0].customData.position).toBe('0,0');
  });

  it('should provide complete world state', async () => {
    await session.start();
    const worldState = await session.observationProvider.getWorldState();

    expect(worldState.time).toBeDefined();
    expect(worldState.map).toBeDefined();
    expect(worldState.agents).toBeDefined();
    expect(worldState.players).toBeDefined();
    expect(worldState.teams).toBeDefined();
    expect(worldState.customData).toBeDefined();
  });

  it('should have immutable agent customData', async () => {
    await session.start();
    const worldState = await session.observationProvider.getWorldState();
    const customData = worldState.agents[0].customData;

    expect(() => {
      (customData as any).position = '999,999';
    }).toThrow();
  });

  it('should support world state replay', async () => {
    await session.start();

    const state0 = await session.observationProvider.getWorldState();
    expect(state0.time.currentTick.number).toBe(0);

    const stateAtTick0 = await session.observationProvider.getWorldStateAt(0);
    expect(stateAtTick0.time.currentTick.number).toBe(0);
  });

  it('should fail to get world state at invalid tick', async () => {
    await session.start();
    await expect(session.observationProvider.getWorldStateAt(999)).rejects.toThrow();
  });
});
