import type { Goal } from '@ai-commander/goals';
import type { Plan, PlanStep } from '@ai-commander/planner';
import type { Command } from '@ai-commander/domain';
import type { CommandExecutionResult } from '@ai-commander/adapter';

/**
 * Execution Trace: Structured record of agent's reasoning and actions.
 *
 * Captures the complete mission lifecycle deterministically:
 * - Mission initialization
 * - Goal creation
 * - Planning invocation and results
 * - Decision selection
 * - Command execution
 * - World state updates
 * - Mission completion
 *
 * Deterministic: Same mission produces identical trace every time.
 * Human-readable: Can be printed and understood.
 * Machine-readable: Can be parsed for analysis, replay, visualization.
 */

export interface TraceEvent {
  readonly timestamp: number;
  readonly tick: number;
  readonly eventType: TraceEventType;
  readonly data: Record<string, unknown>;
}

export type TraceEventType =
  | 'mission_started'
  | 'mission_initialized'
  | 'goal_created'
  | 'goal_evaluated'
  | 'goal_selected'
  | 'goal_changed'
  | 'planner_invoked'
  | 'plan_generated'
  | 'plan_reused'
  | 'plan_invalidated'
  | 'plan_empty'
  | 'plan_error'
  | 'decision_engine_invoked'
  | 'decision_selected'
  | 'decision_error'
  | 'command_executed'
  | 'command_failed'
  | 'command_skipped'
  | 'failure_detected'
  | 'diagnosis_generated'
  | 'recovery_selected'
  | 'recovery_completed'
  | 'world_state_updated'
  | 'mission_tick'
  | 'mission_completed'
  | 'mission_failed'
  | 'mission_shutdown';

export interface ExecutionTrace {
  readonly missionId: string;
  readonly targetX: number;
  readonly targetY: number;
  readonly startTime: number;
  readonly endTime: number | null;
  readonly events: readonly TraceEvent[];
  readonly status: 'running' | 'completed' | 'failed';
}

/**
 * ExecutionTracer: Records structured execution trace.
 *
 * Handles all tracing logic, keeping it separate from mission logic.
 * Can be replaced with different tracing implementations without
 * affecting the agent.
 */
export class ExecutionTracer {
  private missionId: string;
  private targetX: number;
  private targetY: number;
  private startTime: number;
  private events: TraceEvent[] = [];
  private status: 'running' | 'completed' | 'failed' = 'running';
  private currentTick: number = 0;

  constructor(missionId: string, targetX: number, targetY: number) {
    this.missionId = missionId;
    this.targetX = targetX;
    this.targetY = targetY;
    this.startTime = Date.now();
  }

  recordMissionStarted(): void {
    this.addEvent('mission_started', {
      missionId: this.missionId,
      targetX: this.targetX,
      targetY: this.targetY,
    });
  }

  recordMissionInitialized(): void {
    this.addEvent('mission_initialized', {
      missionId: this.missionId,
    });
  }

  recordGoalCreated(goal: Goal): void {
    this.addEvent('goal_created', {
      goalId: goal.id,
      goalIntent: goal.intent,
      goalParameters: goal.parameters,
      goalStatus: goal.status,
    });
  }

  recordGoalEvaluated(goal: Goal, evaluation: any): void {
    this.addEvent('goal_evaluated', {
      goalId: goal.id,
      goalIntent: goal.intent,
      score: evaluation.score,
      statusFactor: evaluation.statusFactor,
      priorityFactor: evaluation.priorityFactor,
      urgencyFactor: evaluation.urgencyFactor,
      feasibilityFactor: evaluation.feasibilityFactor,
      reasoning: evaluation.reasoning,
    });
  }

  recordGoalSelected(goal: Goal, reasoning: string): void {
    this.addEvent('goal_selected', {
      goalId: goal.id,
      goalIntent: goal.intent,
      reasoning,
    });
  }

  recordGoalChanged(previousGoal: Goal, newGoal: Goal, reason: string): void {
    this.addEvent('goal_changed', {
      previousGoalId: previousGoal.id,
      previousGoalIntent: previousGoal.intent,
      newGoalId: newGoal.id,
      newGoalIntent: newGoal.intent,
      reason,
    });
  }

  recordPlannerInvoked(targetX: number, targetY: number): void {
    this.addEvent('planner_invoked', {
      targetX,
      targetY,
    });
  }

  recordPlanGenerated(plan: Plan): void {
    this.addEvent('plan_generated', {
      planId: plan.id,
      planStatus: plan.status,
      stepCount: plan.steps.length,
      expectedOutcome: plan.expectedOutcome,
      steps: plan.steps.map((step) => ({
        id: step.id,
        sequenceNumber: step.sequenceNumber,
        status: step.status,
        actionType: step.command.actionType,
        parameters: step.command.parameters,
      })),
    });
  }

  recordPlanEmpty(): void {
    this.addEvent('plan_empty', {});
  }

  recordPlanError(error: string): void {
    this.addEvent('plan_error', {
      error,
    });
  }

  recordPlanReused(plan: Plan): void {
    this.addEvent('plan_reused', {
      planId: plan.id,
      stepCount: plan.steps.length,
    });
  }

  recordPlanInvalidated(plan: Plan, reason: string): void {
    this.addEvent('plan_invalidated', {
      planId: plan.id,
      reason,
    });
  }

  recordDecisionEngineInvoked(): void {
    this.addEvent('decision_engine_invoked', {});
  }

  recordDecisionSelected(step: PlanStep, command: Command): void {
    this.addEvent('decision_selected', {
      stepId: step.id,
      sequenceNumber: step.sequenceNumber,
      commandActionType: command.actionType,
      commandParameters: command.parameters,
    });
  }

  recordDecisionError(error: string): void {
    this.addEvent('decision_error', {
      error,
    });
  }

  recordCommandExecuted(command: Command, result: CommandExecutionResult): void {
    this.addEvent('command_executed', {
      commandActionType: command.actionType,
      commandParameters: command.parameters,
      success: result.success,
      message: result.message,
      data: result.data,
    });
  }

  recordCommandFailed(command: Command, result: CommandExecutionResult): void {
    this.addEvent('command_failed', {
      commandActionType: command.actionType,
      commandParameters: command.parameters,
      message: result.message,
      error: result.error,
    });
  }

  recordCommandSkipped(command: Command, reason: string): void {
    this.addEvent('command_skipped', {
      commandActionType: command.actionType,
      commandParameters: command.parameters,
      reason,
    });
  }

  recordFailureDetected(reason: string): void {
    this.addEvent('failure_detected', {
      reason,
    });
  }

  recordDiagnosisGenerated(diagnosis: any): void {
    this.addEvent('diagnosis_generated', {
      category: diagnosis.category,
      severity: diagnosis.severity,
      description: diagnosis.description,
      evidence: diagnosis.evidence,
    });
  }

  recordRecoverySelected(recovery: any): void {
    this.addEvent('recovery_selected', {
      action: recovery.action,
      reason: recovery.reason,
    });
  }

  recordRecoveryCompleted(recoveryAction: string, outcome: string): void {
    this.addEvent('recovery_completed', {
      action: recoveryAction,
      outcome,
    });
  }

  recordWorldStateUpdated(agentX: number, agentY: number, tick: number): void {
    this.addEvent('world_state_updated', {
      agentX,
      agentY,
      tick,
    });
  }

  recordMissionTick(tickNumber: number): void {
    this.currentTick = tickNumber;
    this.addEvent('mission_tick', {
      tickNumber,
    });
  }

  recordMissionCompleted(): void {
    this.status = 'completed';
    this.addEvent('mission_completed', {
      totalTicks: this.currentTick,
      totalEvents: this.events.length,
    });
  }

  recordMissionFailed(reason: string): void {
    this.status = 'failed';
    this.addEvent('mission_failed', {
      reason,
    });
  }

  recordMissionShutdown(): void {
    this.addEvent('mission_shutdown', {
      duration: Date.now() - this.startTime,
    });
  }

  getTrace(): ExecutionTrace {
    return Object.freeze({
      missionId: this.missionId,
      targetX: this.targetX,
      targetY: this.targetY,
      startTime: this.startTime,
      endTime: this.status === 'running' ? null : Date.now(),
      events: Object.freeze([...this.events]),
      status: this.status,
    });
  }

  private addEvent(eventType: TraceEventType, data: Record<string, unknown>): void {
    const event: TraceEvent = Object.freeze({
      timestamp: Date.now(),
      tick: this.currentTick,
      eventType,
      data: Object.freeze(data),
    });
    this.events.push(event);
  }
}

/**
 * Format an execution trace as a human-readable string.
 */
export function formatTrace(trace: ExecutionTrace): string {
  const lines: string[] = [];

  lines.push('='.repeat(80));
  lines.push(`EXECUTION TRACE: ${trace.missionId}`);
  lines.push(`Target: (${trace.targetX}, ${trace.targetY})`);
  lines.push(`Status: ${trace.status}`);
  lines.push(`Duration: ${trace.endTime ? trace.endTime - trace.startTime : '?'} ms`);
  lines.push(`Events: ${trace.events.length}`);
  lines.push('='.repeat(80));
  lines.push('');

  for (let i = 0; i < trace.events.length; i++) {
    const event = trace.events[i];
    if (!event) continue;

    const relativeTime = event.timestamp - trace.startTime;
    const padding = String(i).padStart(3, '0');

    lines.push(
      `[${padding}] T+${relativeTime.toString().padStart(5)} Tick ${event.tick.toString().padStart(2)}`
    );
    lines.push(`    Event: ${event.eventType}`);

    // Format specific event types
    if (event.eventType === 'goal_created') {
      lines.push(`    Goal: ${event.data.goalIntent as string}`);
    } else if (event.eventType === 'goal_evaluated') {
      lines.push(`    📊 Evaluated: ${event.data.goalIntent as string}`);
      lines.push(`    Score: ${(event.data.score as number).toFixed(2)}`);
      lines.push(`    ${event.data.reasoning as string}`);
    } else if (event.eventType === 'goal_selected') {
      lines.push(`    ⭐ Selected: ${event.data.goalIntent as string}`);
      lines.push(`    ${event.data.reasoning as string}`);
    } else if (event.eventType === 'goal_changed') {
      lines.push(`    🔄 Goal changed`);
      lines.push(`    From: ${event.data.previousGoalIntent as string}`);
      lines.push(`    To: ${event.data.newGoalIntent as string}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'plan_generated') {
      lines.push(`    Plan: ${event.data.stepCount as number} steps`);
    } else if (event.eventType === 'plan_reused') {
      lines.push(`    Plan reused: ${event.data.stepCount as number} steps`);
    } else if (event.eventType === 'plan_invalidated') {
      lines.push(`    Plan invalidated`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'decision_selected') {
      lines.push(
        `    Selected: ${event.data.commandActionType as string}(${JSON.stringify(event.data.commandParameters)})`
      );
    } else if (event.eventType === 'command_executed') {
      lines.push(
        `    Command: ${event.data.commandActionType as string}(${JSON.stringify(event.data.commandParameters)})`
      );
      lines.push(`    Result: ${event.data.success ? 'SUCCESS' : 'FAILED'}`);
    } else if (event.eventType === 'command_skipped') {
      lines.push(
        `    Skipped: ${event.data.commandActionType as string}(${JSON.stringify(event.data.commandParameters)})`
      );
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'failure_detected') {
      lines.push(`    ⚠ Failure detected`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'diagnosis_generated') {
      lines.push(`    📋 Diagnosis: ${event.data.category as string}`);
      lines.push(`    Severity: ${event.data.severity as string}`);
      lines.push(`    Description: ${event.data.description as string}`);
    } else if (event.eventType === 'recovery_selected') {
      lines.push(`    🔧 Recovery: ${event.data.action as string}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'recovery_completed') {
      lines.push(`    ✓ Recovery completed: ${event.data.outcome as string}`);
    } else if (event.eventType === 'world_state_updated') {
      lines.push(`    Position: (${event.data.agentX as number}, ${event.data.agentY as number})`);
    }

    lines.push('');
  }

  lines.push('='.repeat(80));
  lines.push('');

  return lines.join('\n');
}

/**
 * Convert execution trace to JSON for machine reading.
 */
export function traceToJson(trace: ExecutionTrace): string {
  return JSON.stringify(trace, null, 2);
}
