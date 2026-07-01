import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { FakeGameSession } from '../src/fake-game-session.js';

describe('FakeGameSession Lifecycle', () => {
  let adapter: FakeGameAdapter;
  let session: FakeGameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as FakeGameSession;
  });

  it('should have session ID', () => {
    expect(session.sessionId).toBeDefined();
    expect(session.sessionId.startsWith('fake-session')).toBe(true);
  });

  it('should not be active before start', async () => {
    const active = await session.isActive();
    expect(active).toBe(false);
  });

  it('should start successfully', async () => {
    const state = await session.start();
    expect(state).toBeDefined();
    expect(state.time.currentTick.number).toBe(0);
    const active = await session.isActive();
    expect(active).toBe(true);
  });

  it('should fail to start twice', async () => {
    await session.start();
    await expect(session.start()).rejects.toThrow();
  });

  it('should support pause and resume', async () => {
    await session.start();
    await expect(session.pause()).resolves.toBeUndefined();
    await expect(session.resume()).resolves.toBeUndefined();
  });

  it('should stop successfully', async () => {
    await session.start();
    await expect(session.stop()).resolves.toBeUndefined();
    const active = await session.isActive();
    expect(active).toBe(false);
  });

  it('should fail operations when not active', async () => {
    await expect(session.pause()).rejects.toThrow();
    await expect(session.resume()).rejects.toThrow();
    await expect(session.stop()).rejects.toThrow();
  });

  it('should support save state', async () => {
    await session.start();
    const snapshot = await session.saveState();
    expect(snapshot).toBeDefined();
    expect(typeof snapshot).toBe('string');
  });

  it('should support restore state', async () => {
    await session.start();
    const snapshot = await session.saveState();
    await expect(session.restoreState(snapshot)).resolves.toBeUndefined();
  });

  it('should fail restore without saved state', async () => {
    await session.start();
    await expect(session.restoreState('invalid')).rejects.toThrow();
  });
});
