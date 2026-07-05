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
  | 'goal_lifecycle_transitioned'
  | 'goal_evaluated'
  | 'goal_candidates_evaluated'
  | 'goal_selected'
  | 'goal_adapted'
  | 'goal_changed'
  | 'goal_progress_updated'
  | 'goal_progress_trend_changed'
  | 'goal_completed'
  | 'resource_field_detected'
  | 'resource_field_selected'
  | 'gathering_started'
  | 'gathering_progress_updated'
  | 'gathering_completed'
  | 'worker_movement_started'
  | 'worker_position_updated'
  | 'worker_arrival_detected'
  | 'worker_gathering_begun'
  | 'worker_return_started'
  | 'worker_return_progress'
  | 'worker_return_complete'
  | 'resources_deposited'
  | 'production_started'
  | 'production_progress_updated'
  | 'production_completed'
  | 'unit_spawned'
  | 'worker_assigned'
  | 'worker_reassigned'
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
  | 'mission_shutdown'
  | 'economy_observed'
  | 'economy_scaling_decision'
  | 'economy_saturation_reached'
  | 'expansion_observed'
  | 'expansion_decision'
  | 'expansion_started'
  | 'expansion_progress_updated'
  | 'expansion_completed'
  | 'building_observed'
  | 'building_decision'
  | 'building_started'
  | 'building_progress_updated'
  | 'building_completed'
  | 'military_production_observed'
  | 'military_production_decision'
  | 'military_production_started'
  | 'military_unit_spawned'
  | 'tactical_positioning_observed'
  | 'tactical_positioning_decision'
  | 'tactical_movement_started'
  | 'tactical_arrival_detected'
  | 'threat_scan_completed'
  | 'threat_detected'
  | 'threat_priority_updated'
  | 'threat_resolved'
  | 'combat_decision_made'
  | 'combat_attack_issued'
  | 'combat_retreat_ordered'
  | 'combat_outcome_detected'
  | 'army_groups_formed'
  | 'army_group_coordination'
  | 'army_group_disbanded'
  | 'scouting_target_selected'
  | 'scouting_movement_started'
  | 'region_explored'
  | 'enemy_discovered'
  | 'enemy_position_updated'
  | 'enemy_lost'
  | 'defense_assigned'
  | 'defense_recalled';

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

  recordGoalLifecycleTransitioned(
    goalId: string,
    goalIntent: string,
    fromState: string,
    toState: string,
    reason?: string
  ): void {
    this.addEvent('goal_lifecycle_transitioned', {
      goalId,
      goalIntent,
      fromState,
      toState,
      reason: reason || '',
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

  recordGoalCandidatesEvaluated(evaluations: any[]): void {
    this.addEvent('goal_candidates_evaluated', {
      candidateCount: evaluations.length,
      evaluations: evaluations.map(e => ({
        goalId: e.goal.id,
        goalIntent: e.goal.intent,
        score: e.score,
        statusFactor: e.statusFactor,
        priorityFactor: e.priorityFactor,
        urgencyFactor: e.urgencyFactor,
        feasibilityFactor: e.feasibilityFactor,
        reasoning: e.reasoning,
      })),
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

  recordGoalAdapted(
    previousGoalId: string,
    previousGoalIntent: string,
    newGoalId: string,
    newGoalIntent: string,
    previousScore: number,
    newScore: number,
    worldStateChange: string,
    reasoning: string
  ): void {
    this.addEvent('goal_adapted', {
      previousGoalId,
      previousGoalIntent,
      newGoalId,
      newGoalIntent,
      previousScore,
      newScore,
      worldStateChange,
      reasoning,
    });
  }

  recordGoalProgressUpdated(progress: any): void {
    this.addEvent('goal_progress_updated', {
      goalId: progress.goalId,
      goalIntent: progress.goalIntent,
      progressPercent: progress.progressPercent,
      progressReason: progress.progressReason,
      trend: progress.trend,
      evidence: progress.evidence,
    });
  }

  recordGoalProgressTrendChanged(goalId: string, goalIntent: string, previousTrend: string, newTrend: string): void {
    this.addEvent('goal_progress_trend_changed', {
      goalId,
      goalIntent,
      previousTrend,
      newTrend,
    });
  }

  recordGoalCompleted(goalId: string, goalIntent: string, finalProgress: number): void {
    this.addEvent('goal_completed', {
      goalId,
      goalIntent,
      finalProgress,
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

  recordResourceFieldDetected(fieldId: string, resourceType: string, amount: number, position: { x: number; y: number }): void {
    this.addEvent('resource_field_detected', {
      fieldId,
      resourceType,
      amount,
      position,
    });
  }

  recordResourceFieldSelected(fieldId: string, resourceType: string, score: number, reasoning: string): void {
    this.addEvent('resource_field_selected', {
      fieldId,
      resourceType,
      score,
      reasoning,
    });
  }

  recordGatheringStarted(fieldId: string, resourceType: string, targetAmount: number): void {
    this.addEvent('gathering_started', {
      fieldId,
      resourceType,
      targetAmount,
    });
  }

  recordGatheringProgressUpdated(
    fieldId: string,
    resourceType: string,
    amountCollected: number,
    amountRemaining: number,
    percentComplete: number,
    status: 'traveling' | 'gathering' | 'returning' | 'complete'
  ): void {
    this.addEvent('gathering_progress_updated', {
      fieldId,
      resourceType,
      amountCollected,
      amountRemaining,
      percentComplete,
      status,
    });
  }

  recordGatheringCompleted(fieldId: string, resourceType: string, totalCollected: number): void {
    this.addEvent('gathering_completed', {
      fieldId,
      resourceType,
      totalCollected,
    });
  }

  recordWorkerMovementStarted(fieldId: string, targetPosition: { x: number; y: number }, currentPosition: { x: number; y: number }): void {
    this.addEvent('worker_movement_started', {
      fieldId,
      targetPosition,
      currentPosition,
      distance: Math.abs(targetPosition.x - currentPosition.x) + Math.abs(targetPosition.y - currentPosition.y),
    });
  }

  recordWorkerPositionUpdated(
    fieldId: string,
    currentPosition: { x: number; y: number },
    targetPosition: { x: number; y: number },
    distanceRemaining: number,
    percentComplete: number
  ): void {
    this.addEvent('worker_position_updated', {
      fieldId,
      currentPosition,
      targetPosition,
      distanceRemaining,
      percentComplete,
    });
  }

  recordWorkerArrivalDetected(fieldId: string, arrivedPosition: { x: number; y: number }, ticksToArrive: number): void {
    this.addEvent('worker_arrival_detected', {
      fieldId,
      arrivedPosition,
      ticksToArrive,
    });
  }

  recordWorkerGatheringBegun(fieldId: string, resourceType: string, targetAmount: number): void {
    this.addEvent('worker_gathering_begun', {
      fieldId,
      resourceType,
      targetAmount,
    });
  }

  recordWorkerReturnStarted(fieldId: string, resourceType: string, amountCollected: number, basePosition: { x: number; y: number }): void {
    this.addEvent('worker_return_started', {
      fieldId,
      resourceType,
      amountCollected,
      basePosition,
    });
  }

  recordWorkerReturnProgress(currentPosition: { x: number; y: number }, basePosition: { x: number; y: number }, distanceRemaining: number, percentComplete: number): void {
    this.addEvent('worker_return_progress', {
      currentPosition,
      basePosition,
      distanceRemaining,
      percentComplete,
    });
  }

  recordWorkerReturnComplete(basePosition: { x: number; y: number }, resourcesReturned: number, ticksToReturn: number): void {
    this.addEvent('worker_return_complete', {
      basePosition,
      resourcesReturned,
      ticksToReturn,
    });
  }

  recordResourcesDeposited(amount: number): void {
    this.addEvent('resources_deposited', {
      amount,
    });
  }

  recordProductionStarted(buildingId: string, unitType: string, cost: number, buildTime: number): void {
    this.addEvent('production_started', {
      buildingId,
      unitType,
      cost,
      buildTime,
    });
  }

  recordProductionProgressUpdated(buildingId: string, unitType: string, percentComplete: number, status: string): void {
    this.addEvent('production_progress_updated', {
      buildingId,
      unitType,
      percentComplete,
      status,
    });
  }

  recordProductionCompleted(buildingId: string, unitType: string): void {
    this.addEvent('production_completed', {
      buildingId,
      unitType,
    });
  }

  recordUnitSpawned(unitId: string, unitType: string, position: { x: number; y: number }): void {
    this.addEvent('unit_spawned', {
      unitId,
      unitType,
      position,
    });
  }

  recordWorkerAssigned(workerId: string, fieldId: string, resourceType: string): void {
    this.addEvent('worker_assigned', {
      workerId,
      fieldId,
      resourceType,
    });
  }

  recordWorkerReassigned(workerId: string, oldFieldId: string, newFieldId: string, reason: string): void {
    this.addEvent('worker_reassigned', {
      workerId,
      oldFieldId,
      newFieldId,
      reason,
    });
  }

  recordEconomyObserved(snapshot: any): void {
    this.addEvent('economy_observed', {
      totalWorkers: snapshot.totalWorkers,
      activeGatheringWorkers: snapshot.activeGatheringWorkers,
      idleWorkers: snapshot.idleWorkers,
      availableFieldCount: snapshot.availableFieldCount,
      currentResources: snapshot.currentResources,
      averageFieldSaturation: snapshot.averageFieldSaturation,
      efficiency: snapshot.efficiency,
    });
  }

  recordEconomyScalingDecision(decision: any): void {
    this.addEvent('economy_scaling_decision', {
      shouldProduce: decision.shouldProduce,
      reason: decision.reason,
      optimalWorkerCount: decision.optimalWorkerCount,
      currentWorkerCount: decision.currentWorkerCount,
      efficiency: decision.efficiency,
    });
  }

  recordEconomySaturationReached(): void {
    this.addEvent('economy_saturation_reached', {});
  }

  recordExpansionObserved(dropOffCount: number, fieldCount: number, avgDistance: number): void {
    this.addEvent('expansion_observed', {
      dropOffCount,
      fieldCount,
      avgDistance,
    });
  }

  recordExpansionDecision(decision: any): void {
    this.addEvent('expansion_decision', {
      shouldExpand: decision.shouldExpand,
      reason: decision.reason,
      targetLocation: decision.targetLocation,
      expectedGainPercent: decision.expectedGainPercent,
    });
  }

  recordExpansionStarted(position: { x: number; y: number }, cost: number): void {
    this.addEvent('expansion_started', {
      position,
      cost,
    });
  }

  recordExpansionProgressUpdated(position: { x: number; y: number }, percentComplete: number): void {
    this.addEvent('expansion_progress_updated', {
      position,
      percentComplete,
    });
  }

  recordExpansionCompleted(position: { x: number; y: number }, constructionTime: number): void {
    this.addEvent('expansion_completed', {
      position,
      constructionTime,
    });
  }

  recordBuildingObserved(count: number): void {
    this.addEvent('building_observed', { count });
  }

  recordBuildingDecision(decision: Record<string, unknown>): void {
    this.addEvent('building_decision', decision);
  }

  recordBuildingStarted(buildingType: string, position: { x: number; y: number }): void {
    this.addEvent('building_started', { buildingType, position });
  }

  recordBuildingProgressUpdated(position: { x: number; y: number }, percentComplete: number): void {
    this.addEvent('building_progress_updated', { position, percentComplete });
  }

  recordBuildingCompleted(buildingType: string, position: { x: number; y: number }, constructionTime: number): void {
    this.addEvent('building_completed', { buildingType, position, constructionTime });
  }

  recordMilitaryProductionObserved(buildingCount: number, unitCount: number): void {
    this.addEvent('military_production_observed', { buildingCount, unitCount });
  }

  recordMilitaryProductionDecision(decision: Record<string, unknown>): void {
    this.addEvent('military_production_decision', decision);
  }

  recordMilitaryProductionStarted(unitType: string, buildingId: string, position: { x: number; y: number }): void {
    this.addEvent('military_production_started', { unitType, buildingId, position });
  }

  recordMilitaryUnitSpawned(unitType: string, unitId: string, position: { x: number; y: number }): void {
    this.addEvent('military_unit_spawned', { unitType, unitId, position });
  }

  recordTacticalPositioningObserved(unitCount: number): void {
    this.addEvent('tactical_positioning_observed', { unitCount });
  }

  recordTacticalPositioningDecision(decision: Record<string, unknown>): void {
    this.addEvent('tactical_positioning_decision', decision);
  }

  recordTacticalMovementStarted(unitId: string, fromPosition: { x: number; y: number }, toPosition: { x: number; y: number }): void {
    this.addEvent('tactical_movement_started', { unitId, fromPosition, toPosition });
  }

  recordTacticalArrivalDetected(unitId: string, position: { x: number; y: number }): void {
    this.addEvent('tactical_arrival_detected', { unitId, position });
  }

  recordThreatScanCompleted(threatCount: number, highestPriority: number): void {
    this.addEvent('threat_scan_completed', { threatCount, highestPriority });
  }

  recordThreatDetected(threatId: string, threatType: string, position: { x: number; y: number }, priority: number): void {
    this.addEvent('threat_detected', { threatId, threatType, position, priority });
  }

  recordThreatPriorityUpdated(threatId: string, oldPriority: number, newPriority: number): void {
    this.addEvent('threat_priority_updated', { threatId, oldPriority, newPriority });
  }

  recordThreatResolved(threatId: string): void {
    this.addEvent('threat_resolved', { threatId });
  }

  recordCombatDecisionMade(decision: Record<string, unknown>): void {
    this.addEvent('combat_decision_made', decision);
  }

  recordCombatAttackIssued(unitId: string, targetId: string, position: { x: number; y: number }): void {
    this.addEvent('combat_attack_issued', { unitId, targetId, position });
  }

  recordCombatRetreatOrdered(unitId: string, reason: string): void {
    this.addEvent('combat_retreat_ordered', { unitId, reason });
  }

  recordCombatOutcomeDetected(unitId: string, targetId: string, outcome: string): void {
    this.addEvent('combat_outcome_detected', { unitId, targetId, outcome });
  }

  recordArmyGroupsFormed(groupCount: number, totalUnits: number): void {
    this.addEvent('army_groups_formed', { groupCount, totalUnits });
  }

  recordArmyGroupCoordination(decision: Record<string, unknown>): void {
    this.addEvent('army_group_coordination', decision);
  }

  recordArmyGroupDisbanded(groupId: string, reason: string): void {
    this.addEvent('army_group_disbanded', { groupId, reason });
  }

  recordScoutingTargetSelected(scoutId: string, target: { x: number; y: number }, priority: number): void {
    this.addEvent('scouting_target_selected', { scoutId, target, priority });
  }

  recordScoutingMovementStarted(scoutId: string, fromPosition: { x: number; y: number }, toPosition: { x: number; y: number }): void {
    this.addEvent('scouting_movement_started', { scoutId, fromPosition, toPosition });
  }

  recordRegionExplored(position: { x: number; y: number }, coverage: number): void {
    this.addEvent('region_explored', { position, coverage });
  }

  recordEnemyDiscovered(enemyId: string, position: { x: number; y: number }, unitType: string): void {
    this.addEvent('enemy_discovered', { enemyId, position, unitType });
  }

  recordEnemyPositionUpdated(enemyId: string, position: { x: number; y: number }): void {
    this.addEvent('enemy_position_updated', { enemyId, position });
  }

  recordEnemyLost(enemyId: string, lastPosition: { x: number; y: number }): void {
    this.addEvent('enemy_lost', { enemyId, lastPosition });
  }

  recordDefenseAssigned(structureId: string, unitIds: readonly string[], position: { x: number; y: number }): void {
    this.addEvent('defense_assigned', { structureId, unitIds, position });
  }

  recordDefenseRecalled(unitId: string, reason: string): void {
    this.addEvent('defense_recalled', { unitId, reason });
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
    } else if (event.eventType === 'goal_progress_updated') {
      lines.push(`    📈 Progress: ${event.data.progressPercent as number}%`);
      lines.push(`    Trend: ${event.data.trend as string}`);
      lines.push(`    ${event.data.progressReason as string}`);
    } else if (event.eventType === 'goal_progress_trend_changed') {
      lines.push(`    📊 Trend changed: ${event.data.previousTrend as string} → ${event.data.newTrend as string}`);
    } else if (event.eventType === 'goal_completed') {
      lines.push(`    ✅ Goal completed: ${event.data.goalIntent as string}`);
      lines.push(`    Final progress: ${event.data.finalProgress as number}%`);
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
    } else if (event.eventType === 'economy_observed') {
      lines.push(`    💰 Economy Snapshot`);
      lines.push(`    Workers: ${event.data.totalWorkers as number} (${event.data.activeGatheringWorkers as number} gathering, ${event.data.idleWorkers as number} idle)`);
      lines.push(`    Fields: ${event.data.availableFieldCount as number} | Resources: ${event.data.currentResources as number}`);
      lines.push(`    Efficiency: ${((event.data.efficiency as number) * 100).toFixed(1)}%`);
    } else if (event.eventType === 'economy_scaling_decision') {
      lines.push(`    🔧 Scaling Decision: ${event.data.shouldProduce ? 'PRODUCE' : 'HOLD'}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
      lines.push(`    Workers: ${event.data.currentWorkerCount as number} → ${event.data.optimalWorkerCount as number} (optimal)`);
    } else if (event.eventType === 'economy_saturation_reached') {
      lines.push(`    ✅ Economy Saturation Reached`);
    } else if (event.eventType === 'expansion_observed') {
      lines.push(`    🏗️  Expansion State`);
      lines.push(`    Drop-offs: ${event.data.dropOffCount}, Fields: ${event.data.fieldCount}, Avg distance: ${event.data.avgDistance}`);
    } else if (event.eventType === 'expansion_decision') {
      lines.push(`    🔨 Expansion Decision: ${event.data.shouldExpand ? 'BUILD' : 'HOLD'}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'expansion_started') {
      lines.push(`    🚧 Construction Started`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'expansion_progress_updated') {
      lines.push(`    📊 Construction Progress: ${event.data.percentComplete}%`);
    } else if (event.eventType === 'expansion_completed') {
      lines.push(`    ✅ Expansion Complete`);
      lines.push(`    Time: ${event.data.constructionTime} ticks`);
    } else if (event.eventType === 'building_observed') {
      lines.push(`    🏗️  Production Buildings Observed`);
      lines.push(`    Count: ${event.data.count}`);
    } else if (event.eventType === 'building_decision') {
      lines.push(`    🔨 Building Decision: ${(event.data.shouldBuild as boolean) ? 'BUILD' : 'HOLD'}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'building_started') {
      lines.push(`    🚧 Building Construction Started`);
      lines.push(`    Type: ${event.data.buildingType}`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'building_progress_updated') {
      lines.push(`    📊 Building Progress: ${event.data.percentComplete}%`);
    } else if (event.eventType === 'building_completed') {
      lines.push(`    ✅ Building Complete`);
      lines.push(`    Type: ${event.data.buildingType}`);
      lines.push(`    Time: ${event.data.constructionTime} ticks`);
    } else if (event.eventType === 'military_production_observed') {
      lines.push(`    🎖️  Military Production Observed`);
      lines.push(`    Buildings: ${event.data.buildingCount} | Units: ${event.data.unitCount}`);
    } else if (event.eventType === 'military_production_decision') {
      lines.push(`    ⚔️  Military Production Decision: ${(event.data.shouldProduce as boolean) ? 'PRODUCE' : 'HOLD'}`);
      lines.push(`    Reason: ${event.data.reason as string}`);
    } else if (event.eventType === 'military_production_started') {
      lines.push(`    🚀 Military Production Started`);
      lines.push(`    Unit: ${event.data.unitType} | Building: ${event.data.buildingId}`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'military_unit_spawned') {
      lines.push(`    💪 Military Unit Spawned`);
      lines.push(`    Unit Type: ${event.data.unitType} | ID: ${event.data.unitId}`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'tactical_positioning_observed') {
      lines.push(`    🎯 Tactical Positioning Observed`);
      lines.push(`    Military Units: ${event.data.unitCount}`);
    } else if (event.eventType === 'tactical_positioning_decision') {
      lines.push(`    🗺️  Tactical Positioning Decision`);
      lines.push(`    Unit: ${event.data.unitId} | Move: ${(event.data.shouldMove as boolean) ? 'YES' : 'NO'}`);
      lines.push(`    Distance: ${event.data.distance} | Reason: ${event.data.reason}`);
    } else if (event.eventType === 'tactical_movement_started') {
      lines.push(`    ➡️  Tactical Movement Started`);
      lines.push(`    Unit: ${event.data.unitId}`);
      lines.push(`    From: (${(event.data.fromPosition as any).x}, ${(event.data.fromPosition as any).y}) → To: (${(event.data.toPosition as any).x}, ${(event.data.toPosition as any).y})`);
    } else if (event.eventType === 'tactical_arrival_detected') {
      lines.push(`    ✓ Tactical Arrival Detected`);
      lines.push(`    Unit: ${event.data.unitId} | Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'threat_scan_completed') {
      lines.push(`    🚨 Threat Scan Completed`);
      lines.push(`    Active Threats: ${event.data.threatCount} | Highest Priority: ${((event.data.highestPriority as number) * 100).toFixed(0)}%`);
    } else if (event.eventType === 'threat_detected') {
      lines.push(`    ⚠️  Threat Detected`);
      lines.push(`    Type: ${event.data.threatType} | Priority: ${((event.data.priority as number) * 100).toFixed(0)}%`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'threat_priority_updated') {
      lines.push(`    📊 Threat Priority Updated`);
      lines.push(`    Threat: ${event.data.threatId} | ${((event.data.oldPriority as number) * 100).toFixed(0)}% → ${((event.data.newPriority as number) * 100).toFixed(0)}%`);
    } else if (event.eventType === 'threat_resolved') {
      lines.push(`    ✓ Threat Resolved`);
      lines.push(`    Threat: ${event.data.threatId}`);
    } else if (event.eventType === 'combat_decision_made') {
      lines.push(`    ⚔️  Combat Decision: ${event.data.action}`);
      lines.push(`    Unit: ${event.data.unitId} | Reason: ${event.data.reason}`);
    } else if (event.eventType === 'combat_attack_issued') {
      lines.push(`    🔥 Combat Attack Issued`);
      lines.push(`    Unit: ${event.data.unitId} → Target: ${event.data.targetId}`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'combat_retreat_ordered') {
      lines.push(`    🏃 Combat Retreat Ordered`);
      lines.push(`    Unit: ${event.data.unitId} | Reason: ${event.data.reason}`);
    } else if (event.eventType === 'combat_outcome_detected') {
      lines.push(`    📊 Combat Outcome`);
      lines.push(`    Unit: ${event.data.unitId} vs Target: ${event.data.targetId} | Result: ${event.data.outcome}`);
    } else if (event.eventType === 'army_groups_formed') {
      lines.push(`    🎖️  Army Groups Formed`);
      lines.push(`    Groups: ${event.data.groupCount} | Total Units: ${event.data.totalUnits}`);
    } else if (event.eventType === 'army_group_coordination') {
      lines.push(`    🔗 Army Group Coordination`);
      lines.push(`    Group: ${event.data.groupId} | Action: ${event.data.action} | Cohesion: ${((event.data.cohesionScore as number) * 100).toFixed(0)}%`);
    } else if (event.eventType === 'army_group_disbanded') {
      lines.push(`    💔 Army Group Disbanded`);
      lines.push(`    Group: ${event.data.groupId} | Reason: ${event.data.reason}`);
    } else if (event.eventType === 'scouting_target_selected') {
      lines.push(`    🔭 Scouting Target Selected`);
      lines.push(`    Scout: ${event.data.scoutId} | Target: (${(event.data.target as any).x}, ${(event.data.target as any).y})`);
    } else if (event.eventType === 'scouting_movement_started') {
      lines.push(`    👁️  Scouting Movement Started`);
      lines.push(`    Scout: ${event.data.scoutId} | From: (${(event.data.fromPosition as any).x}, ${(event.data.fromPosition as any).y}) → To: (${(event.data.toPosition as any).x}, ${(event.data.toPosition as any).y})`);
    } else if (event.eventType === 'region_explored') {
      lines.push(`    ✓ Region Explored`);
      lines.push(`    Position: (${(event.data.position as any).x}, ${(event.data.position as any).y}) | Coverage: ${((event.data.coverage as number) * 100).toFixed(1)}%`);
    } else if (event.eventType === 'enemy_discovered') {
      lines.push(`    ⚠️  Enemy Discovered`);
      lines.push(`    Type: ${event.data.unitType} | Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'enemy_position_updated') {
      lines.push(`    📍 Enemy Position Updated`);
      lines.push(`    Enemy: ${event.data.enemyId} | New Position: (${(event.data.position as any).x}, ${(event.data.position as any).y})`);
    } else if (event.eventType === 'enemy_lost') {
      lines.push(`    ❌ Enemy Lost`);
      lines.push(`    Enemy: ${event.data.enemyId} | Last Position: (${(event.data.lastPosition as any).x}, ${(event.data.lastPosition as any).y})`);
    } else if (event.eventType === 'defense_assigned') {
      lines.push(`    🛡️  Defense Assigned`);
      lines.push(`    Structure: ${event.data.structureId} | Defenders: ${(event.data.unitIds as any[]).length}`);
    } else if (event.eventType === 'defense_recalled') {
      lines.push(`    📢 Defense Recalled`);
      lines.push(`    Unit: ${event.data.unitId} | Reason: ${event.data.reason}`);
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
