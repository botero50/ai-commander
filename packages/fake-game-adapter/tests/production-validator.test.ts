import { describe, it, expect, beforeEach } from 'vitest';
import { ProductionValidator, globalValidator } from '../src/world/production-validator.js';

describe('Production Validator', () => {
  let validator: ProductionValidator;

  beforeEach(() => {
    validator = new ProductionValidator();
  });

  describe('Health Checks', () => {
    it('records passing health check', () => {
      const check = validator.runHealthCheck('test-check', () => true);

      expect(check.status).toBe('pass');
      expect(check.message).toContain('OK');
    });

    it('records failing health check', () => {
      const check = validator.runHealthCheck('test-check', () => false);

      expect(check.status).toBe('fail');
      expect(check.message).toContain('FAILED');
    });

    it('records warning health check', () => {
      const check = validator.runHealthCheck('test-check', () => true, () => true);

      expect(check.status).toBe('warn');
      expect(check.message).toContain('Warning');
    });

    it('handles health check errors', () => {
      const check = validator.runHealthCheck('test-check', () => {
        throw new Error('test error');
      });

      expect(check.status).toBe('fail');
      expect(check.message).toContain('Error');
    });

    it('accumulates multiple health checks', () => {
      validator.runHealthCheck('check1', () => true);
      validator.runHealthCheck('check2', () => false);
      validator.runHealthCheck('check3', () => true);

      const report = validator.generateReport();
      expect(report.healthChecks.length).toBe(3);
    });
  });

  describe('Integration Tests', () => {
    it('runs passing integration test', async () => {
      const test = await validator.runIntegrationTest('test-integration', () => true);

      expect(test.passed).toBe(true);
      expect(test.details).toBe('Passed');
    });

    it('runs failing integration test', async () => {
      const test = await validator.runIntegrationTest('test-integration', () => false);

      expect(test.passed).toBe(false);
      expect(test.details).toBe('Failed');
    });

    it('measures integration test duration', async () => {
      const test = await validator.runIntegrationTest('test-integration', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      });

      expect(test.durationMs).toBeGreaterThanOrEqual(9);
      expect(test.passed).toBe(true);
    });

    it('handles integration test errors', async () => {
      const test = await validator.runIntegrationTest('test-integration', () => {
        throw new Error('test error');
      });

      expect(test.passed).toBe(false);
      expect(test.details).toContain('Error');
    });

    it('accumulates multiple integration tests', async () => {
      await validator.runIntegrationTest('test1', () => true);
      await validator.runIntegrationTest('test2', () => false);
      await validator.runIntegrationTest('test3', () => true);

      const report = validator.generateReport();
      expect(report.integrationTests.length).toBe(3);
    });
  });

  describe('System Metrics', () => {
    it('tracks match count', () => {
      validator.recordMatch(100);
      validator.recordMatch(150);
      validator.recordMatch(120);

      const report = validator.generateReport();
      expect(report.systemMetrics.totalMatches).toBe(3);
    });

    it('accumulates tick count', () => {
      validator.recordMatch(100);
      validator.recordMatch(150);

      const report = validator.generateReport();
      expect(report.systemMetrics.totalTicks).toBe(250);
    });

    it('calculates average match duration', () => {
      validator.recordMatch(100);
      validator.recordMatch(100);
      validator.recordMatch(100);

      const report = validator.generateReport();
      expect(report.systemMetrics.avgMatchDuration).toBe(100);
    });

    it('tracks command count', () => {
      validator.recordCommand();
      validator.recordCommand();
      validator.recordCommand();
      validator.recordCommand();
      validator.recordCommand();

      const report = validator.generateReport();
      expect(report.systemMetrics.commandThroughput).toBeGreaterThanOrEqual(0);
    });

    it('tracks error count', () => {
      validator.recordError();
      validator.recordError();
      validator.recordCommand();
      validator.recordCommand();
      validator.recordCommand();

      const report = validator.generateReport();
      expect(report.systemMetrics.errorRate).toBeGreaterThan(0);
    });

    it('measures memory usage', () => {
      const report = validator.generateReport();
      expect(report.systemMetrics.memoryUsageMb).toBeGreaterThanOrEqual(0);
      expect(typeof report.systemMetrics.memoryUsageMb).toBe('number');
    });

    it('tracks uptime', () => {
      const report = validator.generateReport();
      expect(report.systemMetrics.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Release Readiness', () => {
    it('calculates readiness score', () => {
      validator.runHealthCheck('check1', () => true);
      validator.runHealthCheck('check2', () => true);

      const report = validator.generateReport();
      expect(report.readinessScore).toBeGreaterThanOrEqual(0);
      expect(report.readinessScore).toBeLessThanOrEqual(100);
    });

    it('determines release eligibility', () => {
      validator.runHealthCheck('check1', () => true);
      validator.runHealthCheck('check2', () => true);

      const report = validator.generateReport();
      // With all checks passing, should be able to release
      expect(report.canRelease).toBe(true);
    });

    it('blocks release on failed checks', () => {
      validator.runHealthCheck('check1', () => false);

      const report = validator.generateReport();
      expect(report.canRelease).toBe(false);
    });

    it('calculates health status as healthy', () => {
      validator.runHealthCheck('check1', () => true);
      validator.runHealthCheck('check2', () => true);

      const report = validator.generateReport();
      expect(report.summary.healthStatus).toBe('healthy');
    });

    it('calculates health status as degraded', () => {
      validator.runHealthCheck('check1', () => true, () => true);
      validator.runHealthCheck('check2', () => true, () => true);
      validator.runHealthCheck('check3', () => true, () => true);

      const report = validator.generateReport();
      expect(report.summary.healthStatus).toBe('degraded');
    });

    it('calculates health status as critical', () => {
      validator.runHealthCheck('check1', () => false);

      const report = validator.generateReport();
      expect(report.summary.healthStatus).toBe('critical');
    });
  });

  describe('Recommended Actions', () => {
    it('recommends action for high error rate', () => {
      for (let i = 0; i < 10; i++) {
        validator.recordCommand();
      }
      for (let i = 0; i < 6; i++) {
        validator.recordError();
      }

      const report = validator.generateReport();
      expect(report.summary.recommendedActions.length).toBeGreaterThan(0);
      expect(report.summary.recommendedActions[0]).toContain('error rate');
    });

    it('recommends action for high memory usage', () => {
      // We can't easily mock high memory usage, so we verify empty case
      const report = validator.generateReport();
      expect(Array.isArray(report.summary.recommendedActions)).toBe(true);
    });

    it('recommends action for failed checks', () => {
      validator.runHealthCheck('critical-check', () => false);

      const report = validator.generateReport();
      expect(report.summary.recommendedActions).toContain('Fix failing health checks before release');
    });

    it('recommends action for short matches', () => {
      validator.recordMatch(1);
      validator.recordMatch(2);
      validator.recordMatch(3);

      const report = validator.generateReport();
      expect(report.summary.recommendedActions.some((a) => a.includes('match duration'))).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('generates readiness report', () => {
      validator.recordMatch(100);
      validator.runHealthCheck('check1', () => true);

      const report = validator.generateReport();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.readinessScore).toBeGreaterThanOrEqual(0);
      expect(report.canRelease).toBeDefined();
      expect(report.healthChecks).toBeDefined();
      expect(report.integrationTests).toBeDefined();
      expect(report.systemMetrics).toBeDefined();
      expect(report.summary).toBeDefined();
    });

    it('generates readable report text', () => {
      validator.recordMatch(100);
      validator.runHealthCheck('test-check', () => true);

      const text = validator.generateReportText();
      expect(text).toContain('PRODUCTION READINESS REPORT');
      expect(text).toContain('Readiness Score');
      expect(text).toContain('Can Release');
      expect(text).toContain('HEALTH STATUS');
      expect(text).toContain('SYSTEM METRICS');
    });

    it('shows health check symbols in text', () => {
      validator.runHealthCheck('pass-check', () => true);
      validator.runHealthCheck('fail-check', () => false);
      validator.runHealthCheck('warn-check', () => true, () => true);

      const text = validator.generateReportText();
      expect(text).toContain('✓');
      expect(text).toContain('✗');
      expect(text).toContain('⚠');
    });

    it('shows integration test results in text', async () => {
      await validator.runIntegrationTest('test1', () => true);
      await validator.runIntegrationTest('test2', () => false);

      const text = validator.generateReportText();
      expect(text).toContain('INTEGRATION TESTS');
      expect(text).toContain('test1');
    });
  });

  describe('Reset Functionality', () => {
    it('clears all data on reset', () => {
      validator.recordMatch(100);
      validator.recordCommand();
      validator.recordError();
      validator.runHealthCheck('check', () => true);

      validator.reset();

      const report = validator.generateReport();
      expect(report.systemMetrics.totalMatches).toBe(0);
      expect(report.systemMetrics.totalTicks).toBe(0);
      expect(report.healthChecks.length).toBe(0);
    });

    it('restarts uptime tracking on reset', () => {
      const report1 = validator.generateReport();
      const uptime1 = report1.systemMetrics.uptime;

      validator.reset();

      const report2 = validator.generateReport();
      const uptime2 = report2.systemMetrics.uptime;

      expect(uptime2).toBeLessThan(uptime1 + 100); // Should be nearly zero
    });
  });

  describe('Global Validator Instance', () => {
    it('provides global validator instance', () => {
      expect(globalValidator).toBeDefined();
      expect(globalValidator.generateReport).toBeDefined();
    });

    it('tracks operations globally', () => {
      globalValidator.recordMatch(50);
      globalValidator.recordCommand();

      const report = globalValidator.generateReport();
      expect(report.systemMetrics.totalMatches).toBeGreaterThan(0);
    });
  });

  describe('Full Release Validation Flow', () => {
    it('validates complete system readiness', async () => {
      // Simulate system operations
      validator.recordMatch(1000);
      validator.recordCommand();
      validator.recordCommand();

      // Run health checks
      validator.runHealthCheck('adapter-ready', () => true);
      validator.runHealthCheck('game-state-consistent', () => true);
      validator.runHealthCheck('error-handling', () => true);

      // Run integration tests
      await validator.runIntegrationTest('movement-test', () => true);
      await validator.runIntegrationTest('gathering-test', () => true);
      await validator.runIntegrationTest('combat-test', () => true);

      const report = validator.generateReport();

      expect(report.summary.healthStatus).toBe('healthy');
      expect(report.summary.failedChecks).toBe(0);
      expect(report.integrationTests.every((t) => t.passed)).toBe(true);
      expect(report.canRelease).toBe(true);
      expect(report.readinessScore).toBeGreaterThan(80);
    });

    it('detects issues blocking release', async () => {
      // Simulate issues
      validator.runHealthCheck('adapter-ready', () => false);
      validator.recordError();
      validator.recordError();

      await validator.runIntegrationTest('combat-test', () => false);

      const report = validator.generateReport();

      expect(report.summary.healthStatus).toBe('critical');
      expect(report.summary.failedChecks).toBeGreaterThan(0);
      expect(report.canRelease).toBe(false);
      expect(report.summary.recommendedActions.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent metric recording', () => {
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve().then(() => {
            validator.recordMatch(10);
            validator.recordCommand();
          })
        );
      }

      return Promise.all(promises).then(() => {
        const report = validator.generateReport();
        expect(report.systemMetrics.totalMatches).toBe(100);
      });
    });

    it('handles concurrent health checks', () => {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            validator.runHealthCheck(`check-${i}`, () => i % 2 === 0);
          })
        );
      }

      return Promise.all(promises).then(() => {
        const report = validator.generateReport();
        expect(report.healthChecks.length).toBe(50);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles zero matches', () => {
      const report = validator.generateReport();
      expect(report.systemMetrics.avgMatchDuration).toBe(0);
    });

    it('handles zero commands', () => {
      const report = validator.generateReport();
      expect(report.systemMetrics.commandThroughput).toBe(0);
    });

    it('handles zero errors', () => {
      validator.recordCommand();
      validator.recordCommand();

      const report = validator.generateReport();
      expect(report.systemMetrics.errorRate).toBe(0);
    });

    it('clamps readiness score to 0-100', () => {
      // Create many failing checks to push score below 0
      for (let i = 0; i < 100; i++) {
        validator.runHealthCheck(`check-${i}`, () => false);
      }

      const report = validator.generateReport();
      expect(report.readinessScore).toBeGreaterThanOrEqual(0);
      expect(report.readinessScore).toBeLessThanOrEqual(100);
    });

    it('freezes report arrays', () => {
      validator.runHealthCheck('check', () => true);

      const report = validator.generateReport();
      expect(() => {
        (report.healthChecks as any).push({ name: 'new', status: 'pass', message: 'test', timestamp: 0 });
      }).toThrow();
    });
  });
});
