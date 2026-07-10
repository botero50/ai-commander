/**
 * Story 54.1 — Diagnostics Engine
 *
 * Comprehensive health check system for runtime monitoring.
 * Detects and reports on system health, performance, resource usage.
 */

import { Logger } from '../config/logger.js';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  metric?: number;
  threshold?: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  timestamp: string;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
  unhealthyCount: number;
  degradedCount: number;
  metrics: {
    memoryUsageMB: number;
    uptime: number;
    activeMatches: number;
    eventBusSize: number;
  };
}

export class DiagnosticsEngine {
  private logger: Logger;
  private startTime: number;
  private activeMatches: number = 0;
  private eventBusSize: number = 0;

  constructor(logger: Logger) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<SystemHealth> {
    const checks: HealthCheckResult[] = [];

    // Memory check
    checks.push(this.checkMemory());

    // Uptime check
    checks.push(this.checkUptime());

    // Match execution check
    checks.push(this.checkMatchExecution());

    // Event bus check
    checks.push(this.checkEventBus());

    // AI service connectivity check
    checks.push(await this.checkAIServices());

    // Determine overall status
    const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
    const degradedCount = checks.filter(c => c.status === 'degraded').length;
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      unhealthyCount > 0 ? 'unhealthy' : degradedCount > 0 ? 'degraded' : 'healthy';

    const uptime = (Date.now() - this.startTime) / 1000;
    const memUsage = this.getMemoryUsage();

    this.logger.info('Health check completed', {
      overall: overallStatus,
      unhealthy: unhealthyCount,
      degraded: degradedCount,
      uptime,
    });

    return {
      timestamp: new Date().toISOString(),
      overallStatus,
      checks,
      unhealthyCount,
      degradedCount,
      metrics: {
        memoryUsageMB: memUsage,
        uptime,
        activeMatches: this.activeMatches,
        eventBusSize: this.eventBusSize,
      },
    };
  }

  /**
   * Check memory usage
   */
  private checkMemory(): HealthCheckResult {
    const memUsage = this.getMemoryUsage();
    const maxMemory = 1024; // 1GB threshold

    if (memUsage > maxMemory) {
      return {
        name: 'Memory Usage',
        status: 'unhealthy',
        message: `Memory usage critical: ${memUsage}MB > ${maxMemory}MB`,
        metric: memUsage,
        threshold: maxMemory,
      };
    } else if (memUsage > maxMemory * 0.75) {
      return {
        name: 'Memory Usage',
        status: 'degraded',
        message: `Memory usage elevated: ${memUsage}MB`,
        metric: memUsage,
        threshold: maxMemory,
      };
    }

    return {
      name: 'Memory Usage',
      status: 'healthy',
      message: `Memory usage normal: ${memUsage}MB`,
      metric: memUsage,
      threshold: maxMemory,
    };
  }

  /**
   * Check uptime
   */
  private checkUptime(): HealthCheckResult {
    const uptime = (Date.now() - this.startTime) / 1000;
    const maxUptime = 86400; // 24 hours

    if (uptime > maxUptime * 0.95) {
      return {
        name: 'Uptime',
        status: 'degraded',
        message: `Process nearing restart threshold: ${Math.floor(uptime)}s`,
        metric: uptime,
        threshold: maxUptime,
      };
    }

    return {
      name: 'Uptime',
      status: 'healthy',
      message: `Process uptime healthy: ${Math.floor(uptime)}s`,
      metric: uptime,
    };
  }

  /**
   * Check match execution capability
   */
  private checkMatchExecution(): HealthCheckResult {
    if (this.activeMatches > 10) {
      return {
        name: 'Match Execution',
        status: 'degraded',
        message: `High active match count: ${this.activeMatches}`,
        metric: this.activeMatches,
        threshold: 10,
      };
    }

    if (this.activeMatches > 0) {
      return {
        name: 'Match Execution',
        status: 'healthy',
        message: `Match execution operational: ${this.activeMatches} active`,
        metric: this.activeMatches,
      };
    }

    return {
      name: 'Match Execution',
      status: 'healthy',
      message: 'Match execution ready',
      metric: 0,
    };
  }

  /**
   * Check event bus
   */
  private checkEventBus(): HealthCheckResult {
    const maxEvents = 10000;

    if (this.eventBusSize > maxEvents) {
      return {
        name: 'Event Bus',
        status: 'unhealthy',
        message: `Event bus overflow: ${this.eventBusSize} events > ${maxEvents}`,
        metric: this.eventBusSize,
        threshold: maxEvents,
      };
    }

    if (this.eventBusSize > maxEvents * 0.8) {
      return {
        name: 'Event Bus',
        status: 'degraded',
        message: `Event bus approaching capacity: ${this.eventBusSize}/${maxEvents}`,
        metric: this.eventBusSize,
        threshold: maxEvents,
      };
    }

    return {
      name: 'Event Bus',
      status: 'healthy',
      message: `Event bus healthy: ${this.eventBusSize} events`,
      metric: this.eventBusSize,
      threshold: maxEvents,
    };
  }

  /**
   * Check AI services connectivity
   */
  private async checkAIServices(): Promise<HealthCheckResult> {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        timeout: 5000,
      } as any);

      if (response.ok) {
        return {
          name: 'AI Services',
          status: 'healthy',
          message: 'Ollama service responding',
        };
      } else {
        return {
          name: 'AI Services',
          status: 'unhealthy',
          message: `Ollama returned status ${response.status}`,
          details: { status: response.status },
        };
      }
    } catch (error) {
      return {
        name: 'AI Services',
        status: 'degraded',
        message: 'Cannot reach Ollama service',
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Update active match count (call from match manager)
   */
  updateActiveMatches(count: number): void {
    this.activeMatches = count;
  }

  /**
   * Update event bus size (call from event bus)
   */
  updateEventBusSize(size: number): void {
    this.eventBusSize = size;
  }

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return Math.round(usage.heapUsed / 1024 / 1024);
    }
    return 0;
  }

  /**
   * Export health check as report
   */
  exportHealthReport(health: SystemHealth): string {
    const lines = [
      '═'.repeat(50),
      'SYSTEM HEALTH REPORT',
      '═'.repeat(50),
      '',
      `Timestamp: ${health.timestamp}`,
      `Overall Status: ${health.overallStatus.toUpperCase()}`,
      '',
      '─── METRICS ───',
      `Memory Usage: ${health.metrics.memoryUsageMB}MB`,
      `Uptime: ${Math.floor(health.metrics.uptime)}s`,
      `Active Matches: ${health.metrics.activeMatches}`,
      `Event Bus Size: ${health.metrics.eventBusSize}`,
      '',
      '─── HEALTH CHECKS ───',
    ];

    for (const check of health.checks) {
      const icon = check.status === 'healthy' ? '✓' : check.status === 'degraded' ? '⚠' : '✗';
      lines.push(`${icon} ${check.name}: ${check.status.toUpperCase()}`);
      lines.push(`  ${check.message}`);

      if (check.metric !== undefined && check.threshold !== undefined) {
        lines.push(`  ${check.metric} / ${check.threshold}`);
      }
    }

    lines.push('', '═'.repeat(50));

    if (health.unhealthyCount === 0) {
      lines.push('System operational');
    } else {
      lines.push(`${health.unhealthyCount} critical issue(s) detected`);
    }

    lines.push('═'.repeat(50));

    return lines.join('\n');
  }
}
