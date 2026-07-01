import type { ExecutionTrace, TraceEvent } from './execution-trace.js';

/**
 * Replay Engine: Validates recorded execution traces.
 *
 * Replay is deterministic validation, NOT simulation.
 *
 * The engine validates that:
 * - Events are chronologically ordered
 * - Required lifecycle events exist
 * - Mission completed successfully
 * - Final state is consistent with events
 * - No events are missing or corrupted
 *
 * Replay never executes game logic or modifies state.
 * It only validates recorded execution integrity.
 */

export interface ReplayResult {
  readonly traceId: string;
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly validations: readonly ReplayValidation[];
}

export interface ReplayValidation {
  readonly name: string;
  readonly passed: boolean;
  readonly message: string;
}

export interface ReplayReport {
  readonly traceId: string;
  readonly missionId: string;
  readonly targetX: number;
  readonly targetY: number;
  readonly missionStatus: 'completed' | 'failed';
  readonly isValid: boolean;
  readonly eventCount: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly validations: readonly ReplayValidation[];
  readonly startTime: number;
  readonly endTime: number | null;
  readonly duration: number;
}

/**
 * ReplayEngine: Validates execution traces.
 */
export class ReplayEngine {
  /**
   * Replay and validate an execution trace.
   *
   * Validation checks:
   * 1. Trace structure is valid
   * 2. Required events exist
   * 3. Events are chronologically ordered
   * 4. Mission has valid completion status
   * 5. Event data is consistent
   * 6. Tick numbers are sequential
   */
  static replay(trace: ExecutionTrace): ReplayResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const validations: ReplayValidation[] = [];

    // Validation 1: Check trace structure
    validations.push(this.validateTraceStructure(trace, errors));

    // Validation 2: Check required lifecycle events
    validations.push(this.validateLifecycleEvents(trace, errors));

    // Validation 3: Check chronological ordering
    validations.push(this.validateChronologicalOrder(trace, errors));

    // Validation 4: Check mission completion
    validations.push(this.validateMissionCompletion(trace, errors));

    // Validation 5: Check event consistency
    validations.push(this.validateEventConsistency(trace, errors, warnings));

    // Validation 6: Check tick ordering
    validations.push(this.validateTickOrdering(trace, errors));

    const isValid = errors.length === 0 && validations.every((v) => v.passed);

    return Object.freeze({
      traceId: trace.missionId,
      isValid,
      errors: Object.freeze([...errors]),
      warnings: Object.freeze([...warnings]),
      validations: Object.freeze([...validations]),
    });
  }

  /**
   * Generate a replay report from a trace.
   */
  static generateReport(trace: ExecutionTrace): ReplayReport {
    const result = this.replay(trace);

    const report: ReplayReport = Object.freeze({
      traceId: trace.missionId,
      missionId: trace.missionId,
      targetX: trace.targetX,
      targetY: trace.targetY,
      missionStatus: trace.status as 'completed' | 'failed',
      isValid: result.isValid,
      eventCount: trace.events.length,
      errors: result.errors,
      warnings: result.warnings,
      validations: result.validations,
      startTime: trace.startTime,
      endTime: trace.endTime,
      duration: trace.endTime ? trace.endTime - trace.startTime : 0,
    });

    return report;
  }

  private static validateTraceStructure(trace: ExecutionTrace, errors: string[]): ReplayValidation {
    const checks: boolean[] = [];

    // Check required fields
    checks.push(typeof trace.missionId === 'string' && trace.missionId.length > 0);
    checks.push(typeof trace.targetX === 'number' && !isNaN(trace.targetX));
    checks.push(typeof trace.targetY === 'number' && !isNaN(trace.targetY));
    checks.push(typeof trace.startTime === 'number' && trace.startTime > 0);
    checks.push(Array.isArray(trace.events));
    checks.push(
      trace.status === 'running' || trace.status === 'completed' || trace.status === 'failed',
    );

    const passed = checks.every((c) => c);

    if (!passed) {
      errors.push('Trace structure is invalid: missing or malformed fields');
    }

    return Object.freeze({
      name: 'Trace Structure',
      passed,
      message: passed ? 'Trace structure is valid' : 'Trace structure validation failed',
    });
  }

  private static validateLifecycleEvents(trace: ExecutionTrace, errors: string[]): ReplayValidation {
    const requiredEvents: string[] = ['mission_started', 'mission_initialized', 'mission_shutdown'];
    const eventTypes = new Set<string>(trace.events.filter((e) => e).map((e) => e?.eventType ?? ''));

    const missingEvents: string[] = [];
    for (const required of requiredEvents) {
      if (!eventTypes.has(required)) {
        missingEvents.push(required);
      }
    }

    const passed = missingEvents.length === 0;

    if (!passed) {
      errors.push(`Missing required lifecycle events: ${missingEvents.join(', ')}`);
    }

    return Object.freeze({
      name: 'Required Lifecycle Events',
      passed,
      message: passed
        ? 'All required lifecycle events present'
        : `Missing: ${missingEvents.join(', ')}`,
    });
  }

  private static validateChronologicalOrder(trace: ExecutionTrace, errors: string[]): ReplayValidation {
    let previousTimestamp = 0;
    const violations: number[] = [];

    for (let i = 0; i < trace.events.length; i++) {
      const event = trace.events[i];
      if (!event) continue;

      if (event.timestamp < previousTimestamp) {
        violations.push(i);
      }
      previousTimestamp = event.timestamp;
    }

    const passed = violations.length === 0;

    if (!passed) {
      errors.push(`Events out of chronological order at indices: ${violations.join(', ')}`);
    }

    return Object.freeze({
      name: 'Chronological Order',
      passed,
      message: passed ? 'Events are chronologically ordered' : `${violations.length} events out of order`,
    });
  }

  private static validateMissionCompletion(trace: ExecutionTrace, errors: string[]): ReplayValidation {
    const completionEvent = trace.events.find((e) => {
      const type = e?.eventType;
      return type === 'mission_completed' || type === 'mission_failed';
    });

    const completionEventType = completionEvent?.eventType as string | undefined;
    const statusValid = (trace.status === 'completed' && completionEventType === 'mission_completed') ||
                       (trace.status === 'failed' && completionEventType === 'mission_failed') ||
                       (trace.status === 'running' && !completionEvent);

    if (!statusValid) {
      errors.push('Mission completion status does not match events');
    }

    return Object.freeze({
      name: 'Mission Completion',
      passed: statusValid,
      message: statusValid ? `Mission ${trace.status}` : 'Status mismatch with events',
    });
  }

  private static validateEventConsistency(
    trace: ExecutionTrace,
    errors: string[],
    warnings: string[],
  ): ReplayValidation {
    const issues: string[] = [];

    // Check that events have valid data
    for (let i = 0; i < trace.events.length; i++) {
      const event = trace.events[i];
      if (!event) {
        issues.push(`Event ${i} is undefined`);
        continue;
      }

      if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
        issues.push(`Event ${i} has invalid timestamp`);
      }

      if (typeof event.tick !== 'number' || event.tick < 0) {
        issues.push(`Event ${i} has invalid tick number`);
      }

      if (typeof event.eventType !== 'string') {
        issues.push(`Event ${i} has invalid event type`);
      }

      if (typeof event.data !== 'object' || event.data === null) {
        issues.push(`Event ${i} has invalid data`);
      }
    }

    const passed = issues.length === 0;

    if (!passed) {
      for (const issue of issues.slice(0, 3)) {
        // Show first 3 issues
        errors.push(issue);
      }
      if (issues.length > 3) {
        errors.push(`... and ${issues.length - 3} more issues`);
      }
    }

    return Object.freeze({
      name: 'Event Data Consistency',
      passed,
      message: passed ? 'All event data is valid' : `${issues.length} data inconsistencies`,
    });
  }

  private static validateTickOrdering(trace: ExecutionTrace, errors: string[]): ReplayValidation {
    const tickEvents = trace.events.filter((e) => e && e?.eventType === 'mission_tick');
    const ticks: number[] = tickEvents.map((e) => {
      const event = e as any;
      return event?.tick ?? 0;
    });

    let isSequential = true;
    if (ticks && ticks.length > 0) {
      for (let i = 1; i < ticks.length; i++) {
        // Ticks should generally increase, allowing for repeated ticks
        const current = ticks[i] ?? 0;
        const previous = ticks[i - 1] ?? 0;
        if (current < previous) {
          isSequential = false;
          break;
        }
      }
    }

    if (!isSequential) {
      errors.push('Mission tick numbers are not properly ordered');
    }

    return Object.freeze({
      name: 'Tick Ordering',
      passed: isSequential,
      message: isSequential ? `${ticks.length} ticks properly ordered` : 'Tick ordering violation',
    });
  }
}

/**
 * Format a replay report as human-readable text.
 */
export function formatReplayReport(report: ReplayReport): string {
  const lines: string[] = [];

  lines.push('╭─ REPLAY REPORT ' + '─'.repeat(61) + '╮');
  lines.push(`│ Trace: ${report.traceId}`);
  lines.push(`│ Target: (${report.targetX}, ${report.targetY})`);
  lines.push(`│ Status: ${report.missionStatus.toUpperCase()}`);
  lines.push(`│ Valid: ${report.isValid ? 'YES ✓' : 'NO ✗'}`);
  lines.push('├' + '─'.repeat(77) + '┤');

  lines.push(`│ Events: ${report.eventCount}`);
  lines.push(`│ Duration: ${report.duration} ms`);
  lines.push('│');

  lines.push('│ VALIDATIONS');
  for (const validation of report.validations) {
    const icon = validation.passed ? '✓' : '✗';
    lines.push(`│   [${icon}] ${validation.name}`);
    lines.push(`│       ${validation.message}`);
  }
  lines.push('│');

  if (report.errors.length > 0) {
    lines.push('│ ERRORS');
    for (const error of report.errors) {
      lines.push(`│   ✗ ${error}`);
    }
    lines.push('│');
  }

  if (report.warnings.length > 0) {
    lines.push('│ WARNINGS');
    for (const warning of report.warnings) {
      lines.push(`│   ⚠ ${warning}`);
    }
    lines.push('│');
  }

  lines.push('╰' + '─'.repeat(77) + '╯');

  return lines.join('\n');
}

/**
 * Convert replay report to JSON.
 */
export function replayReportToJson(report: ReplayReport): string {
  return JSON.stringify(report, null, 2);
}
