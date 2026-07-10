import { describe, it, expect, beforeEach } from 'vitest';
import { ShutdownHandler } from './shutdown-handler.js';
import { Logger } from '../config/logger.js';

describe('ShutdownHandler', () => {
  let handler: ShutdownHandler;
  const logger = new Logger('error');

  beforeEach(() => {
    handler = new ShutdownHandler(logger);
  });

  describe('shutdown initiation', () => {
    it('should initiate graceful shutdown', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'User initiated shutdown',
      };

      const report = await handler.shutdown(context);

      expect(report.context).toEqual(context);
      expect(report.timestamp).toBeDefined();
      expect(report.phases.length).toBe(5);
      expect(report.totalDuration).toBeGreaterThan(0);
    });

    it('should prevent duplicate shutdown', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test shutdown',
      };

      const report1 = await handler.shutdown(context);
      const report2 = await handler.shutdown(context);

      expect(report1.success).toBe(true);
      expect(report2.success).toBe(false);
    });
  });

  describe('shutdown phases', () => {
    it('should execute all shutdown phases', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      const report = await handler.shutdown(context);

      const phaseNames = report.phases.map(p => p.name);
      expect(phaseNames).toContain('Stop Matches');
      expect(phaseNames).toContain('Close Connections');
      expect(phaseNames).toContain('Archive State');
      expect(phaseNames).toContain('Release Resources');
      expect(phaseNames).toContain('Final Cleanup');
    });

    it('should track phase duration', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      const report = await handler.shutdown(context);

      for (const phase of report.phases) {
        expect(phase.duration).toBeGreaterThan(0);
        expect(phase.duration).toBeLessThan(1);
      }
    });

    it('should mark phases as completed', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      const report = await handler.shutdown(context);

      for (const phase of report.phases) {
        expect(phase.status).toBe('completed');
      }
    });
  });

  describe('shutdown reasons', () => {
    it('should handle manual shutdown', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'User requested',
      };

      const report = await handler.shutdown(context);

      expect(report.context.reason).toBe('manual');
      expect(report.success).toBe(true);
    });

    it('should handle error shutdown', async () => {
      const context = {
        reason: 'error' as const,
        timestamp: new Date().toISOString(),
        message: 'Critical error',
      };

      const report = await handler.shutdown(context);

      expect(report.context.reason).toBe('error');
      expect(report.success).toBe(true);
    });

    it('should handle timeout shutdown', async () => {
      const context = {
        reason: 'timeout' as const,
        timestamp: new Date().toISOString(),
        message: 'Process timeout',
      };

      const report = await handler.shutdown(context);

      expect(report.context.reason).toBe('timeout');
      expect(report.success).toBe(true);
    });

    it('should handle signal shutdown', async () => {
      const context = {
        reason: 'signal' as const,
        timestamp: new Date().toISOString(),
        message: 'SIGTERM received',
      };

      const report = await handler.shutdown(context);

      expect(report.context.reason).toBe('signal');
      expect(report.success).toBe(true);
    });
  });

  describe('shutdown status', () => {
    it('should track shutdown state', async () => {
      expect(handler.isShutdown()).toBe(false);

      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      await handler.shutdown(context);

      expect(handler.isShutdown()).toBe(true);
    });
  });

  describe('report export', () => {
    it('should export shutdown report', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'User shutdown',
      };

      const report = await handler.shutdown(context);
      const text = handler.exportReport(report);

      expect(text).toContain('SHUTDOWN REPORT');
      expect(text).toContain('Stop Matches');
      expect(text).toContain('Close Connections');
      expect(text).toContain('Archive State');
      expect(text).toContain('Release Resources');
      expect(text).toContain('Final Cleanup');
    });

    it('should show success status in report', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      const report = await handler.shutdown(context);
      const text = handler.exportReport(report);

      expect(text).toContain('SUCCESS');
    });

    it('should include total duration in report', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Test',
      };

      const report = await handler.shutdown(context);
      const text = handler.exportReport(report);

      expect(text).toContain('Total Duration');
      expect(text).toContain('Phases Completed');
    });
  });

  describe('realistic scenario', () => {
    it('should execute complete shutdown sequence', async () => {
      const context = {
        reason: 'manual' as const,
        timestamp: new Date().toISOString(),
        message: 'Graceful shutdown initiated',
      };

      const report = await handler.shutdown(context);

      expect(report.success).toBe(true);
      expect(report.phases.length).toBe(5);
      expect(report.totalDuration).toBeGreaterThan(0.1); // Should take at least 100ms
      expect(report.phases.every(p => p.status === 'completed')).toBe(true);

      const text = handler.exportReport(report);
      expect(text).toContain('SUCCESS');
    });

    it('should provide comprehensive shutdown report', async () => {
      const context = {
        reason: 'error' as const,
        timestamp: new Date().toISOString(),
        message: 'Emergency shutdown due to critical error',
      };

      const report = await handler.shutdown(context);
      const text = handler.exportReport(report);

      expect(text).toContain('SHUTDOWN REPORT');
      expect(text).toContain('ERROR');
      expect(report.phases.length).toBe(5);

      for (const phase of report.phases) {
        expect(phase.name).toBeTruthy();
        expect(phase.status).toBe('completed');
        expect(phase.duration).toBeGreaterThan(0);
      }
    });
  });
});
