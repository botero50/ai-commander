/**
 * Story 60.1 — Continuous Runtime Validation
 *
 * Harness for running the Arena continuously and measuring:
 * - Match completion rate
 * - Recovery actions
 * - Stability metrics
 * - Resource usage
 * - System health
 */

import { Logger } from '../config/logger.js';
import type { ArenaSupervisor } from '../resilience/arena-supervisor.js';
import type { MatchRotation } from '../match/match-rotation.js';
import type { ArenaLifecycle } from '../arena/arena-lifecycle.js';

export interface RuntimeMetrics {
  readonly timestamp: number;
  readonly elapsedSeconds: number;
  readonly matchesCompleted: number;
  readonly matchesFailed: number;
  readonly recoveryActions: number;
  readonly rlInterfaceRecoveries: number;
  readonly brainRecoveries: number;
  readonly gameProcessRecoveries: number;
  readonly memoryUsageMB: number;
  readonly cpuUsagePercent: number;
  readonly avgMatchDuration: number;
  readonly isHealthy: boolean;
}

export interface ValidationConfig {
  readonly maxDuration: number; // milliseconds
  readonly metricsInterval: number; // milliseconds
  readonly targetMatches: number; // Stop after this many
  readonly stopOnCriticalFailure: boolean;
}

/**
 * Runtime validation harness for EPIC 60.
 * Monitors arena execution and collects metrics.
 */
export class RuntimeValidation {
  private logger: Logger;
  private config: ValidationConfig;
  private metrics: RuntimeMetrics[] = [];
  private startTime: number = 0;
  private matchCount: number = 0;
  private failureCount: number = 0;
  private metricsInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor(config: ValidationConfig, logger?: Logger) {
    this.logger = logger || new Logger('info', 'RuntimeValidation');
    this.config = config;
  }

  /**
   * Start validation run.
   * Periodically collects metrics from supervisor and rotation.
   */
  startValidation(
    supervisor: ArenaSupervisor,
    rotation: MatchRotation,
    lifecycle: ArenaLifecycle
  ): void {
    if (this.isRunning) {
      this.logger.warn('Validation already running');
      return;
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.metrics = [];
    this.matchCount = 0;
    this.failureCount = 0;

    this.logger.info('Runtime validation started', {
      maxDuration: this.config.maxDuration,
      targetMatches: this.config.targetMatches,
    });

    // Collect metrics periodically
    this.metricsInterval = setInterval(() => {
      this.collectMetrics(supervisor, rotation, lifecycle);
    }, this.config.metricsInterval);
  }

  /**
   * Stop validation run.
   */
  stopValidation(): void {
    this.isRunning = false;

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }

    const totalTime = (Date.now() - this.startTime) / 1000;

    this.logger.info('Runtime validation stopped', {
      totalSeconds: totalTime,
      matchesCompleted: this.matchCount,
      matchesFailed: this.failureCount,
      metricsCollected: this.metrics.length,
    });
  }

  /**
   * Collect current metrics snapshot.
   */
  private collectMetrics(
    supervisor: ArenaSupervisor,
    rotation: MatchRotation,
    lifecycle: ArenaLifecycle
  ): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.startTime) / 1000;

    // Check if we should stop
    if (this.shouldStop(elapsedSeconds)) {
      this.stopValidation();
      return;
    }

    // Get supervisor status
    const supervisorStatus = supervisor.getStatus();
    const supervisorStats = supervisor.getDetailedStats();

    // Get rotation stats
    const rotationStats = rotation.getStats();

    // Get lifecycle status
    const lifecycleStatus = lifecycle.getStatus();

    // Collect memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = memUsage.heapUsed / 1024 / 1024;

    // Estimate CPU usage (simplified - would need sampling)
    const cpuUsage = 0; // TODO: Implement CPU sampling

    const metric: RuntimeMetrics = {
      timestamp: now,
      elapsedSeconds,
      matchesCompleted: lifecycleStatus.matchesCompleted,
      matchesFailed: lifecycleStatus.totalMatches - lifecycleStatus.matchesCompleted,
      recoveryActions: supervisorStatus.recoveryActions,
      rlInterfaceRecoveries: supervisorStats.rl.successfulRecoveries,
      brainRecoveries: supervisorStats.brain.successfulRecoveries,
      gameProcessRecoveries: supervisorStats.game.successfulRestarts,
      memoryUsageMB: memoryMB,
      cpuUsagePercent: cpuUsage,
      avgMatchDuration:
        lifecycleStatus.matchesCompleted > 0
          ? lifecycleStatus.uptime / lifecycleStatus.matchesCompleted
          : 0,
      isHealthy: supervisorStatus.overallHealth !== 'failed',
    };

    this.metrics.push(metric);
    this.matchCount = metric.matchesCompleted;
    this.failureCount = metric.matchesFailed;

    // Log metrics periodically
    if (this.metrics.length % 6 === 0) {
      // Every 6 samples (assuming 10s interval = 60s)
      this.logger.info('Runtime metrics snapshot', {
        elapsed: `${Math.round(elapsedSeconds)}s`,
        matches: metric.matchesCompleted,
        recoveries: metric.recoveryActions,
        memory: `${memoryMB.toFixed(1)}MB`,
        health: metric.isHealthy ? 'healthy' : 'degraded',
      });
    }

    // Check for critical failures
    if (!metric.isHealthy && this.config.stopOnCriticalFailure) {
      this.logger.error('Critical failure detected, stopping validation');
      this.stopValidation();
    }
  }

  /**
   * Check if validation should stop.
   */
  private shouldStop(elapsedSeconds: number): boolean {
    // Stop if duration exceeded
    if (elapsedSeconds * 1000 > this.config.maxDuration) {
      this.logger.info('Max duration reached');
      return true;
    }

    // Stop if target matches reached
    if (this.matchCount >= this.config.targetMatches) {
      this.logger.info('Target matches reached');
      return true;
    }

    return false;
  }

  /**
   * Get all collected metrics.
   */
  getMetrics(): ReadonlyArray<RuntimeMetrics> {
    return Object.freeze([...this.metrics]);
  }

  /**
   * Get validation summary.
   */
  getSummary(): {
    totalDuration: number;
    totalMatches: number;
    failedMatches: number;
    successRate: number;
    avgMatchDuration: number;
    peakMemory: number;
    avgMemory: number;
    recoveryActions: number;
    finalHealth: string;
  } {
    if (this.metrics.length === 0) {
      return {
        totalDuration: 0,
        totalMatches: 0,
        failedMatches: 0,
        successRate: 0,
        avgMatchDuration: 0,
        peakMemory: 0,
        avgMemory: 0,
        recoveryActions: 0,
        finalHealth: 'unknown',
      };
    }

    const lastMetric = this.metrics[this.metrics.length - 1];
    const firstMetric = this.metrics[0];

    const totalDuration = lastMetric.elapsedSeconds;
    const totalMatches = lastMetric.matchesCompleted;
    const failedMatches = lastMetric.matchesFailed;
    const successRate = totalMatches > 0 ? (totalMatches / (totalMatches + failedMatches)) * 100 : 0;

    // Calculate average match duration
    const avgMatchDuration =
      totalMatches > 0 ? totalDuration / totalMatches : 0;

    // Calculate memory stats
    const memoryValues = this.metrics.map((m) => m.memoryUsageMB);
    const peakMemory = Math.max(...memoryValues);
    const avgMemory = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;

    // Calculate recovery actions
    const recoveryActions = lastMetric.recoveryActions;

    // Final health
    const finalHealth = lastMetric.isHealthy ? 'healthy' : 'degraded';

    return {
      totalDuration,
      totalMatches,
      failedMatches,
      successRate,
      avgMatchDuration,
      peakMemory,
      avgMemory,
      recoveryActions,
      finalHealth,
    };
  }

  /**
   * Check for memory leaks (simplified heuristic).
   */
  checkForMemoryLeak(): {
    hasLeak: boolean;
    growthRate: number; // MB per hour
    evidence: string;
  } {
    if (this.metrics.length < 10) {
      return {
        hasLeak: false,
        growthRate: 0,
        evidence: 'Insufficient data',
      };
    }

    // Compare first 10% and last 10% of metrics
    const earlyCount = Math.floor(this.metrics.length * 0.1);
    const earlyMetrics = this.metrics.slice(0, earlyCount);
    const lateMetrics = this.metrics.slice(-earlyCount);

    const earlyAvg = earlyMetrics.reduce((a, m) => a + m.memoryUsageMB, 0) / earlyMetrics.length;
    const lateAvg = lateMetrics.reduce((a, m) => a + m.memoryUsageMB, 0) / lateMetrics.length;

    const difference = lateAvg - earlyAvg;
    const totalDuration = this.metrics[this.metrics.length - 1].elapsedSeconds;
    const growthRate = (difference / (totalDuration / 3600)) * 1; // Per hour

    const hasLeak = growthRate > 5; // More than 5MB/hour growth

    const evidence = `Early avg: ${earlyAvg.toFixed(1)}MB, Late avg: ${lateAvg.toFixed(1)}MB, Growth: ${growthRate.toFixed(2)}MB/hour`;

    return {
      hasLeak,
      growthRate,
      evidence,
    };
  }

  /**
   * Generate test report.
   */
  generateReport(): string {
    const summary = this.getSummary();
    const memoryLeak = this.checkForMemoryLeak();

    const lines: string[] = [
      '═══════════════════════════════════════════════════════════',
      'EPIC 60.1 — RUNTIME VALIDATION REPORT',
      '═══════════════════════════════════════════════════════════',
      '',
      'OVERALL RESULTS',
      `Total Duration: ${summary.totalDuration.toFixed(1)}s`,
      `Total Matches: ${summary.totalMatches}`,
      `Failed Matches: ${summary.failedMatches}`,
      `Success Rate: ${summary.successRate.toFixed(1)}%`,
      `Average Match Duration: ${summary.avgMatchDuration.toFixed(1)}s`,
      '',
      'STABILITY',
      `Final Health: ${summary.finalHealth}`,
      `Recovery Actions: ${summary.recoveryActions}`,
      `Memory Leak Detected: ${memoryLeak.hasLeak ? 'YES ⚠️' : 'NO ✅'}`,
      `Memory Growth Rate: ${memoryLeak.growthRate.toFixed(2)}MB/hour`,
      `Peak Memory: ${summary.peakMemory.toFixed(1)}MB`,
      `Average Memory: ${summary.avgMemory.toFixed(1)}MB`,
      '',
      'RECOMMENDATIONS',
      memoryLeak.hasLeak ? '⚠️  Investigate memory leak - growth exceeds 5MB/hour' : '✅ Memory usage stable',
      summary.successRate < 95 ? '⚠️  Success rate below 95% - investigate failures' : '✅ Success rate acceptable',
      summary.recoveryActions > 10 ? '⚠️  High recovery action count - system unstable' : '✅ Recovery actions minimal',
      '',
      '═══════════════════════════════════════════════════════════',
    ];

    return lines.join('\n');
  }
}
