import { describe, it, expect, beforeEach } from 'vitest';
import { HealthDashboard } from './health-dashboard.js';
import { Logger } from '../config/logger.js';
import type { SystemHealth } from './diagnostics-engine.js';

describe('HealthDashboard', () => {
  let dashboard: HealthDashboard;
  const logger = new Logger('error');

  const createMockHealth = (): SystemHealth => ({
    timestamp: new Date().toISOString(),
    overallStatus: 'healthy',
    checks: [
      {
        name: 'Memory Usage',
        status: 'healthy',
        message: 'Memory usage normal',
        metric: 256,
        threshold: 1024,
      },
      {
        name: 'AI Services',
        status: 'healthy',
        message: 'Ollama responding',
      },
    ],
    unhealthyCount: 0,
    degradedCount: 0,
    metrics: {
      memoryUsageMB: 256,
      uptime: 3600,
      activeMatches: 2,
      eventBusSize: 1000,
    },
  });

  beforeEach(() => {
    dashboard = new HealthDashboard(logger);
  });

  describe('dashboard generation', () => {
    it('should generate dashboard snapshot', () => {
      const health = createMockHealth();

      const dash = dashboard.generateDashboard(health);

      expect(dash.timestamp).toBeDefined();
      expect(dash.status).toBe('healthy');
      expect(dash.metrics).toBeDefined();
      expect(dash.alerts).toBeDefined();
      expect(dash.recentActivity).toBeDefined();
    });

    it('should extract metrics from health', () => {
      const health = createMockHealth();

      const dash = dashboard.generateDashboard(health);

      expect(dash.metrics.memoryUsageMB).toBe(256);
      expect(dash.metrics.uptime).toBe(3600);
      expect(dash.metrics.activeMatches).toBe(2);
      expect(dash.metrics.eventQueueSize).toBe(1000);
    });

    it('should include health status', () => {
      const health = createMockHealth();

      const dash = dashboard.generateDashboard(health);

      expect(dash.status).toBe('healthy');
      expect(dash.metrics.health).toEqual(health);
    });
  });

  describe('alert generation', () => {
    it('should generate alerts from unhealthy checks', () => {
      const health: SystemHealth = {
        ...createMockHealth(),
        overallStatus: 'unhealthy',
        unhealthyCount: 1,
        checks: [
          {
            name: 'AI Services',
            status: 'unhealthy',
            message: 'Ollama not responding',
          },
        ],
      };

      const dash = dashboard.generateDashboard(health);

      expect(dash.alerts.length).toBeGreaterThan(0);
      expect(dash.alerts[0].severity).toBe('critical');
      expect(dash.alerts[0].component).toBe('AI Services');
    });

    it('should generate warning alerts from degraded checks', () => {
      const health: SystemHealth = {
        ...createMockHealth(),
        overallStatus: 'degraded',
        degradedCount: 1,
        checks: [
          {
            name: 'Memory Usage',
            status: 'degraded',
            message: 'Memory usage elevated',
          },
        ],
      };

      const dash = dashboard.generateDashboard(health);

      expect(dash.alerts.length).toBeGreaterThan(0);
      expect(dash.alerts[0].severity).toBe('warning');
    });
  });

  describe('activity logging', () => {
    it('should record activity', () => {
      dashboard.recordActivity('Match started', 'Game');

      const log = dashboard.getActivityLog(1);
      expect(log.length).toBe(1);
      expect(log[0]).toContain('Match started');
      expect(log[0]).toContain('Game');
    });

    it('should maintain activity log limit', () => {
      for (let i = 0; i < 150; i++) {
        dashboard.recordActivity(`Event ${i}`, 'System');
      }

      const log = dashboard.getActivityLog();
      expect(log.length).toBeLessThanOrEqual(100);
    });

    it('should include timestamps in activity', () => {
      dashboard.recordActivity('Test activity', 'Test');

      const log = dashboard.getActivityLog(1);
      expect(log[0]).toMatch(/\d{4}-\d{2}-\d{2}/); // Date format
    });
  });

  describe('alert management', () => {
    it('should add alert', () => {
      const alert = {
        severity: 'warning' as const,
        message: 'Test warning',
        timestamp: new Date().toISOString(),
        component: 'Test',
      };

      dashboard.addAlert(alert);

      const alerts = dashboard.getRecentAlerts(1);
      expect(alerts.length).toBe(1);
      expect(alerts[0].message).toBe('Test warning');
    });

    it('should maintain alert limit', () => {
      for (let i = 0; i < 100; i++) {
        dashboard.addAlert({
          severity: 'info',
          message: `Alert ${i}`,
          timestamp: new Date().toISOString(),
          component: 'Test',
        });
      }

      const alerts = dashboard.getRecentAlerts(100);
      expect(alerts.length).toBeLessThanOrEqual(50);
    });
  });

  describe('export formats', () => {
    it('should export dashboard as HTML', () => {
      const health = createMockHealth();
      const dash = dashboard.generateDashboard(health);

      const html = dashboard.exportHTML(dash);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('AI Commander Health Dashboard');
      expect(html).toContain('256MB');
      expect(html).toContain('healthy');
    });

    it('should export dashboard as JSON', () => {
      const health = createMockHealth();
      const dash = dashboard.generateDashboard(health);

      const json = dashboard.exportJSON(dash);
      const parsed = JSON.parse(json);

      expect(parsed.status).toBe('healthy');
      expect(parsed.metrics.memoryUsageMB).toBe(256);
    });

    it('should export dashboard as ASCII', () => {
      const health = createMockHealth();
      const dash = dashboard.generateDashboard(health);

      const ascii = dashboard.exportASCII(dash);

      expect(ascii).toContain('AI COMMANDER HEALTH DASHBOARD');
      expect(ascii).toContain('METRICS');
      expect(ascii).toContain('256');
    });

    it('should escape HTML special characters in activity', () => {
      dashboard.recordActivity('<script>alert("xss")</script>', 'Test');

      const health = createMockHealth();
      const dash = dashboard.generateDashboard(health);
      const html = dashboard.exportHTML(dash);

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('realistic scenario', () => {
    it('should aggregate all monitoring data into dashboard', () => {
      const health = createMockHealth();

      dashboard.recordActivity('System started', 'Core');
      dashboard.recordActivity('Match 1 launched', 'Game');
      dashboard.recordActivity('Match 2 launched', 'Game');

      const dash = dashboard.generateDashboard(health);

      expect(dash.status).toBe('healthy');
      expect(dash.metrics.activeMatches).toBe(2);
      expect(dash.recentActivity.length).toBe(3);

      const ascii = dashboard.exportASCII(dash);
      expect(ascii).toContain('HEALTHY');
      expect(ascii).toContain('System started');
    });

    it('should display alerts and metrics in degraded state', () => {
      const health: SystemHealth = {
        ...createMockHealth(),
        overallStatus: 'degraded',
        degradedCount: 2,
        checks: [
          {
            name: 'Memory Usage',
            status: 'degraded',
            message: 'Memory approaching threshold',
          },
          {
            name: 'Match Execution',
            status: 'degraded',
            message: 'High active match count',
          },
        ],
        metrics: {
          ...createMockHealth().metrics,
          memoryUsageMB: 800,
          activeMatches: 12,
        },
      };

      dashboard.recordActivity('Memory warning triggered', 'System');
      dashboard.recordActivity('Load balancer activated', 'System');

      const dash = dashboard.generateDashboard(health);

      expect(dash.status).toBe('degraded');
      expect(dash.alerts.length).toBe(2);
      expect(dash.metrics.memoryUsageMB).toBe(800);
      expect(dash.metrics.activeMatches).toBe(12);

      const html = dashboard.exportHTML(dash);
      expect(html).toContain('degraded');
      expect(html).toContain('Memory approaching threshold');
    });
  });
});
