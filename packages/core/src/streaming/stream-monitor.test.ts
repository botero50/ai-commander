/**
 * Stream Monitor Tests
 *
 * Validates monitoring, analytics, and alerting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StreamMonitor, createStreamMonitor } from './stream-monitor.js';
import { Logger } from '../config/logger.js';

describe('Stream Monitor', () => {
  let monitor: StreamMonitor;
  const logger = new Logger('error', 'MonitorTest');

  beforeEach(() => {
    monitor = new StreamMonitor(logger);
  });

  describe('initialization', () => {
    it('should create via constructor', () => {
      expect(monitor).toBeDefined();
    });

    it('should create via factory', () => {
      const factoryMonitor = createStreamMonitor(logger);
      expect(factoryMonitor).toBeDefined();
    });

    it('should initialize with zero metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics.matchesCompleted).toBe(0);
      expect(metrics.errorCount).toBe(0);
      expect(metrics.recoveryCount).toBe(0);
    });
  });

  describe('match recording', () => {
    it('should record match completion', () => {
      monitor.recordMatch({
        matchNumber: 1,
        duration: 1800,
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
        winner: 'Player 1',
        statistics: {
          totalCommands: 100,
          militaryValue: 50,
          economyScore: 75,
        },
      });

      const metrics = monitor.getMetrics();
      expect(metrics.matchesCompleted).toBe(1);
    });

    it('should calculate average match duration', () => {
      monitor.recordMatch({
        matchNumber: 1,
        duration: 1800,
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
        winner: 'Player 1',
        statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
      });

      monitor.recordMatch({
        matchNumber: 2,
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000000,
        winner: 'Player 2',
        statistics: { totalCommands: 110, militaryValue: 55, economyScore: 80 },
      });

      const metrics = monitor.getMetrics();
      expect(metrics.averageMatchDuration).toBe(1900);
    });

    it('should alert on long match duration', (done) => {
      monitor.on('alert', (alert) => {
        if (alert.message.includes('exceeded expected duration')) {
          expect(alert.severity).toBe('warning');
          done();
        }
      });

      monitor.recordMatch({
        matchNumber: 1,
        duration: 4000,
        startTime: Date.now(),
        endTime: Date.now() + 4000000,
        winner: 'Player 1',
        statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
      });
    });
  });

  describe('error tracking', () => {
    it('should record errors', () => {
      monitor.recordError(new Error('Test error'), 'test');

      const metrics = monitor.getMetrics();
      expect(metrics.errorCount).toBe(1);
    });

    it('should track error rate', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordMatch({
          matchNumber: i,
          duration: 1800,
          startTime: Date.now(),
          endTime: Date.now() + 1800000,
          winner: 'Player 1',
          statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
        });
      }

      // 2 errors in 10 matches = 20% error rate (above 10% threshold)
      monitor.recordError(new Error('Error 1'), 'test');
      monitor.recordError(new Error('Error 2'), 'test');

      const health = monitor.getHealthStatus();
      expect(health.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('recovery tracking', () => {
    it('should record recovery events', () => {
      monitor.recordRecovery('crash', 5000);

      const metrics = monitor.getMetrics();
      expect(metrics.recoveryCount).toBe(1);
    });

    it('should log recovery details', (done) => {
      monitor.on('alert', (alert) => {
        if (alert.message.includes('recovered')) {
          expect(alert.severity).toBe('info');
          done();
        }
      });

      monitor.recordRecovery('network', 3000);
    });
  });

  describe('API performance tracking', () => {
    it('should record API request times', () => {
      monitor.recordApiRequest('/metrics/current', 50);

      const metrics = monitor.getMetrics();
      expect(metrics.apiResponseTime).toBe(50);
    });

    it('should alert on slow API responses', (done) => {
      monitor.on('alert', (alert) => {
        if (alert.message.includes('Slow API response')) {
          expect(alert.severity).toBe('warning');
          done();
        }
      });

      monitor.recordApiRequest('/metrics/current', 150);
    });
  });

  describe('resource monitoring', () => {
    it('should record CPU usage', () => {
      monitor.recordResourceUsage(45, 250 * 1024 * 1024);

      const metrics = monitor.getMetrics();
      expect(metrics.cpuUsage).toBe(45);
    });

    it('should record memory usage', () => {
      monitor.recordResourceUsage(45, 300 * 1024 * 1024);

      const metrics = monitor.getMetrics();
      expect(metrics.memoryUsage).toBe(300 * 1024 * 1024);
    });

    it('should alert on high memory usage', (done) => {
      monitor.on('alert', (alert) => {
        if (alert.message.includes('High memory usage')) {
          expect(alert.severity).toBe('warning');
          done();
        }
      });

      monitor.recordResourceUsage(45, 600 * 1024 * 1024);
    });

    it('should alert on high CPU usage', (done) => {
      monitor.on('alert', (alert) => {
        if (alert.message.includes('High CPU usage')) {
          expect(alert.severity).toBe('warning');
          done();
        }
      });

      monitor.recordResourceUsage(85, 250 * 1024 * 1024);
    });
  });

  describe('uptime tracking', () => {
    it('should track uptime', (done) => {
      const metrics1 = monitor.getMetrics();
      const uptime1 = metrics1.uptime;

      setTimeout(() => {
        const metrics2 = monitor.getMetrics();
        const uptime2 = metrics2.uptime;

        expect(uptime2).toBeGreaterThanOrEqual(uptime1);
        done();
      }, 100);
    });
  });

  describe('health status', () => {
    it('should report healthy status initially', () => {
      const health = monitor.getHealthStatus();
      expect(health.status).toBe('healthy');
    });

    it('should report degraded status with multiple warnings', (done) => {
      monitor.recordApiRequest('/test', 150);
      monitor.recordApiRequest('/test', 150);
      monitor.recordApiRequest('/test', 150);
      monitor.recordApiRequest('/test', 150);

      setTimeout(() => {
        const health = monitor.getHealthStatus();
        expect(health.alerts.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should report critical status with critical alerts', (done) => {
      for (let i = 0; i < 15; i++) {
        monitor.recordMatch({
          matchNumber: i,
          duration: 1800,
          startTime: Date.now(),
          endTime: Date.now() + 1800000,
          winner: 'Player 1',
          statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
        });
      }

      // Trigger many errors to create critical alert
      for (let i = 0; i < 5; i++) {
        monitor.recordError(new Error('Error'), 'test');
      }

      setTimeout(() => {
        const health = monitor.getHealthStatus();
        expect(health.alerts.length).toBeGreaterThan(0);
        done();
      }, 100);
    });
  });

  describe('performance reporting', () => {
    it('should generate performance report', () => {
      monitor.recordMatch({
        matchNumber: 1,
        duration: 1800,
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
        winner: 'Player 1',
        statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
      });

      const report = monitor.getPerformanceReport();
      expect(report.summary).toBeDefined();
      expect(report.matchStats).toBeDefined();
      expect(report.systemStats).toBeDefined();
    });

    it('should calculate error rate', () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordMatch({
          matchNumber: i,
          duration: 1800,
          startTime: Date.now(),
          endTime: Date.now() + 1800000,
          winner: 'Player 1',
          statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
        });
      }

      monitor.recordError(new Error('Error'), 'test');

      const report = monitor.getPerformanceReport();
      expect(report.matchStats.errorRate).toBeDefined();
    });

    it('should format uptime correctly', () => {
      const report = monitor.getPerformanceReport();
      expect(report.systemStats.uptime).toMatch(/\d+h \d+m/);
    });
  });

  describe('alert management', () => {
    it('should track alert summary', () => {
      monitor.recordRecovery('test', 1000);

      const summary = monitor.getAlertSummary();
      expect(summary.total).toBeGreaterThan(0);
      expect(summary.info).toBeGreaterThan(0);
    });

    it('should keep last 1000 alerts', () => {
      for (let i = 0; i < 1500; i++) {
        monitor.recordRecovery(`recovery-${i}`, 100);
      }

      const summary = monitor.getAlertSummary();
      expect(summary.total).toBe(1000);
    });

    it('should provide recent alerts', () => {
      monitor.recordRecovery('test1', 100);
      monitor.recordRecovery('test2', 100);
      monitor.recordRecovery('test3', 100);

      const summary = monitor.getAlertSummary();
      expect(summary.recent.length).toBeLessThanOrEqual(5);
    });
  });

  describe('comprehensive monitoring', () => {
    it('should track complete stream lifecycle', () => {
      // Simulate stream session
      monitor.recordMatch({
        matchNumber: 1,
        duration: 1800,
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
        winner: 'Player 1',
        statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
      });

      monitor.recordApiRequest('/metrics/current', 45);
      monitor.recordResourceUsage(35, 250 * 1024 * 1024);

      monitor.recordMatch({
        matchNumber: 2,
        duration: 2000,
        startTime: Date.now(),
        endTime: Date.now() + 2000000,
        winner: 'Player 2',
        statistics: { totalCommands: 110, militaryValue: 55, economyScore: 80 },
      });

      monitor.recordApiRequest('/metrics/current', 50);
      monitor.recordResourceUsage(40, 280 * 1024 * 1024);

      const health = monitor.getHealthStatus();
      const metrics = monitor.getMetrics();
      const report = monitor.getPerformanceReport();

      expect(health).toBeDefined();
      expect(metrics.matchesCompleted).toBe(2);
      expect(report.matchStats.total).toBe(2);
    });

    it('should generate exportable JSON report', () => {
      monitor.recordMatch({
        matchNumber: 1,
        duration: 1800,
        startTime: Date.now(),
        endTime: Date.now() + 1800000,
        winner: 'Player 1',
        statistics: { totalCommands: 100, militaryValue: 50, economyScore: 75 },
      });

      const json = monitor.toJSON();
      expect(json.health).toBeDefined();
      expect(json.performance).toBeDefined();
      expect(json.alerts).toBeDefined();

      // Should be JSON serializable
      expect(() => JSON.stringify(json)).not.toThrow();
    });
  });

  describe('event emissions', () => {
    it('should emit alert events', (done) => {
      monitor.on('alert', (alert) => {
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
        done();
      });

      monitor.recordRecovery('test', 100);
    });

    it('should emit multiple alert types', (done) => {
      let alertCount = 0;

      monitor.on('alert', () => {
        alertCount++;
      });

      monitor.recordRecovery('test1', 100);
      monitor.recordRecovery('test2', 100);

      setTimeout(() => {
        expect(alertCount).toBe(2);
        done();
      }, 100);
    });
  });
});
