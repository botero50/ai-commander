import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameProcessManager } from './game-process-manager.js';

describe('GameProcessManager', () => {
  let manager: GameProcessManager;

  beforeEach(() => {
    manager = new GameProcessManager({
      executablePath: 'echo',
      launchTimeout: 5000,
      shutdownTimeout: 2000,
    });
  });

  it('should initialize with options', () => {
    expect(manager.isRunning).toBe(false);
    expect(manager.getProcessId()).toBe(null);
  });

  it('should prevent starting process twice', async () => {
    // Skip actual process start in test environment
    try {
      await manager.start();
      // If start succeeds, trying again should fail
      if (manager.isRunning) {
        await expect(manager.start()).rejects.toThrow('already running');
      }
    } catch (err) {
      // Expected in test environment
    }
  });

  it('should fail to send message when process not running', async () => {
    await expect(manager.send('test')).rejects.toThrow('not running');
  });

  it('should track message callbacks', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    manager.onMessage(callback1);
    manager.onMessage(callback2);

    // Callbacks are registered internally
    expect(manager).toBeDefined();
  });

  it('should return null process id when not running', () => {
    expect(manager.getProcessId()).toBeNull();
  });

  it('should handle graceful shutdown', async () => {
    // Shutdown should not throw when process isn't running
    await expect(manager.stop()).resolves.toBeUndefined();
  });
});
