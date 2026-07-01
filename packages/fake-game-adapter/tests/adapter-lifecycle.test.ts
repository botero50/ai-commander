import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { AdapterErrorCode } from '@ai-commander/adapter';

describe('FakeGameAdapter Lifecycle', () => {
  let adapter: FakeGameAdapter;

  beforeEach(() => {
    adapter = new FakeGameAdapter();
  });

  it('should have correct adapter metadata', () => {
    expect(adapter.adapterId).toBe('fake-game');
    expect(adapter.displayName).toBe('Fake In-Memory Game');
  });

  it('should report capabilities', () => {
    expect(adapter.capabilities.supportsPause).toBe(true);
    expect(adapter.capabilities.supportsSaveState).toBe(true);
    expect(adapter.capabilities.supportsDeterministicMode).toBe(true);
    expect(adapter.capabilities.supportsReplay).toBe(true);
    expect(adapter.capabilities.supportsCompleteWorldState).toBe(true);
    expect(adapter.capabilities.supportsMultipleAgents).toBe(false);
  });

  it('should initialize without error', async () => {
    await expect(adapter.initialize()).resolves.toBeUndefined();
  });

  it('should fail to create session before initialization', async () => {
    const newAdapter = new FakeGameAdapter();
    await expect(newAdapter.createSession()).rejects.toThrow();
  });

  it('should create session after initialization', async () => {
    await adapter.initialize();
    const session = await adapter.createSession();

    expect(session).toBeDefined();
    expect(session.sessionId).toBeDefined();
    expect(session.observationProvider).toBeDefined();
    expect(session.commandExecutor).toBeDefined();
  });

  it('should create multiple sessions with unique IDs', async () => {
    await adapter.initialize();

    const session1 = await adapter.createSession();
    const session2 = await adapter.createSession();

    expect(session1.sessionId).not.toBe(session2.sessionId);
  });

  it('should return adapter info', async () => {
    const info = await adapter.getAdapterInfo();

    expect(info.version).toBe('0.1.0');
    expect(Array.isArray(info.compatible)).toBe(true);
    expect(info.compatible.length).toBeGreaterThan(0);
  });

  it('should shutdown without error', async () => {
    await adapter.initialize();
    await expect(adapter.shutdown()).resolves.toBeUndefined();
  });

  it('should fail to create session after shutdown', async () => {
    await adapter.initialize();
    await adapter.shutdown();
    await expect(adapter.createSession()).rejects.toThrow();
  });

  it('should be reinitializable after shutdown', async () => {
    await adapter.initialize();
    await adapter.shutdown();
    await expect(adapter.initialize()).resolves.toBeUndefined();

    const session = await adapter.createSession();
    expect(session).toBeDefined();
  });
});
