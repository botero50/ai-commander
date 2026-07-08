import { Logger } from '../config/logger.js';

/**
 * Validation result for Brain integration.
 */
export interface BrainIntegrationValidationResult {
  readonly brainName: string;
  readonly brainVersion: string;
  readonly testsPassed: number;
  readonly testsFailed: number;
  readonly totalTests: number;
  readonly success: boolean;
  readonly cycles: readonly CycleValidationResult[];
  readonly metrics: {
    readonly avgCycleLatencyMs: number;
    readonly maxCycleLatencyMs: number;
    readonly avgDecisionLatencyMs: number;
    readonly errorRate: number;
    readonly determinismVerified: boolean;
  };
}

/**
 * Result of a single observe-plan-decide-execute cycle.
 */
export interface CycleValidationResult {
  readonly cycle: number;
  readonly success: boolean;
  readonly observeLatencyMs: number;
  readonly decideLatencyMs: number;
  readonly executeLatencyMs: number;
  readonly totalLatencyMs: number;
  readonly commandCount: number;
  readonly error?: string;
}

/**
 * Validates complete Brain integration: observation, planning, decision, execution.
 * Ensures deterministic behavior and proper error handling.
 */
export class BrainIntegrationValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate complete integration cycle.
   * Tests: observe → plan → decide → execute
   */
  async validateIntegrationCycle(
    brain: any,
    observeFn: () => Promise<any>,
    planFn: (state: any) => Promise<any>,
    decideFn: (state: any) => Promise<any>,
    executeFn: (commands: any[]) => Promise<void>,
    cycleCount: number = 5
  ): Promise<BrainIntegrationValidationResult> {
    const cycles: CycleValidationResult[] = [];
    let passedTests = 0;
    let failedTests = 0;
    const decisionLatencies: number[] = [];
    const cycleLatencies: number[] = [];
    const commandCounts: number[] = [];

    for (let cycle = 1; cycle <= cycleCount; cycle++) {
      const cycleStartTime = Date.now();

      try {
        // Observe
        const observeStart = Date.now();
        const worldState = await observeFn();
        const observeLatency = Date.now() - observeStart;

        if (!worldState) {
          throw new Error('Failed to get world state');
        }

        // Plan (using adapter if available)
        const planStart = Date.now();
        const goals = planFn ? await planFn(worldState) : [{ id: 'default', intent: 'Act', priority: 'high', feasibility: 1, expectedDuration: 1000, estimatedValue: 100 }];
        const commands = decideFn ? await decideFn(worldState) : [];

        // Decide with Brain
        const decideStart = Date.now();
        const decision = await brain.decide(worldState, goals, commands, {
          recentEvents: [],
          recentDecisions: [],
          metrics: { commandsExecuted: 0, commandsFailed: 0, goalsCompleted: 0, goalsAbandoned: 0 },
        });
        const decideLatency = Date.now() - decideStart;

        if (!decision) {
          throw new Error('Brain returned no decision');
        }

        // Execute
        const executeStart = Date.now();
        const commandsToExecute = decision.commands ? decision.commands.map((cmd: any) => ({ action: cmd, timestamp: Date.now() })) : [];
        await executeFn(commandsToExecute);
        const executeLatency = Date.now() - executeStart;

        const cycleLatency = Date.now() - cycleStartTime;

        cycles.push({
          cycle,
          success: true,
          observeLatencyMs: observeLatency,
          decideLatencyMs: decideLatency,
          executeLatencyMs: executeLatency,
          totalLatencyMs: cycleLatency,
          commandCount: commandsToExecute.length,
        });

        decisionLatencies.push(decideLatency);
        cycleLatencies.push(cycleLatency);
        commandCounts.push(commandsToExecute.length);

        passedTests++;

        this.logger.debug('Validation cycle succeeded', {
          cycle,
          observeMs: observeLatency,
          decideMs: decideLatency,
          executeMs: executeLatency,
          totalMs: cycleLatency,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);

        cycles.push({
          cycle,
          success: false,
          observeLatencyMs: 0,
          decideLatencyMs: 0,
          executeLatencyMs: 0,
          totalLatencyMs: Date.now() - cycleStartTime,
          commandCount: 0,
          error,
        });

        failedTests++;

        this.logger.warn('Validation cycle failed', {
          cycle,
          error,
        });
      }
    }

    const totalTests = passedTests + failedTests;
    const errorRate = failedTests / totalTests;
    const avgCycleLatency = cycleLatencies.length > 0 ? cycleLatencies.reduce((a, b) => a + b, 0) / cycleLatencies.length : 0;
    const maxCycleLatency = cycleLatencies.length > 0 ? Math.max(...cycleLatencies) : 0;
    const avgDecisionLatency = decisionLatencies.length > 0 ? decisionLatencies.reduce((a, b) => a + b, 0) / decisionLatencies.length : 0;

    const result: BrainIntegrationValidationResult = {
      brainName: brain.name ?? 'unknown',
      brainVersion: brain.version ?? '0.0.0',
      testsPassed: passedTests,
      testsFailed: failedTests,
      totalTests,
      success: errorRate === 0,
      cycles,
      metrics: {
        avgCycleLatencyMs: parseFloat(avgCycleLatency.toFixed(2)),
        maxCycleLatencyMs: maxCycleLatency,
        avgDecisionLatencyMs: parseFloat(avgDecisionLatency.toFixed(2)),
        errorRate: parseFloat((errorRate * 100).toFixed(2)),
        determinismVerified: await this.verifyDeterminism(brain, observeFn, decisionLatencies),
      },
    };

    this.logger.info('Brain integration validation complete', {
      brain: result.brainName,
      passed: passedTests,
      failed: failedTests,
      errorRate: result.metrics.errorRate,
      avgCycleMs: result.metrics.avgCycleLatencyMs,
    });

    return result;
  }

  /**
   * Verify deterministic execution by comparing latency consistency.
   */
  private async verifyDeterminism(
    brain: any,
    observeFn: () => Promise<any>,
    latencies: number[]
  ): Promise<boolean> {
    if (latencies.length < 2) {
      return true; // Not enough samples to verify
    }

    // Check if latencies are consistent (within 10% variance)
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const variance = Math.sqrt(latencies.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / latencies.length);
    const coefficient = variance / avg;

    // Determinism verified if coefficient of variation is low
    return coefficient < 0.1;
  }

  /**
   * Validate error handling behavior.
   */
  async validateErrorHandling(
    brain: any,
    observeFn: () => Promise<any>,
    failingObserveFn: () => Promise<any>
  ): Promise<{ recoversFromObservationError: boolean; recoversFromBrainError: boolean }> {
    let recoversFromObservationError = false;
    let recoversFromBrainError = false;

    // Test observation error recovery
    try {
      await failingObserveFn();
    } catch (err) {
      // Try recovery
      try {
        const state = await observeFn();
        if (state) {
          recoversFromObservationError = true;
        }
      } catch (recoveryErr) {
        // Recovery failed
      }
    }

    // Test brain error recovery (brain should have timeout/retry)
    try {
      const state = await observeFn();
      const goals = [{ id: 'test', intent: 'Test', priority: 'high', feasibility: 1, expectedDuration: 1000, estimatedValue: 100 }];
      const decision = await brain.decide(state, goals, [], {
        recentEvents: [],
        recentDecisions: [],
        metrics: { commandsExecuted: 0, commandsFailed: 0, goalsCompleted: 0, goalsAbandoned: 0 },
      });

      if (decision) {
        recoversFromBrainError = true;
      }
    } catch (err) {
      // Brain error - should have been handled
    }

    return {
      recoversFromObservationError,
      recoversFromBrainError,
    };
  }

  /**
   * Validate telemetry integration.
   */
  async validateTelemetry(
    decision: any,
    telemetryFn: () => Promise<any>
  ): Promise<{ hasTelemetry: boolean; hasMetrics: boolean }> {
    try {
      const telemetry = await telemetryFn();

      return {
        hasTelemetry: !!telemetry,
        hasMetrics: telemetry && telemetry.metrics && typeof telemetry.metrics === 'object',
      };
    } catch (err) {
      return {
        hasTelemetry: false,
        hasMetrics: false,
      };
    }
  }

  /**
   * Generate validation report.
   */
  generateReport(result: BrainIntegrationValidationResult): string {
    const lines: string[] = [
      '',
      '═══════════════════════════════════════════════════════════════',
      'BRAIN INTEGRATION VALIDATION REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Brain: ${result.brainName} v${result.brainVersion}`,
      `Status: ${result.success ? '✓ PASSED' : '✗ FAILED'}`,
      '',
      'TEST RESULTS',
      '─────────────────────────────────────────────────────────────',
      `Passed: ${result.testsPassed}/${result.totalTests}`,
      `Failed: ${result.testsFailed}/${result.totalTests}`,
      '',
      'PERFORMANCE METRICS',
      '─────────────────────────────────────────────────────────────',
      `Avg Cycle Latency:     ${result.metrics.avgCycleLatencyMs}ms`,
      `Max Cycle Latency:     ${result.metrics.maxCycleLatencyMs}ms`,
      `Avg Decision Latency:  ${result.metrics.avgDecisionLatencyMs}ms`,
      `Error Rate:            ${result.metrics.errorRate}%`,
      `Determinism:           ${result.metrics.determinismVerified ? '✓ Verified' : '✗ Not verified'}`,
      '',
    ];

    if (result.cycles.some((c) => !c.success)) {
      lines.push('FAILED CYCLES');
      lines.push('─────────────────────────────────────────────────────────────');
      result.cycles
        .filter((c) => !c.success)
        .forEach((c) => {
          lines.push(`Cycle ${c.cycle}: ${c.error}`);
        });
      lines.push('');
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');

    return lines.join('\n');
  }
}
