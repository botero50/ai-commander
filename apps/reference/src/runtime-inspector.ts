import type { ExecutionTrace } from './execution-trace.js';
import type { RuntimeMetrics } from './runtime-metrics.js';

/**
 * Runtime Inspector: Read-only snapshot of execution state.
 *
 * Provides immutable snapshots of the current mission execution.
 * Never modifies runtime state.
 * Read-only access to observability data.
 */

export interface RuntimeSnapshot {
  readonly missionId: string;
  readonly missionStatus: 'running' | 'completed' | 'failed';
  readonly elapsedTimeMs: number;

  readonly agentPosition: {
    readonly x: number;
    readonly y: number;
  };
  readonly targetPosition: {
    readonly x: number;
    readonly y: number;
  };

  readonly execution: {
    readonly currentTick: number;
    readonly totalTicks: number;
    readonly ticksRemaining: number;
  };

  readonly observability: {
    readonly traceEventCount: number;
    readonly metricsAvailable: boolean;
  };
}

/**
 * RuntimeInspector: Captures snapshots of execution state.
 */
export class RuntimeInspector {
  /**
   * Capture a snapshot of the current execution state.
   *
   * Snapshots are immutable and never modify runtime state.
   */
  static captureSnapshot(
    missionId: string,
    targetX: number,
    targetY: number,
    currentTick: number,
    totalTicks: number,
    trace: ExecutionTrace | null,
    metrics: RuntimeMetrics | null,
    startTime: number
  ): RuntimeSnapshot {
    const elapsedTimeMs = Date.now() - startTime;
    const agentX = 0; // Start position
    const agentY = 0;

    // Estimate position from commands executed
    const commandsExecuted = metrics?.successfulCommands ?? 0;
    let estimatedX = agentX;
    let estimatedY = agentY;

    // Simple heuristic: move towards target based on commands
    if (commandsExecuted > 0 && targetX !== 0) {
      estimatedX = Math.min(commandsExecuted, Math.abs(targetX)) * (targetX > 0 ? 1 : -1);
    }
    if (commandsExecuted > Math.abs(targetX) && targetY !== 0) {
      const remainingCommands = commandsExecuted - Math.abs(targetX);
      estimatedY = Math.min(remainingCommands, Math.abs(targetY)) * (targetY > 0 ? 1 : -1);
    }

    const snapshot: RuntimeSnapshot = Object.freeze({
      missionId,
      missionStatus: trace?.status as 'running' | 'completed' | 'failed',
      elapsedTimeMs,

      agentPosition: Object.freeze({
        x: estimatedX,
        y: estimatedY,
      }),
      targetPosition: Object.freeze({
        x: targetX,
        y: targetY,
      }),

      execution: Object.freeze({
        currentTick,
        totalTicks,
        ticksRemaining: Math.max(0, totalTicks - currentTick),
      }),

      observability: Object.freeze({
        traceEventCount: trace?.events.length ?? 0,
        metricsAvailable: metrics !== null,
      }),
    });

    return snapshot;
  }
}

/**
 * Format a runtime snapshot as human-readable text.
 */
export function formatRuntimeSnapshot(snapshot: RuntimeSnapshot): string {
  const lines: string[] = [];

  lines.push('╭─ RUNTIME INSPECTOR ' + '─'.repeat(56) + '╮');
  lines.push(`│ Mission: ${snapshot.missionId}`);
  lines.push(`│ Status: ${snapshot.missionStatus.toUpperCase()}`);
  lines.push(`│ Elapsed: ${snapshot.elapsedTimeMs} ms`);
  lines.push('├' + '─'.repeat(77) + '┤');

  lines.push('│ AGENT POSITION');
  lines.push(`│   Current: (${snapshot.agentPosition.x}, ${snapshot.agentPosition.y})`);
  lines.push(`│   Target:  (${snapshot.targetPosition.x}, ${snapshot.targetPosition.y})`);
  lines.push('│');

  lines.push('│ EXECUTION');
  lines.push(`│   Current Tick: ${snapshot.execution.currentTick}`);
  lines.push(`│   Total Ticks: ${snapshot.execution.totalTicks}`);
  lines.push(`│   Remaining: ${snapshot.execution.ticksRemaining}`);
  lines.push('│');

  lines.push('│ OBSERVABILITY');
  lines.push(`│   Trace Events: ${snapshot.observability.traceEventCount}`);
  lines.push(
    `│   Metrics: ${snapshot.observability.metricsAvailable ? 'Available' : 'Not yet available'}`
  );
  lines.push('╰' + '─'.repeat(77) + '╯');

  return lines.join('\n');
}

/**
 * Convert runtime snapshot to JSON.
 */
export function snapshotToJson(snapshot: RuntimeSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
