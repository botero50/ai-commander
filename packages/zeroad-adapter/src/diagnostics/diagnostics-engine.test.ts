import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiagnosticsEngine } from './diagnostics-engine.js';
import { Logger } from '../config/logger.js';

global.fetch = vi.fn();

describe('DiagnosticsEngine', () => {
  let engine: DiagnosticsEngine;
  const logger = new Logger('error');

  beforeEach(() => {
    engine = new DiagnosticsEngine(logger);
    vi.clearAllMocks();
  });

  describe('health check', () => {
    it('should run comprehensive health check', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();

      expect(health.timestamp).toBeDefined();
      expect(health.overallStatus).toBeDefined();
      expect(Array.isArray(health.checks)).toBe(true);
      expect(health.checks.length).toBeGreaterThan(0);
      expect(health.metrics).toBeDefined();
      expect(health.unhealthyCount).toBeGreaterThanOrEqual(0);
      expect(health.degradedCount).toBeGreaterThanOrEqual(0);
    });

    it('should check all critical components', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();
      const checkNames = health.checks.map(c => c.name);

      expect(checkNames).toContain('Memory Usage');
      expect(checkNames).toContain('Uptime');
      expect(checkNames).toContain('Match Execution');
      expect(checkNames).toContain('Event Bus');
      expect(checkNames).toContain('AI Services');
    });
  });

  describe('memory check', () => {
    it('should report healthy memory usage', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();
      const memCheck = health.checks.find(c => c.name === 'Memory Usage');

      expect(memCheck).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(memCheck?.status);
    });
  });

  describe('match execution check', () => {
    it('should report healthy with no active matches', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(0);
      const health = await engine.runHealthCheck();
      const matchCheck = health.checks.find(c => c.name === 'Match Execution');

      expect(matchCheck?.status).toBe('healthy');
    });

    it('should report degraded with many active matches', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(15);
      const health = await engine.runHealthCheck();
      const matchCheck = health.checks.find(c => c.name === 'Match Execution');

      expect(matchCheck?.status).toBe('degraded');
    });
  });

  describe('event bus check', () => {
    it('should report healthy with few events', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateEventBusSize(1000);
      const health = await engine.runHealthCheck();
      const busCheck = health.checks.find(c => c.name === 'Event Bus');

      expect(busCheck?.status).toBe('healthy');
    });

    it('should report degraded when approaching capacity', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateEventBusSize(8500); // 85% of 10000
      const health = await engine.runHealthCheck();
      const busCheck = health.checks.find(c => c.name === 'Event Bus');

      expect(busCheck?.status).toBe('degraded');
    });

    it('should report unhealthy when exceeding capacity', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateEventBusSize(11000); // > 10000
      const health = await engine.runHealthCheck();
      const busCheck = health.checks.find(c => c.name === 'Event Bus');

      expect(busCheck?.status).toBe('unhealthy');
    });
  });

  describe('AI services check', () => {
    it('should report healthy when Ollama responds', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();
      const aiCheck = health.checks.find(c => c.name === 'AI Services');

      expect(aiCheck?.status).toBe('healthy');
    });

    it('should report unhealthy when Ollama returns error', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const health = await engine.runHealthCheck();
      const aiCheck = health.checks.find(c => c.name === 'AI Services');

      expect(aiCheck?.status).toBe('unhealthy');
    });

    it('should report degraded when Ollama unreachable', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Connection refused'));

      const health = await engine.runHealthCheck();
      const aiCheck = health.checks.find(c => c.name === 'AI Services');

      expect(aiCheck?.status).toBe('degraded');
    });
  });

  describe('overall status', () => {
    it('should determine overall healthy status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(5);
      engine.updateEventBusSize(1000);

      const health = await engine.runHealthCheck();

      expect(health.overallStatus).toBe('healthy');
      expect(health.unhealthyCount).toBe(0);
    });

    it('should determine overall degraded status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(15); // Degraded
      engine.updateEventBusSize(1000);

      const health = await engine.runHealthCheck();

      expect(health.overallStatus).toBe('degraded');
      expect(health.degradedCount).toBeGreaterThan(0);
    });

    it('should determine overall unhealthy status', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Service down'));

      engine.updateActiveMatches(15);
      engine.updateEventBusSize(11000); // Unhealthy

      const health = await engine.runHealthCheck();

      expect(health.overallStatus).toBe('unhealthy');
      expect(health.unhealthyCount).toBeGreaterThan(0);
    });
  });

  describe('metrics tracking', () => {
    it('should track memory usage', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();

      expect(health.metrics.memoryUsageMB).toBeGreaterThanOrEqual(0);
    });

    it('should track uptime', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();

      expect(health.metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should track active matches', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(5);
      const health = await engine.runHealthCheck();

      expect(health.metrics.activeMatches).toBe(5);
    });

    it('should track event bus size', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateEventBusSize(3000);
      const health = await engine.runHealthCheck();

      expect(health.metrics.eventBusSize).toBe(3000);
    });
  });

  describe('report export', () => {
    it('should export health report as formatted text', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(2);
      engine.updateEventBusSize(2000);

      const health = await engine.runHealthCheck();
      const report = engine.exportHealthReport(health);

      expect(report).toContain('SYSTEM HEALTH REPORT');
      expect(report).toContain('Memory Usage');
      expect(report).toContain('Uptime');
      expect(report).toContain('Active Matches');
      expect(report).toContain('Event Bus Size');
    });

    it('should indicate system operational for healthy status', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      const health = await engine.runHealthCheck();
      const report = engine.exportHealthReport(health);

      expect(report).toContain('System operational');
    });
  });

  describe('realistic scenario', () => {
    it('should run full diagnostics under normal load', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(3);
      engine.updateEventBusSize(5000);

      const health = await engine.runHealthCheck();

      expect(health.overallStatus).toBe('healthy');
      expect(health.checks.length).toBe(5);
      expect(health.metrics.activeMatches).toBe(3);
      expect(health.metrics.eventBusSize).toBe(5000);

      const report = engine.exportHealthReport(health);
      expect(report).toContain('System operational');
    });

    it('should detect degradation under high load', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
      });

      engine.updateActiveMatches(12); // High match count
      engine.updateEventBusSize(8500); // Near capacity

      const health = await engine.runHealthCheck();

      expect(health.overallStatus).toBe('degraded');
      expect(health.degradedCount).toBeGreaterThan(0);
    });
  });
});
