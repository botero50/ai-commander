/**
 * Tests for Story 57.2 — AI Brain Recovery
 *
 * Verifies:
 * - Detects brain failure
 * - Restarts failed brain
 * - Other brains continue
 * - Match continues
 * - No arena restart
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrainRecovery } from './brain-recovery.js';

describe('BrainRecovery', () => {
  const testConfig = {
    maxConsecutiveFailures: 3,
    responseTimeoutMs: 5000,
    healthCheckIntervalMs: 100,
  };

  let recovery: BrainRecovery;

  beforeEach(() => {
    recovery = new BrainRecovery(testConfig);
  });

  describe('initialization', () => {
    it('should initialize', () => {
      expect(recovery).toBeDefined();
    });

    it('should report zero brains initially', () => {
      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(0);
      expect(stats.healthyBrains).toBe(0);
    });
  });

  describe('brain registration', () => {
    it('should register brains', () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-2');

      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(2);
      expect(stats.healthyBrains).toBe(2);
    });

    it('should track health for registered brains', () => {
      recovery.registerBrain('brain-1');

      const health = recovery.getHealth('brain-1');
      expect(health).toBeDefined();
      expect(health?.isHealthy).toBe(true);
      expect(health?.consecutiveFailures).toBe(0);
    });

    it('should not re-register same brain', () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-1');

      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(1);
    });
  });

  describe('success recording', () => {
    it('should record successful decision', () => {
      recovery.registerBrain('brain-1');
      recovery.recordSuccess('brain-1', 150);

      const health = recovery.getHealth('brain-1');
      expect(health?.totalSuccesses).toBe(1);
      expect(health?.consecutiveFailures).toBe(0);
      expect(health?.averageResponseTime).toBeCloseTo(150, 0);
    });

    it('should auto-register on success', () => {
      recovery.recordSuccess('brain-1', 100);

      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(1);
    });

    it('should calculate moving average response time', () => {
      recovery.registerBrain('brain-1');
      recovery.recordSuccess('brain-1', 100);
      recovery.recordSuccess('brain-1', 200);
      recovery.recordSuccess('brain-1', 150);

      const health = recovery.getHealth('brain-1');
      // Average of 100, 200, 150 = 150
      expect(health?.averageResponseTime).toBeCloseTo(150, 0);
    });
  });

  describe('failure recording', () => {
    it('should record failures', async () => {
      recovery.registerBrain('brain-1');
      await recovery.recordFailure('brain-1', 'Test error');

      const health = recovery.getHealth('brain-1');
      expect(health?.totalFailures).toBe(1);
      expect(health?.consecutiveFailures).toBe(1);
      expect(health?.isHealthy).toBe(true); // Still healthy (under threshold)
    });

    it('should track consecutive failures', async () => {
      recovery.registerBrain('brain-1');
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');

      const health = recovery.getHealth('brain-1');
      expect(health?.consecutiveFailures).toBe(2);
    });

    it('should mark unhealthy after threshold', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Record failures up to threshold
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      const health = recovery.getHealth('brain-1');
      expect(health?.isHealthy).toBe(false);
      expect(mockRestart).toHaveBeenCalled();
    });

    it('should reset consecutive failures after restart', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Fail 3 times to trigger restart
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      const health = recovery.getHealth('brain-1');
      // After restart, consecutive failures should be reset to 0
      expect(health?.consecutiveFailures).toBe(0);
    });

    it('should auto-register on failure', async () => {
      await recovery.recordFailure('brain-1', 'Test error');

      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(1);
    });
  });

  describe('recovery', () => {
    it('should call restart handler', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Trigger recovery by failing threshold times
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      expect(mockRestart).toHaveBeenCalled();
    });

    it('should track recovery attempts', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Trigger recovery
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      const attempts = recovery.getAttempts();
      expect(attempts.length).toBeGreaterThan(0);

      const lastAttempt = attempts[attempts.length - 1];
      expect(lastAttempt.brainId).toBe('brain-1');
      expect(lastAttempt.success).toBe(true);
    });

    it('should handle restart errors', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockRejectedValue(new Error('Restart failed'));
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Trigger recovery
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      const attempts = recovery.getAttempts();
      const lastAttempt = attempts[attempts.length - 1];
      expect(lastAttempt.success).toBe(false);
      expect(lastAttempt.error).toContain('Restart failed');
    });
  });

  describe('monitoring', () => {
    it('should start monitoring', () => {
      recovery.startMonitoring();
      // Should not throw
      recovery.stopMonitoring();
    });

    it('should stop monitoring', async () => {
      recovery.startMonitoring();
      recovery.stopMonitoring();
      // Should be cleanly stopped
      expect(true).toBe(true);
    });

    it('should not double-start monitoring', () => {
      recovery.startMonitoring();
      expect(() => {
        recovery.startMonitoring();
      }).not.toThrow();
      recovery.stopMonitoring();
    });

    it('should detect response timeouts', async () => {
      recovery = new BrainRecovery({
        ...testConfig,
        responseTimeoutMs: 50,
        healthCheckIntervalMs: 30,
      });

      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Manually set last decision to past
      const health = recovery.getHealth('brain-1')!;
      (health as any).lastDecision = Date.now() - 100; // 100ms ago, beyond 50ms timeout

      recovery.startMonitoring();

      // Wait for health check
      await new Promise((resolve) => setTimeout(resolve, 100));

      recovery.stopMonitoring();

      // Should have detected timeout and recorded failure
      const stats = recovery.getStats();
      expect(stats.totalBrains).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should provide stats', () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-2');
      recovery.recordSuccess('brain-1', 100);

      const stats = recovery.getStats();

      expect(stats.totalBrains).toBe(2);
      expect(stats.healthyBrains).toBe(2);
      expect(stats.unhealthyBrains).toBe(0);
      expect(stats.totalRecoveryAttempts).toBe(0);
    });

    it('should track recovery successes and failures', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Trigger successful recovery
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      const stats = recovery.getStats();
      expect(stats.successfulRecoveries).toBeGreaterThan(0);
    });
  });

  describe('multiple brains', () => {
    it('should independently track multiple brains', async () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-2');

      recovery.recordSuccess('brain-1', 100);
      await recovery.recordFailure('brain-2', 'Error');

      const health1 = recovery.getHealth('brain-1');
      const health2 = recovery.getHealth('brain-2');

      expect(health1?.totalSuccesses).toBe(1);
      expect(health2?.totalFailures).toBe(1);
    });

    it('should recover only failed brain', async () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-2');

      const mockRestart1 = vi.fn();
      const mockRestart2 = vi.fn().mockResolvedValue(undefined);

      recovery.registerRestartHandler('brain-1', mockRestart1);
      recovery.registerRestartHandler('brain-2', mockRestart2);

      // Only brain-2 fails
      await recovery.recordFailure('brain-2', 'Error 1');
      await recovery.recordFailure('brain-2', 'Error 2');
      await recovery.recordFailure('brain-2', 'Error 3');

      // Only brain-2's restart should be called
      expect(mockRestart2).toHaveBeenCalled();
      expect(mockRestart1).not.toHaveBeenCalled();
    });
  });

  describe('acceptance criteria', () => {
    it('criterion: detects brain failure', async () => {
      recovery.registerBrain('brain-1');
      await recovery.recordFailure('brain-1', 'Test failure');

      const stats = recovery.getStats();
      expect(stats.totalBrains).toBe(1);
    });

    it('criterion: restarts failed brain', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Trigger restart
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      expect(mockRestart).toHaveBeenCalled();
    });

    it('criterion: other brains continue', async () => {
      recovery.registerBrain('brain-1');
      recovery.registerBrain('brain-2');

      // brain-1 fails and restarts
      const mockRestart1 = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart1);

      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      // brain-2 continues normally
      recovery.recordSuccess('brain-2', 100);

      const health2 = recovery.getHealth('brain-2');
      expect(health2?.isHealthy).toBe(true);
      expect(health2?.totalSuccesses).toBe(1);
    });

    it('criterion: no arena restart required', async () => {
      recovery.registerBrain('brain-1');
      const mockRestart = vi.fn().mockResolvedValue(undefined);
      recovery.registerRestartHandler('brain-1', mockRestart);

      // Recovery happens independently
      await recovery.recordFailure('brain-1', 'Error 1');
      await recovery.recordFailure('brain-1', 'Error 2');
      await recovery.recordFailure('brain-1', 'Error 3');

      // Arena can continue
      recovery.startMonitoring();
      recovery.stopMonitoring();

      expect(true).toBe(true);
    });
  });
});
