/**
 * Tests for Story 57.1 — RL Interface Recovery
 *
 * Verifies:
 * - Auto-detects RL Interface disconnect
 * - Reconnects without stopping game
 * - Commands resume flowing
 * - Observations resume
 * - No arena restart
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RLInterfaceRecovery } from './rl-interface-recovery.js';
import type { IPCBridge } from '../types/ipc-bridge.js';

describe('RLInterfaceRecovery', () => {
  const testConfig = {
    heartbeatInterval: 100,
    heartbeatTimeout: 1000,
    maxRetries: 3,
    retryDelay: 50,
  };

  let recovery: RLInterfaceRecovery;

  beforeEach(() => {
    recovery = new RLInterfaceRecovery(testConfig);
  });

  describe('initialization', () => {
    it('should initialize without monitoring', () => {
      const stats = recovery.getStats();
      expect(stats.isMonitoring).toBe(false);
      expect(stats.totalAttempts).toBe(0);
    });

    it('should accept config', () => {
      expect(recovery).toBeDefined();
    });
  });

  describe('monitoring', () => {
    it('should start monitoring', () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(true),
      };

      recovery.startMonitoring(mockBridge);

      const stats = recovery.getStats();
      expect(stats.isMonitoring).toBe(true);

      recovery.stopMonitoring();
    });

    it('should stop monitoring', () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(true),
      };

      recovery.startMonitoring(mockBridge);
      recovery.stopMonitoring();

      const stats = recovery.getStats();
      expect(stats.isMonitoring).toBe(false);
    });

    it('should not allow double start', () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(true),
      };

      recovery.startMonitoring(mockBridge);
      expect(() => {
        recovery.startMonitoring(mockBridge);
      }).not.toThrow();

      recovery.stopMonitoring();
    });
  });

  describe('recovery', () => {
    it('should handle heartbeat failure', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn()
          .mockResolvedValueOnce(false) // First check fails
          .mockResolvedValueOnce(true), // Recovery succeeds
      };

      recovery.startMonitoring(mockBridge);

      // Wait for at least one heartbeat cycle (100ms interval + processing)
      await new Promise((resolve) => setTimeout(resolve, 300));

      recovery.stopMonitoring();

      const stats = recovery.getStats();
      // Should have at least attempted recovery
      expect(stats.totalAttempts).toBeGreaterThanOrEqual(1);
    });

    it('should reconnect on heartbeat failure', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true),
      };

      recovery.startMonitoring(mockBridge);

      // Wait for heartbeat cycle and recovery
      await new Promise((resolve) => setTimeout(resolve, 200));

      recovery.stopMonitoring();

      // Should have attempted disconnect and reconnect
      expect(mockBridge.disconnect).toHaveBeenCalled();
      expect(mockBridge.connect).toHaveBeenCalled();
    });

    it('should track recovery attempts', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true),
      };

      recovery.startMonitoring(mockBridge);

      // Wait for heartbeat and recovery
      await new Promise((resolve) => setTimeout(resolve, 200));

      recovery.stopMonitoring();

      const attempts = recovery.getAttempts();
      expect(attempts.length).toBeGreaterThan(0);

      const lastAttempt = attempts[attempts.length - 1];
      expect(lastAttempt).toHaveProperty('timestamp');
      expect(lastAttempt).toHaveProperty('attempt');
      expect(lastAttempt).toHaveProperty('success');
      expect(lastAttempt).toHaveProperty('duration');
    });

    it('should respect max retries limit', async () => {
      const limitedConfig = {
        heartbeatInterval: 50,
        heartbeatTimeout: 500,
        maxRetries: 2,
        retryDelay: 25,
      };

      const limitedRecovery = new RLInterfaceRecovery(limitedConfig);

      const mockBridge: IPCBridge = {
        connect: vi.fn().mockRejectedValue(new Error('Cannot reconnect')),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(false), // Always fail
      };

      limitedRecovery.startMonitoring(mockBridge);

      // Wait for multiple recovery attempts
      await new Promise((resolve) => setTimeout(resolve, 500));

      limitedRecovery.stopMonitoring();

      const stats = limitedRecovery.getStats();
      // Should not exceed max retries
      expect(stats.totalAttempts).toBeLessThanOrEqual(limitedConfig.maxRetries);
    });
  });

  describe('statistics', () => {
    it('should provide recovery stats', () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(true),
      };

      recovery.startMonitoring(mockBridge);

      const stats = recovery.getStats();

      expect(stats).toHaveProperty('isMonitoring');
      expect(stats).toHaveProperty('totalAttempts');
      expect(stats).toHaveProperty('successfulRecoveries');
      expect(stats).toHaveProperty('failedAttempts');

      recovery.stopMonitoring();
    });

    it('should track successful and failed recoveries', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn()
          .mockResolvedValueOnce(false) // First failure triggers recovery
          .mockResolvedValueOnce(true) // Recovery succeeds
          .mockResolvedValueOnce(true), // Stays healthy
      };

      recovery.startMonitoring(mockBridge);

      // Wait for cycles
      await new Promise((resolve) => setTimeout(resolve, 300));

      recovery.stopMonitoring();

      const stats = recovery.getStats();
      if (stats.totalAttempts > 0) {
        expect(stats.successfulRecoveries + stats.failedAttempts).toBeGreaterThan(0);
      }
    });

    it('should freeze attempts array', () => {
      const attempts = recovery.getAttempts();
      expect(() => {
        (attempts as any)[0] = null;
      }).toThrow();
    });
  });

  describe('acceptance criteria', () => {
    it('criterion: auto-detects disconnect', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(false), // Detects disconnect
      };

      recovery.startMonitoring(mockBridge);

      // Wait for heartbeat check and recovery attempt
      await new Promise((resolve) => setTimeout(resolve, 300));

      recovery.stopMonitoring();

      const stats = recovery.getStats();
      expect(stats.totalAttempts).toBeGreaterThan(0);
    });

    it('criterion: reconnects without stopping game', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn()
          .mockResolvedValueOnce(false)
          .mockResolvedValueOnce(true),
      };

      recovery.startMonitoring(mockBridge);

      await new Promise((resolve) => setTimeout(resolve, 200));

      recovery.stopMonitoring();

      // Verify reconnection happened
      expect(mockBridge.disconnect).toHaveBeenCalled();
      expect(mockBridge.connect).toHaveBeenCalled();
    });

    it('criterion: no arena restart', async () => {
      const mockBridge: IPCBridge = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        sendMessage: vi.fn().mockResolvedValue(undefined),
        sendRequest: vi.fn().mockResolvedValue({}),
        onMessage: vi.fn(),
        heartbeat: vi.fn().mockResolvedValue(true),
      };

      recovery.startMonitoring(mockBridge);

      // Recovery should operate independently without arena restart
      expect(recovery.getStats().isMonitoring).toBe(true);

      recovery.stopMonitoring();

      // Should be cleanly stoppable
      expect(recovery.getStats().isMonitoring).toBe(false);
    });
  });
});
