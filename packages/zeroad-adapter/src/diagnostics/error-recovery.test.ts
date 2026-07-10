import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorRecovery } from './error-recovery.js';
import { Logger } from '../config/logger.js';

global.fetch = vi.fn();

describe('ErrorRecovery', () => {
  let recovery: ErrorRecovery;
  const logger = new Logger('error');

  beforeEach(() => {
    recovery = new ErrorRecovery(logger);
    vi.clearAllMocks();
  });

  describe('error handling', () => {
    it('should handle error and attempt recovery', async () => {
      const error = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Ollama timeout',
        severity: 'error' as const,
        component: 'AI Service',
        timestamp: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await recovery.handleError(error);

      expect(result.error).toEqual(error);
      expect(result.timestamp).toBeDefined();
      expect(result.strategy).toBeDefined();
    });

    it('should handle error with no recovery strategy', async () => {
      const error = {
        code: 'UNKNOWN_ERROR',
        message: 'Unknown error',
        severity: 'error' as const,
        component: 'Unknown',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(false);
      expect(result.strategy).toBe('none');
    });
  });

  describe('recovery strategies', () => {
    it('should retry Ollama on timeout', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const error = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Timeout',
        severity: 'error' as const,
        component: 'AI',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Retry Ollama');
    });

    it('should fall back to local executor', async () => {
      const error = {
        code: 'RL_INTERFACE_UNAVAILABLE',
        message: 'RL Interface down',
        severity: 'error' as const,
        component: 'Game',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Use Local Executor');
    });

    it('should clear cache on memory exceeded', async () => {
      const error = {
        code: 'MEMORY_EXCEEDED',
        message: 'Out of memory',
        severity: 'critical' as const,
        component: 'System',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Clear Cache');
    });

    it('should drain event bus on overflow', async () => {
      const error = {
        code: 'EVENT_BUS_OVERFLOW',
        message: 'Event bus full',
        severity: 'critical' as const,
        component: 'Events',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Drain Event Bus');
    });

    it('should abort match on timeout', async () => {
      const error = {
        code: 'MATCH_TIMEOUT',
        message: 'Match timeout',
        severity: 'error' as const,
        component: 'Match',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Abort Match');
    });

    it('should retry on database lock', async () => {
      const error = {
        code: 'DATABASE_LOCKED',
        message: 'Database locked',
        severity: 'warning' as const,
        component: 'Database',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Wait and Retry');
    });

    it('should retry with backoff on network timeout', async () => {
      const error = {
        code: 'NETWORK_TIMEOUT',
        message: 'Network timeout',
        severity: 'error' as const,
        component: 'Network',
        timestamp: new Date().toISOString(),
      };

      const result = await recovery.handleError(error);

      expect(result.recovered).toBe(true);
      expect(result.strategy).toBe('Retry with Backoff');
    });
  });

  describe('recovery history', () => {
    it('should record recovery attempts', async () => {
      const error = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Timeout',
        severity: 'error' as const,
        component: 'AI',
        timestamp: new Date().toISOString(),
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      await recovery.handleError(error);

      const history = recovery.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].error.code).toBe('OLLAMA_TIMEOUT');
    });

    it('should maintain history limit', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Add more than max history entries
      for (let i = 0; i < 150; i++) {
        const error = {
          code: 'OLLAMA_TIMEOUT',
          message: 'Timeout',
          severity: 'error' as const,
          component: 'AI',
          timestamp: new Date().toISOString(),
        };

        await recovery.handleError(error);
      }

      const history = recovery.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('statistics', () => {
    it('should calculate recovery statistics', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const error1 = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Timeout',
        severity: 'error' as const,
        component: 'AI',
        timestamp: new Date().toISOString(),
      };

      const error2 = {
        code: 'RL_INTERFACE_UNAVAILABLE',
        message: 'Unavailable',
        severity: 'error' as const,
        component: 'Game',
        timestamp: new Date().toISOString(),
      };

      await recovery.handleError(error1);
      await recovery.handleError(error2);

      const stats = recovery.getStatistics();

      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulRecoveries).toBe(2);
      expect(stats.failedRecoveries).toBe(0);
      expect(stats.successRate).toBe(100);
    });

    it('should track strategy usage', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      for (let i = 0; i < 3; i++) {
        await recovery.handleError({
          code: 'OLLAMA_TIMEOUT',
          message: 'Timeout',
          severity: 'error' as const,
          component: 'AI',
          timestamp: new Date().toISOString(),
        });
      }

      const stats = recovery.getStatistics();

      expect(stats.strategies['Retry Ollama']).toBe(3);
    });
  });

  describe('report export', () => {
    it('should export recovery report', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const error = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Timeout',
        severity: 'error' as const,
        component: 'AI',
        timestamp: new Date().toISOString(),
      };

      await recovery.handleError(error);

      const report = recovery.exportReport();

      expect(report).toContain('ERROR RECOVERY REPORT');
      expect(report).toContain('Total Recovery Attempts');
      expect(report).toContain('Successful');
      expect(report).toContain('Success Rate');
    });
  });

  describe('realistic scenario', () => {
    it('should handle multiple errors with mixed success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      }); // First succeed

      (global.fetch as any).mockRejectedValueOnce(new Error('Failed')); // Second fail

      const error1 = {
        code: 'OLLAMA_TIMEOUT',
        message: 'Timeout',
        severity: 'error' as const,
        component: 'AI',
        timestamp: new Date().toISOString(),
      };

      const error2 = {
        code: 'MEMORY_EXCEEDED',
        message: 'OOM',
        severity: 'critical' as const,
        component: 'System',
        timestamp: new Date().toISOString(),
      };

      const result1 = await recovery.handleError(error1);
      const result2 = await recovery.handleError(error2);

      expect(result1.recovered).toBe(true);
      expect(result2.recovered).toBe(true);

      const stats = recovery.getStatistics();
      expect(stats.totalAttempts).toBe(2);
    });

    it('should demonstrate cascading recovery attempts', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const errors = [
        {
          code: 'OLLAMA_TIMEOUT',
          message: 'Timeout',
          severity: 'error' as const,
          component: 'AI',
          timestamp: new Date().toISOString(),
        },
        {
          code: 'EVENT_BUS_OVERFLOW',
          message: 'Overflow',
          severity: 'critical' as const,
          component: 'Events',
          timestamp: new Date().toISOString(),
        },
        {
          code: 'MEMORY_EXCEEDED',
          message: 'OOM',
          severity: 'critical' as const,
          component: 'System',
          timestamp: new Date().toISOString(),
        },
      ];

      for (const error of errors) {
        await recovery.handleError(error);
      }

      const stats = recovery.getStatistics();
      expect(stats.totalAttempts).toBe(3);
      expect(stats.successfulRecoveries).toBe(3);

      const report = recovery.exportReport();
      expect(report).toContain('Success Rate: 100');
    });
  });
});
