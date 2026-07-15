import { Match } from './match.js';
import { ExecutionMonitor, StateMetrics } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';

export interface ValidationRule {
  name: string;
  validate: () => boolean;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationResult {
  valid: boolean;
  timestamp: number;
  matchId: string;
  issues: ValidationIssue[];
  passedChecks: number;
  failedChecks: number;
}

export interface ValidationIssue {
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
}

export class MatchValidator {
  private match: Match;
  private monitor: ExecutionMonitor;
  private stateMetrics: StateMetrics;
  private logger: Logger;
  private rules: ValidationRule[] = [];

  constructor(match: Match, monitor: ExecutionMonitor, stateMetrics: StateMetrics, logger: Logger) {
    this.match = match;
    this.monitor = monitor;
    this.stateMetrics = stateMetrics;
    this.logger = logger;

    this.initializeRules();
  }

  private initializeRules(): void {
    // Match must be active
    this.addRule({
      name: 'Match Active',
      validate: () => this.match.isActive(),
      severity: 'error',
    });

    // Must have recorded observations
    this.addRule({
      name: 'Observations Recorded',
      validate: () => this.monitor.getMetrics().observationCount > 0,
      severity: 'error',
    });

    // Should have minimal errors
    this.addRule({
      name: 'No Critical Errors',
      validate: () => this.monitor.getMetrics().errorCount === 0,
      severity: 'error',
    });

    // World state should be healthy
    this.addRule({
      name: 'Monitor Health',
      validate: () => this.monitor.isHealthy(),
      severity: 'warning',
    });

    // Should have recorded state snapshots
    this.addRule({
      name: 'State Snapshots Recorded',
      validate: () => {
        const snapshots = this.stateMetrics.getAllSnapshots();
        return snapshots.length > 0;
      },
      severity: 'warning',
    });

    // Match metadata valid
    this.addRule({
      name: 'Metadata Valid',
      validate: () => {
        const metadata = this.match.getMetadata();
        return !!(metadata.matchId && metadata.status && metadata.createdAt > 0);
      },
      severity: 'error',
    });

    // State metrics valid
    this.addRule({
      name: 'State Metrics Valid',
      validate: () => {
        const metrics = this.stateMetrics.getMetrics();
        return metrics.snapshotCount >= 0 && metrics.timeSpanMs >= 0;
      },
      severity: 'warning',
    });
  }

  addRule(rule: ValidationRule): void {
    this.rules.push(rule);
  }

  validate(): ValidationResult {
    const issues: ValidationIssue[] = [];
    let passedChecks = 0;
    let failedChecks = 0;

    for (const rule of this.rules) {
      try {
        const passed = rule.validate();

        if (passed) {
          passedChecks++;
          this.logger.debug(`Validation passed: ${rule.name}`);
        } else {
          failedChecks++;
          issues.push({
            ruleName: rule.name,
            severity: rule.severity,
            message: `Validation failed: ${rule.name}`,
            timestamp: Date.now(),
          });
          this.logger.warn(`Validation failed: ${rule.name}`, {
            matchId: this.match.matchId,
          });
        }
      } catch (err) {
        failedChecks++;
        issues.push({
          ruleName: rule.name,
          severity: 'error',
          message: `Validation error: ${rule.name} - ${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        });
        this.logger.error(`Validation error in ${rule.name}`, err);
      }
    }

    const valid = issues.filter((i) => i.severity === 'error').length === 0;

    const result: ValidationResult = {
      valid,
      timestamp: Date.now(),
      matchId: this.match.matchId,
      issues,
      passedChecks,
      failedChecks,
    };

    this.logger.info('Match validation complete', {
      matchId: this.match.matchId,
      valid,
      passed: passedChecks,
      failed: failedChecks,
    });

    return result;
  }

  getSummary(): string {
    const result = this.validate();
    const errorCount = result.issues.filter((i) => i.severity === 'error').length;
    const warningCount = result.issues.filter((i) => i.severity === 'warning').length;

    return `Match ${result.matchId}: ${result.valid ? 'VALID' : 'INVALID'} (${result.passedChecks} passed, ${result.failedChecks} failed, ${errorCount} errors, ${warningCount} warnings)`;
  }

  getRuleCount(): number {
    return this.rules.length;
  }
}
