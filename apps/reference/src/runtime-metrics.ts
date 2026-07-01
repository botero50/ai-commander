import type { ExecutionTrace } from './execution-trace.js';

/**
 * Runtime Metrics: Deterministic performance summary of mission execution.
 *
 * Answers the question: "How well did the mission perform?"
 *
 * Metrics are derived from:
 * - Execution trace events
 * - Agent runtime metrics
 * - Mission outcome
 *
 * Deterministic: Same mission always produces same metrics.
 * Immutable: Frozen after generation.
 * Independent: Does not influence runtime behavior.
 */

export interface RuntimeMetrics {
  readonly missionId: string;
  readonly status: 'completed' | 'failed';

  // Timing metrics
  readonly missionDurationMs: number;
  readonly initializationTimeMs: number;
  readonly shutdownTimeMs: number;
  readonly executionTimeMs: number;

  // Event metrics
  readonly totalEvents: number;
  readonly lifecycleEvents: number;
  readonly reasoningEvents: number;
  readonly executionEvents: number;

  // Execution metrics
  readonly totalTicks: number;
  readonly plannerInvocations: number;
  readonly plansGenerated: number;
  readonly planErrors: number;
  readonly decisionEngineInvocations: number;
  readonly decisionsSelected: number;
  readonly decisionErrors: number;

  // Command metrics
  readonly commandsExecuted: number;
  readonly successfulCommands: number;
  readonly failedCommands: number;
  readonly commandSuccessRate: number; // 0-1

  // World state metrics
  readonly worldStateUpdates: number;

  // Goal metrics
  readonly goalsCreated: number;

  // Derived metrics
  readonly averageTickDurationMs: number;
  readonly averageCommandsPerTick: number;
  readonly averageDecisionsPerTick: number;
}

/**
 * RuntimeMetricsCollector: Analyzes execution trace and generates metrics.
 *
 * Keeps metrics logic separate from execution logic.
 * Metrics are computed after execution completes.
 */
export class RuntimeMetricsCollector {
  static collect(trace: ExecutionTrace): RuntimeMetrics {
    // Count events by type
    const eventCounts = new Map<string, number>();
    for (const event of trace.events) {
      eventCounts.set(event.eventType, (eventCounts.get(event.eventType) ?? 0) + 1);
    }

    // Calculate timing
    const missionDurationMs = trace.endTime ? trace.endTime - trace.startTime : 0;

    // Find initialization/shutdown times
    let initializationTimeMs = 0;
    let shutdownTimeMs = 0;

    const missionStartIndex = trace.events.findIndex((e) => e.eventType === 'mission_started');
    const missionInitIndex = trace.events.findIndex((e) => e.eventType === 'mission_initialized');
    const missionShutdownIndex = trace.events.findIndex((e) => e.eventType === 'mission_shutdown');

    if (missionStartIndex !== -1 && missionInitIndex !== -1) {
      const startEvent = trace.events[missionStartIndex];
      const initEvent = trace.events[missionInitIndex];
      if (startEvent && initEvent) {
        initializationTimeMs = initEvent.timestamp - startEvent.timestamp;
      }
    }

    if (missionShutdownIndex !== -1 && trace.endTime) {
      const shutdownEvent = trace.events[missionShutdownIndex];
      if (shutdownEvent) {
        shutdownTimeMs = trace.endTime - shutdownEvent.timestamp;
      }
    }

    // Calculate execution time (from first tick to last tick)
    let executionTimeMs = 0;
    const firstTickIndex = trace.events.findIndex((e) => e.eventType === 'mission_tick');
    const lastTickIndex = [...trace.events]
      .reverse()
      .findIndex((e) => e.eventType === 'mission_tick');
    if (firstTickIndex !== -1 && lastTickIndex !== -1) {
      const firstEvent = trace.events[firstTickIndex];
      const lastIdx = trace.events.length - 1 - lastTickIndex;
      const lastEvent = trace.events[lastIdx];
      if (firstEvent && lastEvent) {
        executionTimeMs = lastEvent.timestamp - firstEvent.timestamp;
      }
    }

    // Count event categories
    const lifecycleEventTypes = [
      'mission_started',
      'mission_initialized',
      'mission_completed',
      'mission_failed',
      'mission_shutdown',
    ];
    const reasoningEventTypes = [
      'goal_created',
      'planner_invoked',
      'plan_generated',
      'plan_empty',
      'plan_error',
      'decision_engine_invoked',
      'decision_selected',
      'decision_error',
    ];
    const executionEventTypes = [
      'mission_tick',
      'command_executed',
      'command_failed',
      'world_state_updated',
    ];

    const lifecycleEvents = lifecycleEventTypes.reduce((sum, type) => sum + (eventCounts.get(type) ?? 0), 0);
    const reasoningEvents = reasoningEventTypes.reduce((sum, type) => sum + (eventCounts.get(type) ?? 0), 0);
    const executionEvents = executionEventTypes.reduce((sum, type) => sum + (eventCounts.get(type) ?? 0), 0);

    // Extract specific metrics
    const totalTicks = eventCounts.get('mission_tick') ?? 0;
    const plannerInvocations = eventCounts.get('planner_invoked') ?? 0;
    const plansGenerated = eventCounts.get('plan_generated') ?? 0;
    const planErrors = eventCounts.get('plan_error') ?? 0;
    const decisionEngineInvocations = eventCounts.get('decision_engine_invoked') ?? 0;
    const decisionsSelected = eventCounts.get('decision_selected') ?? 0;
    const decisionErrors = eventCounts.get('decision_error') ?? 0;
    const commandsExecuted = (eventCounts.get('command_executed') ?? 0) + (eventCounts.get('command_failed') ?? 0);
    const successfulCommands = eventCounts.get('command_executed') ?? 0;
    const failedCommands = eventCounts.get('command_failed') ?? 0;
    const worldStateUpdates = eventCounts.get('world_state_updated') ?? 0;
    const goalsCreated = eventCounts.get('goal_created') ?? 0;

    // Calculate derived metrics
    const commandSuccessRate = commandsExecuted > 0 ? successfulCommands / commandsExecuted : 0;
    const averageTickDurationMs = totalTicks > 0 ? executionTimeMs / totalTicks : 0;
    const averageCommandsPerTick = totalTicks > 0 ? commandsExecuted / totalTicks : 0;
    const averageDecisionsPerTick = totalTicks > 0 ? decisionsSelected / totalTicks : 0;

    const metrics: RuntimeMetrics = Object.freeze({
      missionId: trace.missionId,
      status: trace.status as 'completed' | 'failed',

      missionDurationMs,
      initializationTimeMs,
      shutdownTimeMs,
      executionTimeMs,

      totalEvents: trace.events.length,
      lifecycleEvents,
      reasoningEvents,
      executionEvents,

      totalTicks,
      plannerInvocations,
      plansGenerated,
      planErrors,
      decisionEngineInvocations,
      decisionsSelected,
      decisionErrors,

      commandsExecuted,
      successfulCommands,
      failedCommands,
      commandSuccessRate,

      worldStateUpdates,
      goalsCreated,

      averageTickDurationMs,
      averageCommandsPerTick,
      averageDecisionsPerTick,
    });

    return metrics;
  }
}

/**
 * Format runtime metrics as human-readable text.
 */
export function formatMetrics(metrics: RuntimeMetrics): string {
  const lines: string[] = [];

  lines.push('╭─ RUNTIME METRICS ' + '─'.repeat(60) + '╮');
  lines.push(`│ Mission: ${metrics.missionId}`);
  lines.push(`│ Status: ${metrics.status.toUpperCase()}`);
  lines.push('├' + '─'.repeat(77) + '┤');

  lines.push('│ TIMING');
  lines.push(`│   Mission Duration: ${metrics.missionDurationMs} ms`);
  lines.push(`│   Initialization:   ${metrics.initializationTimeMs} ms`);
  lines.push(`│   Execution:        ${metrics.executionTimeMs} ms`);
  lines.push(`│   Shutdown:         ${metrics.shutdownTimeMs} ms`);
  lines.push('│');

  lines.push('│ EVENTS');
  lines.push(`│   Total Events:     ${metrics.totalEvents}`);
  lines.push(`│   Lifecycle:        ${metrics.lifecycleEvents}`);
  lines.push(`│   Reasoning:        ${metrics.reasoningEvents}`);
  lines.push(`│   Execution:        ${metrics.executionEvents}`);
  lines.push('│');

  lines.push('│ EXECUTION');
  lines.push(`│   Total Ticks:      ${metrics.totalTicks}`);
  lines.push(`│   Avg Tick Time:    ${metrics.averageTickDurationMs.toFixed(2)} ms`);
  lines.push('│');

  lines.push('│ PLANNING');
  lines.push(`│   Planner Calls:    ${metrics.plannerInvocations}`);
  lines.push(`│   Plans Generated:  ${metrics.plansGenerated}`);
  lines.push(`│   Plan Errors:      ${metrics.planErrors}`);
  lines.push('│');

  lines.push('│ DECISION MAKING');
  lines.push(`│   Decision Calls:   ${metrics.decisionEngineInvocations}`);
  lines.push(`│   Decisions Made:   ${metrics.decisionsSelected}`);
  lines.push(`│   Decision Errors:  ${metrics.decisionErrors}`);
  lines.push(`│   Avg/Tick:         ${metrics.averageDecisionsPerTick.toFixed(2)}`);
  lines.push('│');

  lines.push('│ COMMANDS');
  lines.push(`│   Executed:         ${metrics.commandsExecuted}`);
  lines.push(`│   Successful:       ${metrics.successfulCommands}`);
  lines.push(`│   Failed:           ${metrics.failedCommands}`);
  lines.push(`│   Success Rate:     ${(metrics.commandSuccessRate * 100).toFixed(1)}%`);
  lines.push(`│   Avg/Tick:         ${metrics.averageCommandsPerTick.toFixed(2)}`);
  lines.push('│');

  lines.push('│ WORLD STATE');
  lines.push(`│   Updates:          ${metrics.worldStateUpdates}`);
  lines.push('│');

  lines.push('│ GOALS');
  lines.push(`│   Created:          ${metrics.goalsCreated}`);
  lines.push('╰' + '─'.repeat(77) + '╯');

  return lines.join('\n');
}

/**
 * Convert runtime metrics to JSON.
 */
export function metricsToJson(metrics: RuntimeMetrics): string {
  return JSON.stringify(metrics, null, 2);
}
