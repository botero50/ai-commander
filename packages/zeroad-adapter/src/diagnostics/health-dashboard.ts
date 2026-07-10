/**
 * Story 54.4 — Health Dashboard
 *
 * Real-time monitoring UI for system health, match status, and diagnostics.
 * Aggregates all monitoring data into single dashboard view.
 */

import { Logger } from '../config/logger.js';
import type { SystemHealth } from './diagnostics-engine.js';
import type { RecoveryResult } from './error-recovery.js';
import type { ShutdownReport } from './shutdown-handler.js';

export interface DashboardMetrics {
  timestamp: string;
  health: SystemHealth;
  activeMatches: number;
  totalMatches: number;
  recoveryCount: number;
  recoverySuccessRate: number;
  uptime: number;
  memoryUsageMB: number;
  eventQueueSize: number;
}

export interface DashboardAlert {
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  component: string;
}

export interface Dashboard {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: DashboardMetrics;
  alerts: DashboardAlert[];
  recentActivity: string[];
}

export class HealthDashboard {
  private logger: Logger;
  private alerts: DashboardAlert[] = [];
  private activityLog: string[] = [];
  private maxAlerts: number = 50;
  private maxActivityLog: number = 100;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Generate dashboard snapshot
   */
  generateDashboard(health: SystemHealth): Dashboard {
    const dashboard: Dashboard = {
      timestamp: new Date().toISOString(),
      status: health.overallStatus,
      metrics: {
        timestamp: health.timestamp,
        health,
        activeMatches: health.metrics.activeMatches,
        totalMatches: 0, // Would be populated from match manager
        recoveryCount: 0, // Would be populated from error recovery
        recoverySuccessRate: 0, // Would be calculated
        uptime: health.metrics.uptime,
        memoryUsageMB: health.metrics.memoryUsageMB,
        eventQueueSize: health.metrics.eventBusSize,
      },
      alerts: this.generateAlerts(health),
      recentActivity: [...this.activityLog],
    };

    this.logger.info('Dashboard generated', {
      status: dashboard.status,
      alertCount: dashboard.alerts.length,
    });

    return dashboard;
  }

  /**
   * Generate alerts from health checks
   */
  private generateAlerts(health: SystemHealth): DashboardAlert[] {
    const alerts: DashboardAlert[] = [];

    for (const check of health.checks) {
      if (check.status === 'unhealthy') {
        alerts.push({
          severity: 'critical',
          message: check.message,
          timestamp: new Date().toISOString(),
          component: check.name,
        });
      } else if (check.status === 'degraded') {
        alerts.push({
          severity: 'warning',
          message: check.message,
          timestamp: new Date().toISOString(),
          component: check.name,
        });
      }
    }

    return alerts;
  }

  /**
   * Record activity for dashboard log
   */
  recordActivity(message: string, component: string = 'System'): void {
    const entry = `[${new Date().toISOString()}] ${component}: ${message}`;
    this.activityLog.unshift(entry);

    if (this.activityLog.length > this.maxActivityLog) {
      this.activityLog = this.activityLog.slice(0, this.maxActivityLog);
    }

    this.logger.info('Activity logged', { component, message });
  }

  /**
   * Add alert
   */
  addAlert(alert: DashboardAlert): void {
    this.alerts.unshift(alert);

    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    this.logger.info('Alert added', {
      severity: alert.severity,
      component: alert.component,
    });
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): DashboardAlert[] {
    return this.alerts.slice(0, limit);
  }

  /**
   * Get activity log
   */
  getActivityLog(limit: number = 20): string[] {
    return this.activityLog.slice(0, limit);
  }

  /**
   * Export dashboard as HTML
   */
  exportHTML(dashboard: Dashboard): string {
    const html = [
      '<!DOCTYPE html>',
      '<html>',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>AI Commander Health Dashboard</title>',
      '<style>',
      'body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; margin: 0; padding: 20px; }',
      '.container { max-width: 1200px; margin: 0 auto; }',
      '.header { border-bottom: 2px solid #0088ff; padding-bottom: 10px; margin-bottom: 20px; }',
      '.status { font-size: 24px; font-weight: bold; }',
      '.healthy { color: #00ff00; }',
      '.degraded { color: #ffaa00; }',
      '.unhealthy { color: #ff0000; }',
      '.section { margin-bottom: 30px; border-left: 3px solid #0088ff; padding-left: 15px; }',
      '.metric { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }',
      '.metric-item { background: #2d2d2d; padding: 10px; border-radius: 4px; }',
      '.metric-label { color: #888; font-size: 12px; }',
      '.metric-value { font-size: 18px; font-weight: bold; margin-top: 5px; }',
      '.alerts { margin-top: 20px; }',
      '.alert { margin-bottom: 10px; padding: 10px; border-radius: 4px; background: #3d2d2d; }',
      '.alert.critical { background: #5d1515; color: #ff6666; }',
      '.alert.warning { background: #4d3915; color: #ffaa66; }',
      '.activity { max-height: 400px; overflow-y: auto; background: #2d2d2d; padding: 10px; border-radius: 4px; }',
      '.activity-line { font-size: 12px; line-height: 1.6; color: #888; }',
      '</style>',
      '</head>',
      '<body>',
      '<div class="container">',
      '<div class="header">',
      `<div>AI Commander Health Dashboard</div>`,
      `<div class="status"><span class="${dashboard.status}">${dashboard.status.toUpperCase()}</span></div>`,
      `<div style="color: #888; font-size: 12px; margin-top: 5px;">${dashboard.timestamp}</div>`,
      '</div>',
      '',
      '<div class="section">',
      '<div style="font-size: 16px; font-weight: bold; margin-bottom: 15px;">METRICS</div>',
      '<div class="metric">',
      `<div class="metric-item"><div class="metric-label">Memory Usage</div><div class="metric-value">${dashboard.metrics.memoryUsageMB}MB</div></div>`,
      `<div class="metric-item"><div class="metric-label">Uptime</div><div class="metric-value">${Math.floor(dashboard.metrics.uptime)}s</div></div>`,
      `<div class="metric-item"><div class="metric-label">Active Matches</div><div class="metric-value">${dashboard.metrics.activeMatches}</div></div>`,
      `<div class="metric-item"><div class="metric-label">Event Queue</div><div class="metric-value">${dashboard.metrics.eventQueueSize}</div></div>`,
      '</div>',
      '</div>',
      '',
      '<div class="section">',
      '<div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">ALERTS</div>',
      '<div class="alerts">',
    ];

    if (dashboard.alerts.length === 0) {
      html.push('<div style="color: #00ff00;">No alerts</div>');
    } else {
      for (const alert of dashboard.alerts) {
        html.push(
          `<div class="alert ${alert.severity}">`,
          `<div style="font-weight: bold;">${alert.component}</div>`,
          `<div>${alert.message}</div>`,
          `<div style="font-size: 11px; color: #666;">${alert.timestamp}</div>`,
          '</div>'
        );
      }
    }

    html.push(
      '</div>',
      '</div>',
      '',
      '<div class="section">',
      '<div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">ACTIVITY LOG</div>',
      '<div class="activity">',
    );

    for (const line of dashboard.recentActivity.slice(0, 20)) {
      html.push(`<div class="activity-line">${this.escapeHTML(line)}</div>`);
    }

    html.push('</div>', '</div>', '</div>', '</body>', '</html>');

    return html.join('\n');
  }

  /**
   * Export dashboard as JSON
   */
  exportJSON(dashboard: Dashboard): string {
    return JSON.stringify(dashboard, null, 2);
  }

  /**
   * Export dashboard as ASCII
   */
  exportASCII(dashboard: Dashboard): string {
    const lines = [
      '═'.repeat(60),
      'AI COMMANDER HEALTH DASHBOARD',
      '═'.repeat(60),
      '',
      `Status: ${dashboard.status.toUpperCase()}`,
      `Time: ${dashboard.timestamp}`,
      '',
      '─── METRICS ───',
      `Memory Usage: ${dashboard.metrics.memoryUsageMB}MB`,
      `Uptime: ${Math.floor(dashboard.metrics.uptime)}s`,
      `Active Matches: ${dashboard.metrics.activeMatches}`,
      `Event Queue: ${dashboard.metrics.eventQueueSize}`,
      '',
      '─── ALERTS ───',
    ];

    if (dashboard.alerts.length === 0) {
      lines.push('No alerts');
    } else {
      for (const alert of dashboard.alerts) {
        const icon = alert.severity === 'critical' ? '✗' : alert.severity === 'error' ? '✗' : '⚠';
        lines.push(`${icon} [${alert.severity}] ${alert.component}: ${alert.message}`);
      }
    }

    lines.push('', '─── RECENT ACTIVITY ───');

    for (const activity of dashboard.recentActivity.slice(0, 10)) {
      lines.push(activity);
    }

    lines.push('', '═'.repeat(60));

    return lines.join('\n');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };

    return text.replace(/[&<>"']/g, c => map[c]);
  }
}
