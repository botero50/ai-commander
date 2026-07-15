/**
 * Stream Monitoring & Analytics
 *
 * Real-time monitoring of stream health and performance.
 * Tracks:
 * - Match duration and performance
 * - Error rates and recovery
 * - System resource usage
 * - API response times
 * - Broadcast overlay connectivity
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface MatchMetrics {
  matchNumber: number;
  duration: number; // seconds
  startTime: number;
  endTime: number;
  winner: string;
  statistics: {
    totalCommands: number;
    militaryValue: number;
    economyScore: number;
  };
}

export interface StreamMetrics {
  uptime: number; // seconds
  matchesCompleted: number;
  averageMatchDuration: number;
  errorCount: number;
  recoveryCount: number;
  apiResponseTime: number; // ms
  cpuUsage: number; // percent
  memoryUsage: number; // bytes
}

export interface HealthAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'performance' | 'error' | 'resource' | 'connectivity';
  message: string;
  timestamp: string;
  data?: Record<string, any>;
}

export class StreamMonitor extends EventEmitter {
  private logger: Logger;
  private startTime: number = 0;
  private matchMetrics: MatchMetrics[] = [];
  private alerts: HealthAlert[] = [];
  private metrics: StreamMetrics = {
    uptime: 0,
    matchesCompleted: 0,
    averageMatchDuration: 0,
    errorCount: 0,
    recoveryCount: 0,
    apiResponseTime: 0,
    cpuUsage: 0,
    memoryUsage: 0,
  };

  // Thresholds for alerts
  private thresholds = {
    maxErrorRate: 0.1, // 10% errors triggers warning
    maxMemoryUsage: 500 * 1024 * 1024, // 500MB
    maxCpuUsage: 80, // 80%
    maxApiResponseTime: 100, // 100ms
    maxMatchDuration: 3600, // 60 minutes (warning if longer)
  };

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'StreamMonitor');
    this.startTime = Date.now();
  }

  /**
   * Record a completed match
   */
  recordMatch(metrics: MatchMetrics): void {
    this.matchMetrics.push(metrics);
    this.metrics.matchesCompleted = this.matchMetrics.length;

    // Calculate average match duration
    const totalDuration = this.matchMetrics.reduce((sum, m) => sum + m.duration, 0);
    this.metrics.averageMatchDuration = Math.floor(totalDuration / this.matchMetrics.length);

    // Check for anomalies
    if (metrics.duration > this.thresholds.maxMatchDuration) {
      this.addAlert({
        severity: 'warning',
        category: 'performance',
        message: `Match ${metrics.matchNumber} exceeded expected duration: ${metrics.duration}s`,
        data: { matchNumber: metrics.matchNumber, duration: metrics.duration },
      });
    }

    this.logger.info('Match recorded', {
      matchNumber: metrics.matchNumber,
      duration: `${metrics.duration}s`,
      winner: metrics.winner,
    });
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: string): void {
    this.metrics.errorCount++;

    const errorRate = this.metrics.errorCount / Math.max(1, this.metrics.matchesCompleted);
    if (errorRate > this.thresholds.maxErrorRate) {
      this.addAlert({
        severity: 'critical',
        category: 'error',
        message: `Error rate exceeded threshold: ${(errorRate * 100).toFixed(1)}%`,
        data: { errorRate, context },
      });
    }

    this.logger.error('Stream error recorded', { error: error.message, context });
  }

  /**
   * Record a recovery event
   */
  recordRecovery(type: string, duration: number): void {
    this.metrics.recoveryCount++;

    this.addAlert({
      severity: 'info',
      category: 'error',
      message: `System recovered from ${type} in ${duration}ms`,
      data: { type, duration },
    });

    this.logger.info('Recovery recorded', { type, duration: `${duration}ms` });
  }

  /**
   * Record API request timing
   */
  recordApiRequest(path: string, responseTime: number): void {
    this.metrics.apiResponseTime = responseTime;

    if (responseTime > this.thresholds.maxApiResponseTime) {
      this.addAlert({
        severity: 'warning',
        category: 'performance',
        message: `Slow API response: ${path} took ${responseTime}ms`,
        data: { path, responseTime },
      });
    }
  }

  /**
   * Record resource usage
   */
  recordResourceUsage(cpu: number, memory: number): void {
    this.metrics.cpuUsage = cpu;
    this.metrics.memoryUsage = memory;

    if (memory > this.thresholds.maxMemoryUsage) {
      this.addAlert({
        severity: 'warning',
        category: 'resource',
        message: `High memory usage: ${(memory / 1024 / 1024).toFixed(0)}MB`,
        data: { memory },
      });
    }

    if (cpu > this.thresholds.maxCpuUsage) {
      this.addAlert({
        severity: 'warning',
        category: 'resource',
        message: `High CPU usage: ${cpu.toFixed(1)}%`,
        data: { cpu },
      });
    }
  }

  /**
   * Update uptime
   */
  updateUptime(): void {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
  }

  /**
   * Add a health alert
   */
  private addAlert(alert: Omit<HealthAlert, 'timestamp'>): void {
    const fullAlert: HealthAlert = {
      ...alert,
      timestamp: new Date().toISOString(),
    };

    this.alerts.push(fullAlert);

    // Keep last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.shift();
    }

    // Emit alert event
    this.emit('alert', fullAlert);

    // Log based on severity
    switch (fullAlert.severity) {
      case 'critical':
        this.logger.error(`🚨 CRITICAL: ${fullAlert.message}`, fullAlert.data);
        break;
      case 'error':
        this.logger.error(`❌ ERROR: ${fullAlert.message}`, fullAlert.data);
        break;
      case 'warning':
        this.logger.warn(`⚠️  WARNING: ${fullAlert.message}`, fullAlert.data);
        break;
      case 'info':
        this.logger.info(`ℹ️  INFO: ${fullAlert.message}`, fullAlert.data);
        break;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): StreamMetrics {
    this.updateUptime();
    return { ...this.metrics };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'critical';
    alerts: HealthAlert[];
    metrics: StreamMetrics;
  } {
    const criticalAlerts = this.alerts.filter((a) => a.severity === 'critical');
    const errorAlerts = this.alerts.filter((a) => a.severity === 'error' || a.severity === 'warning');

    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      status = 'critical';
    } else if (errorAlerts.length > 3) {
      status = 'degraded';
    }

    return {
      status,
      alerts: this.alerts.slice(-10), // Last 10 alerts
      metrics: this.getMetrics(),
    };
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    summary: string;
    matchStats: {
      total: number;
      averageDuration: string;
      errorRate: string;
      recoveryRate: string;
    };
    systemStats: {
      uptime: string;
      cpuUsage: string;
      memoryUsage: string;
      apiLatency: string;
    };
  } {
    this.updateUptime();
    const uptime = this.metrics.uptime;
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const errorRate = this.metrics.matchesCompleted > 0
      ? (this.metrics.errorCount / this.metrics.matchesCompleted * 100).toFixed(2)
      : '0.00';

    const recoveryRate = this.metrics.matchesCompleted > 0
      ? (this.metrics.recoveryCount / this.metrics.errorCount * 100).toFixed(2)
      : '100.00';

    return {
      summary: `Stream running for ${hours}h ${minutes}m, ${this.metrics.matchesCompleted} matches completed`,
      matchStats: {
        total: this.metrics.matchesCompleted,
        averageDuration: `${this.metrics.averageMatchDuration}s`,
        errorRate: `${errorRate}%`,
        recoveryRate: `${recoveryRate}%`,
      },
      systemStats: {
        uptime: `${hours}h ${minutes}m`,
        cpuUsage: `${this.metrics.cpuUsage.toFixed(1)}%`,
        memoryUsage: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(0)}MB`,
        apiLatency: `${this.metrics.apiResponseTime}ms`,
      },
    };
  }

  /**
   * Get alert summary
   */
  getAlertSummary(): {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    recent: HealthAlert[];
  } {
    return {
      total: this.alerts.length,
      critical: this.alerts.filter((a) => a.severity === 'critical').length,
      error: this.alerts.filter((a) => a.severity === 'error').length,
      warning: this.alerts.filter((a) => a.severity === 'warning').length,
      info: this.alerts.filter((a) => a.severity === 'info').length,
      recent: this.alerts.slice(-5),
    };
  }

  /**
   * Export as JSON for reporting
   */
  toJSON(): Record<string, any> {
    return {
      health: this.getHealthStatus(),
      performance: this.getPerformanceReport(),
      alerts: this.getAlertSummary(),
    };
  }
}

/**
 * Factory function
 */
export function createStreamMonitor(logger?: Logger): StreamMonitor {
  return new StreamMonitor(logger);
}
