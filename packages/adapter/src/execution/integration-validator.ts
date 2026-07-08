/**
 * Result of a single execution cycle validation.
 */
export interface CycleValidationResult {
  readonly cycle: number;
  readonly success: boolean;
  readonly latencies: {
    readonly phase1Ms: number;
    readonly phase2Ms: number;
    readonly phase3Ms: number;
    readonly totalMs: number;
  };
  readonly error?: string;
}

/**
 * Aggregated validation metrics.
 */
export interface ValidationMetrics {
  readonly cycleCount: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly successRate: number;
  readonly avgCycleLatencyMs: number;
  readonly maxCycleLatencyMs: number;
  readonly minCycleLatencyMs: number;
  readonly determinismVerified: boolean;
}

/**
 * Complete validation result.
 */
export interface IntegrationValidationResult {
  readonly success: boolean;
  readonly cycles: readonly CycleValidationResult[];
  readonly metrics: ValidationMetrics;
}

/**
 * Logger interface - injected, no concrete implementation.
 */
interface Logger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  error(message: string, error?: unknown): void;
}

/**
 * Generic integration validator for any three-phase execution system.
 *
 * Validates:
 * - Phase 1 → Phase 2 → Phase 3 cycle completion
 * - Latency measurement for each phase
 * - Error recovery and determinism
 *
 * Framework-owned component for integration validation.
 */
export class IntegrationValidator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate three-phase execution cycle.
   */
  async validateCycle(
    phase1Fn: () => Promise<unknown>,
    phase2Fn: (phase1Result: unknown) => Promise<unknown>,
    phase3Fn: (phase2Result: unknown) => Promise<void>,
    cycleCount: number = 5
  ): Promise<IntegrationValidationResult> {
    const cycles: CycleValidationResult[] = [];
    let passCount = 0;
    let failCount = 0;
    const cycleLatencies: number[] = [];

    for (let cycle = 1; cycle <= cycleCount; cycle++) {
      const cycleStart = Date.now();

      try {
        // Phase 1
        const phase1Start = Date.now();
        const phase1Result = await phase1Fn();
        const phase1Latency = Date.now() - phase1Start;

        if (!phase1Result) {
          throw new Error('Phase 1 returned empty result');
        }

        // Phase 2
        const phase2Start = Date.now();
        const phase2Result = await phase2Fn(phase1Result);
        const phase2Latency = Date.now() - phase2Start;

        if (!phase2Result) {
          throw new Error('Phase 2 returned empty result');
        }

        // Phase 3
        const phase3Start = Date.now();
        await phase3Fn(phase2Result);
        const phase3Latency = Date.now() - phase3Start;

        const totalLatency = Date.now() - cycleStart;

        cycles.push({
          cycle,
          success: true,
          latencies: {
            phase1Ms: phase1Latency,
            phase2Ms: phase2Latency,
            phase3Ms: phase3Latency,
            totalMs: totalLatency,
          },
        });

        cycleLatencies.push(totalLatency);
        passCount++;

        this.logger.debug('Validation cycle succeeded', {
          cycle,
          phase1Ms: phase1Latency,
          phase2Ms: phase2Latency,
          phase3Ms: phase3Latency,
          totalMs: totalLatency,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        const totalLatency = Date.now() - cycleStart;

        cycles.push({
          cycle,
          success: false,
          latencies: {
            phase1Ms: 0,
            phase2Ms: 0,
            phase3Ms: 0,
            totalMs: totalLatency,
          },
          error,
        });

        failCount++;

        this.logger.warn('Validation cycle failed', {
          cycle,
          error,
        });
      }
    }

    const successRate = passCount / (passCount + failCount);
    const avgLatency = cycleLatencies.length > 0 ? cycleLatencies.reduce((a, b) => a + b, 0) / cycleLatencies.length : 0;
    const maxLatency = cycleLatencies.length > 0 ? Math.max(...cycleLatencies) : 0;
    const minLatency = cycleLatencies.length > 0 ? Math.min(...cycleLatencies) : 0;

    const metrics: ValidationMetrics = {
      cycleCount: passCount + failCount,
      passCount,
      failCount,
      successRate: parseFloat((successRate * 100).toFixed(2)),
      avgCycleLatencyMs: parseFloat(avgLatency.toFixed(2)),
      maxCycleLatencyMs: maxLatency,
      minCycleLatencyMs: minLatency,
      determinismVerified: this.verifyDeterminism(cycleLatencies),
    };

    const result: IntegrationValidationResult = {
      success: passCount === passCount + failCount,
      cycles,
      metrics,
    };

    this.logger.info('Integration validation complete', {
      passed: passCount,
      failed: failCount,
      successRate: metrics.successRate,
      avgCycleMs: metrics.avgCycleLatencyMs,
    });

    return result;
  }

  /**
   * Verify deterministic execution by checking latency variance.
   * Returns true if coefficient of variation is low (< 15%).
   */
  private verifyDeterminism(latencies: number[]): boolean {
    if (latencies.length < 3) {
      return true; // Not enough samples
    }

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    if (avg === 0) return true;

    const variance = Math.sqrt(latencies.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / latencies.length);
    const coefficient = variance / avg;

    return coefficient < 0.15;
  }

  /**
   * Validate error recovery by attempting a failing phase.
   */
  async validateErrorRecovery(
    phase1Fn: () => Promise<unknown>,
    phase2Fn: (phase1Result: unknown) => Promise<unknown>,
    failingPhase2Fn: (phase1Result: unknown) => Promise<unknown>
  ): Promise<{ recoversFromError: boolean }> {
    let recoversFromError = false;

    try {
      // Try failing phase
      const phase1Result = await phase1Fn();
      try {
        await failingPhase2Fn(phase1Result);
      } catch (err) {
        // Recovery attempt
        try {
          const retryResult = await phase2Fn(phase1Result);
          if (retryResult) {
            recoversFromError = true;
          }
        } catch (recoveryErr) {
          // Recovery failed
        }
      }
    } catch (err) {
      // Phase 1 failed
    }

    return { recoversFromError };
  }

  /**
   * Generate validation report.
   */
  generateReport(result: IntegrationValidationResult): string {
    const lines: string[] = [
      '',
      '═══════════════════════════════════════════════════════════════',
      'INTEGRATION VALIDATION REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `Status: ${result.success ? '✓ PASSED' : '✗ FAILED'}`,
      '',
      'TEST RESULTS',
      '─────────────────────────────────────────────────────────────',
      `Passed: ${result.metrics.passCount}/${result.metrics.cycleCount}`,
      `Failed: ${result.metrics.failCount}/${result.metrics.cycleCount}`,
      `Success Rate: ${result.metrics.successRate}%`,
      '',
      'PERFORMANCE METRICS',
      '─────────────────────────────────────────────────────────────',
      `Avg Cycle Latency:     ${result.metrics.avgCycleLatencyMs}ms`,
      `Max Cycle Latency:     ${result.metrics.maxCycleLatencyMs}ms`,
      `Min Cycle Latency:     ${result.metrics.minCycleLatencyMs}ms`,
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
