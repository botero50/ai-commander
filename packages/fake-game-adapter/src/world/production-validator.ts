/**
 * Production validation framework for autonomous RTS gameplay
 */

export interface HealthCheck {
  readonly name: string;
  readonly status: 'pass' | 'fail' | 'warn';
  readonly message: string;
  readonly timestamp: number;
}

export interface IntegrationTest {
  readonly name: string;
  readonly passed: boolean;
  readonly durationMs: number;
  readonly details: string;
  readonly timestamp: number;
}

export interface ReleaseReadinessReport {
  readonly timestamp: number;
  readonly readinessScore: number; // 0-100
  readonly canRelease: boolean;
  readonly healthChecks: ReadonlyArray<HealthCheck>;
  readonly integrationTests: ReadonlyArray<IntegrationTest>;
  readonly systemMetrics: SystemMetrics;
  readonly summary: ReleaseSummary;
}

export interface SystemMetrics {
  readonly uptime: number;
  readonly totalMatches: number;
  readonly totalTicks: number;
  readonly avgMatchDuration: number;
  readonly commandThroughput: number;
  readonly errorRate: number;
  readonly memoryUsageMb: number;
  readonly cpuUsagePercent: number;
}

export interface ReleaseSummary {
  readonly healthStatus: 'healthy' | 'degraded' | 'critical';
  readonly criticalIssues: number;
  readonly warningCount: number;
  readonly passedChecks: number;
  readonly failedChecks: number;
  readonly recommendedActions: ReadonlyArray<string>;
}

/**
 * Production validator for release readiness
 */
export class ProductionValidator {
  private startTime = Date.now();
  private matchCount = 0;
  private tickCount = 0;
  private commandCount = 0;
  private errorCount = 0;
  private healthChecks: HealthCheck[] = [];
  private integrationTests: IntegrationTest[] = [];

  recordMatch(durationTicks: number): void {
    this.matchCount++;
    this.tickCount += durationTicks;
  }

  recordCommand(): void {
    this.commandCount++;
  }

  recordError(): void {
    this.errorCount++;
  }

  runHealthCheck(name: string, checkFn: () => boolean, warningCondition?: () => boolean): HealthCheck {
    const timestamp = Date.now();
    let status: 'pass' | 'fail' | 'warn' = 'pass';
    let message = `${name}: OK`;

    try {
      const passed = checkFn();
      if (!passed) {
        status = 'fail';
        message = `${name}: FAILED`;
      } else if (warningCondition?.()) {
        status = 'warn';
        message = `${name}: Warning condition detected`;
      }
    } catch (error) {
      status = 'fail';
      message = `${name}: Error - ${error instanceof Error ? error.message : String(error)}`;
    }

    const check: HealthCheck = { name, status, message, timestamp };
    this.healthChecks.push(check);
    return check;
  }

  runIntegrationTest(name: string, testFn: () => Promise<boolean> | boolean): Promise<IntegrationTest> {
    return Promise.resolve().then(async () => {
      const startTime = performance.now();
      let passed = false;
      let details = '';

      try {
        passed = await testFn();
        details = passed ? 'Passed' : 'Failed';
      } catch (error) {
        passed = false;
        details = `Error: ${error instanceof Error ? error.message : String(error)}`;
      }

      const durationMs = performance.now() - startTime;
      const test: IntegrationTest = {
        name,
        passed,
        durationMs,
        details,
        timestamp: Date.now(),
      };

      this.integrationTests.push(test);
      return test;
    });
  }

  private calculateSystemMetrics(): SystemMetrics {
    const uptime = Date.now() - this.startTime;
    const avgMatchDuration = this.matchCount > 0 ? this.tickCount / this.matchCount : 0;
    const commandThroughput = uptime > 0 ? (this.commandCount / (uptime / 1000)) : 0;
    const errorRate = this.commandCount > 0 ? (this.errorCount / this.commandCount) * 100 : 0;
    const memoryUsageMb = Math.round((process.memoryUsage?.().heapUsed || 0) / 1024 / 1024);

    return {
      uptime,
      totalMatches: this.matchCount,
      totalTicks: this.tickCount,
      avgMatchDuration,
      commandThroughput,
      errorRate,
      memoryUsageMb,
      cpuUsagePercent: 0, // Would require process.cpuUsage() on Node.js
    };
  }

  generateReport(): ReleaseReadinessReport {
    const systemMetrics = this.calculateSystemMetrics();

    const passedChecks = this.healthChecks.filter((c) => c.status === 'pass').length;
    const failedChecks = this.healthChecks.filter((c) => c.status === 'fail').length;
    const warningCount = this.healthChecks.filter((c) => c.status === 'warn').length;

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (failedChecks > 0) {
      healthStatus = 'critical';
    } else if (warningCount > 2) {
      healthStatus = 'degraded';
    }

    const recommendedActions: string[] = [];

    if (systemMetrics.errorRate > 5) {
      recommendedActions.push('High error rate detected - investigate command failures');
    }
    if (systemMetrics.memoryUsageMb > 500) {
      recommendedActions.push('Memory usage elevated - consider optimization');
    }
    if (failedChecks > 0) {
      recommendedActions.push('Fix failing health checks before release');
    }
    if (systemMetrics.avgMatchDuration < 10) {
      recommendedActions.push('Average match duration very short - verify gameplay loop');
    }

    const summary: ReleaseSummary = {
      healthStatus,
      criticalIssues: failedChecks,
      warningCount,
      passedChecks,
      failedChecks,
      recommendedActions,
    };

    const readinessScore =
      (passedChecks / (this.healthChecks.length || 1)) * 100 - warningCount * 5 - failedChecks * 20;

    const canRelease = failedChecks === 0 && readinessScore >= 80;

    return {
      timestamp: Date.now(),
      readinessScore: Math.max(0, Math.min(100, readinessScore)),
      canRelease,
      healthChecks: Object.freeze([...this.healthChecks]),
      integrationTests: Object.freeze([...this.integrationTests]),
      systemMetrics,
      summary,
    };
  }

  generateReportText(): string {
    const report = this.generateReport();

    let text = `\n=== PRODUCTION READINESS REPORT ===\n`;
    text += `Timestamp: ${new Date(report.timestamp).toISOString()}\n`;
    text += `Readiness Score: ${report.readinessScore.toFixed(1)}/100\n`;
    text += `Can Release: ${report.canRelease ? 'YES ✓' : 'NO ✗'}\n\n`;

    text += `--- HEALTH STATUS ---\n`;
    text += `Status: ${report.summary.healthStatus.toUpperCase()}\n`;
    text += `Passed: ${report.summary.passedChecks}\n`;
    text += `Failed: ${report.summary.failedChecks}\n`;
    text += `Warnings: ${report.summary.warningCount}\n\n`;

    text += `--- HEALTH CHECKS ---\n`;
    for (const check of report.healthChecks) {
      const symbol = check.status === 'pass' ? '✓' : check.status === 'fail' ? '✗' : '⚠';
      text += `${symbol} ${check.message}\n`;
    }
    text += '\n';

    text += `--- INTEGRATION TESTS ---\n`;
    text += `Total: ${report.integrationTests.length}\n`;
    text += `Passed: ${report.integrationTests.filter((t) => t.passed).length}\n`;
    for (const test of report.integrationTests.slice(-5)) {
      const symbol = test.passed ? '✓' : '✗';
      text += `${symbol} ${test.name} (${test.durationMs.toFixed(0)}ms)\n`;
    }
    text += '\n';

    text += `--- SYSTEM METRICS ---\n`;
    text += `Uptime: ${(report.systemMetrics.uptime / 1000).toFixed(1)}s\n`;
    text += `Total Matches: ${report.systemMetrics.totalMatches}\n`;
    text += `Total Ticks: ${report.systemMetrics.totalTicks}\n`;
    text += `Avg Match Duration: ${report.systemMetrics.avgMatchDuration.toFixed(0)} ticks\n`;
    text += `Command Throughput: ${report.systemMetrics.commandThroughput.toFixed(0)} ops/sec\n`;
    text += `Error Rate: ${report.systemMetrics.errorRate.toFixed(2)}%\n`;
    text += `Memory Usage: ${report.systemMetrics.memoryUsageMb}MB\n\n`;

    if (report.summary.recommendedActions.length > 0) {
      text += `--- RECOMMENDED ACTIONS ---\n`;
      for (const action of report.summary.recommendedActions) {
        text += `• ${action}\n`;
      }
    }

    return text;
  }

  reset(): void {
    this.startTime = Date.now();
    this.matchCount = 0;
    this.tickCount = 0;
    this.commandCount = 0;
    this.errorCount = 0;
    this.healthChecks = [];
    this.integrationTests = [];
  }
}

/**
 * Global production validator instance
 */
export const globalValidator = new ProductionValidator();
