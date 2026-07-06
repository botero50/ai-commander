/**
 * Dashboard Integration: Bridges MissionAgent with DashboardServer.
 *
 * Provides real-time state updates from mission execution to the dashboard.
 * No modifications to framework or runtime required.
 * Subscribes to mission state changes and broadcasts to dashboard.
 */

import type { MissionAgent } from './mission-agent.js';
import type { AgentRuntime } from '@ai-commander/agent-runtime';
import type { ExecutionTrace, TraceEvent } from './execution-trace.js';
import type { RuntimeMetrics } from './runtime-metrics.js';
import type {
  DashboardServer,
  DashboardRuntimeState,
  DashboardMissionState,
  DashboardWorldState,
  DashboardTimelineEvent,
} from './dashboard-server.js';

/**
 * DashboardIntegration: Connects mission execution to dashboard visualization.
 */
export class DashboardIntegration {
  private dashboard: DashboardServer;
  private missionAgent: MissionAgent | null = null;
  private runtime: AgentRuntime | null = null;
  private trace: ExecutionTrace | null = null;
  private metrics: RuntimeMetrics | null = null;
  isPaused: boolean = false;
  shouldStop: boolean = false;
  private lastTickBroadcast: number = 0;
  private lastProcessedEventCount: number = 0;

  constructor(dashboard: DashboardServer) {
    this.dashboard = dashboard;
    this.setupControlHandlers();
  }

  /**
   * Setup control event handlers for dashboard.
   */
  private setupControlHandlers(): void {
    this.dashboard.onControl(async (command: string) => {
      switch (command) {
        case 'pause':
          this.isPaused = true;
          break;
        case 'resume':
          this.isPaused = false;
          break;
        case 'step':
          this.isPaused = true;
          break;
        case 'stop':
          this.shouldStop = true;
          break;
      }
    });
  }

  /**
   * Initialize integration with mission agent.
   */
  initializeWithMission(
    missionAgent: MissionAgent,
    runtime: AgentRuntime,
    trace: ExecutionTrace,
    metrics: RuntimeMetrics
  ): void {
    this.missionAgent = missionAgent;
    this.runtime = runtime;
    this.trace = trace;
    this.metrics = metrics;
    this.lastProcessedEventCount = (trace.events || []).length;

    // Initialize debugger with trace data
    this.dashboard.initializeDebugger(trace, metrics);

    // Initial state update
    this.updateAllState();
  }

  /**
   * Check if execution should pause.
   */
  shouldPauseExecution(): boolean {
    return this.isPaused;
  }

  /**
   * Check if execution should stop.
   */
  shouldStopExecution(): boolean {
    return this.shouldStop;
  }

  /**
   * Update dashboard state after each tick.
   */
  updateAfterTick(currentTick: number, trace: ExecutionTrace, metrics: RuntimeMetrics): void {
    this.trace = trace;
    this.metrics = metrics;

    // Send updates every tick instead of throttling
    // The browser connection might be slow to establish
    this.updateRuntimeState(currentTick);
    this.updateMissionState();
    this.updateWorldState();
    this.updateTimelineState();
  }

  /**
   * Simple tick update that refreshes runtime state (elapsed time, etc).
   */
  updateOnTick(currentTick: number): void {
    if (!this.trace || !this.metrics) return;
    this.updateRuntimeState(currentTick);
  }

  /**
   * Update all dashboard panels.
   */
  private updateAllState(): void {
    if (!this.runtime || !this.trace || !this.metrics) return;

    const currentTick = 0;
    this.updateRuntimeState(currentTick);
    this.updateMissionState();
    this.updateWorldState();
    this.updateTimelineState();
  }

  /**
   * Update runtime state panel.
   */
  private updateRuntimeState(currentTick: number): void {
    if (!this.runtime || !this.trace || !this.metrics) return;

    const runtimeStatus = (this.runtime.getStatus?.() as any) || 'unknown';
    const executionMode = this.isPaused ? 'paused' : 'continuous';

    // Calculate elapsed time dynamically from trace (not from stale metrics)
    const elapsedMs = this.trace.endTime
      ? this.trace.endTime - this.trace.startTime
      : Date.now() - this.trace.startTime;

    const status = mapRuntimeStatus(runtimeStatus);
    const runtimeState: DashboardRuntimeState = Object.freeze({
      status,
      currentTick,
      missionId: this.trace.missionId,
      elapsedMs,
      executionMode,
    });

    this.dashboard.updateState({ runtime: runtimeState });
  }

  /**
   * Update mission state panel.
   */
  private updateMissionState(): void {
    if (!this.trace) return;

    const progress = this.extractProgress();
    const goalCandidates = this.extractGoalCandidates();
    const goalLifecycles = this.extractGoalLifecycles();
    const lastGoalAdaptation = this.extractLastGoalAdaptation();
    const gatheringProgress = this.extractGatheringProgress();

    const missionState: DashboardMissionState = Object.freeze({
      goalId: 'goal-movement',
      goalIntent: `Move to (${this.trace.targetX}, ${this.trace.targetY})`,
      goalStatus: this.trace.status,
      planSteps: this.metrics.plansGenerated > 0 ? 5 : 0,
      currentStep: this.metrics.successfulCommands,
      lastDecision: this.extractLastDecision(),
      lastCommand: this.extractLastCommand(),
      progress,
      goalCandidates,
      goalLifecycles,
      lastGoalAdaptation,
      gatheringProgress,
    });

    this.dashboard.updateState({ mission: missionState });
  }

  /**
   * Update world state panel.
   */
  private updateWorldState(): void {
    if (!this.metrics) return;

    const worldState: DashboardWorldState = Object.freeze({
      friendlyUnits: 1,
      enemyUnits: 0,
      resources: 'movement-points',
      currentMap: 'fake-world',
      lastObservationMs: Date.now(),
    });

    this.dashboard.updateState({ world: worldState });
  }

  /**
   * Update timeline panel - only add events that haven't been added yet
   */
  private updateTimelineState(): void {
    if (!this.trace) return;

    const events = this.trace.events || [];
    const currentCount = events.length;

    // Only add events we haven't processed yet
    if (currentCount > this.lastProcessedEventCount) {
      // Add only new events (skip tick 0 initialization events and verbose plan events)
      for (let i = this.lastProcessedEventCount; i < currentCount; i++) {
        const traceEvent = events[i];
        if (!traceEvent || traceEvent.tick === 0) continue;

        // Skip verbose plan events - only show plan_generated and plan_error
        if (traceEvent.eventType === 'plan_invalidated' || traceEvent.eventType === 'plan_reused' || traceEvent.eventType === 'plan_empty') {
          continue;
        }

        const event: DashboardTimelineEvent = Object.freeze({
          tick: traceEvent.tick,
          timestamp: Date.now(),
          type: traceEvent.eventType,
          detail: this.formatEventDetail(traceEvent),
        });

        this.dashboard.addTimelineEvent(event);
      }

      this.lastProcessedEventCount = currentCount;
    }
  }

  /**
   * Extract last decision from trace.
   */
  private extractLastDecision(): string {
    if (!this.trace || !this.trace.events) return 'none';

    const decisions = this.trace.events.filter(
      (e) => e.eventType === 'decision_selected' || e.eventType === 'decision_engine_invoked'
    );
    if (decisions.length === 0) return 'none';

    const lastDecision = decisions[decisions.length - 1];
    if (!lastDecision) return 'none';
    return (lastDecision.data as any)?.command?.action || 'move';
  }

  /**
   * Extract last command from trace.
   */
  private extractLastCommand(): string {
    if (!this.trace || !this.trace.events) return 'none';

    const commands = this.trace.events.filter(
      (e) => e.eventType === 'command_executed' || e.eventType === 'command_failed'
    );
    if (commands.length === 0) return 'none';

    const lastCommand = commands[commands.length - 1];
    if (!lastCommand) return 'none';
    return (lastCommand.data as any)?.action || 'move';
  }

  /**
   * Extract goal progress from last progress update event.
   */
  private extractProgress(): DashboardMissionState['progress'] {
    if (!this.trace || !this.trace.events) return undefined;

    // Find the last goal_progress_updated event
    const progressEvents = this.trace.events.filter(
      (e) => e.eventType === 'goal_progress_updated'
    );
    if (progressEvents.length === 0) return undefined;

    const lastProgress = progressEvents[progressEvents.length - 1];
    if (!lastProgress) return undefined;

    const data = lastProgress.data as any;
    const measurements = progressEvents.slice(-5).map((e) => ({
      tick: e.tick,
      percent: (e.data as any)?.progressPercent || 0,
    }));

    return Object.freeze({
      percent: data?.progressPercent || 0,
      trend: data?.trend || 'stable',
      reason: data?.progressReason || 'Unknown',
      evidence: data?.evidence || {},
      measurements,
    });
  }

  private extractGoalCandidates(): DashboardMissionState['goalCandidates'] {
    if (!this.trace || !this.trace.events) return undefined;

    // Find the last goal_candidates_evaluated event
    const candidatesEvents = this.trace.events.filter(
      (e) => e.eventType === 'goal_candidates_evaluated'
    );
    if (candidatesEvents.length === 0) return undefined;

    const lastCandidatesEvent = candidatesEvents[candidatesEvents.length - 1];
    if (!lastCandidatesEvent) return undefined;

    // Find the goal_selected event at the same tick to mark which was selected
    const selectedEvent = this.trace.events.find(
      (e) => e.eventType === 'goal_selected' && e.tick === lastCandidatesEvent.tick
    );
    const selectedGoalId = selectedEvent?.data?.goalId;

    const evaluations = (lastCandidatesEvent.data as any)?.evaluations || [];
    return Object.freeze(
      evaluations.map((evaluation: any) => ({
        goalId: evaluation.goalId,
        intent: evaluation.goalIntent,
        score: evaluation.score,
        priorityFactor: evaluation.priorityFactor,
        statusFactor: evaluation.statusFactor,
        urgencyFactor: evaluation.urgencyFactor,
        feasibilityFactor: evaluation.feasibilityFactor,
        reasoning: evaluation.reasoning,
        isSelected: evaluation.goalId === selectedGoalId,
      }))
    );
  }

  private extractGoalLifecycles(): DashboardMissionState['goalLifecycles'] {
    if (!this.trace || !this.trace.events) return undefined;

    // Find all unique goals created
    const goalIds = new Set<string>();
    this.trace.events.forEach(e => {
      if (e.eventType === 'goal_created') {
        goalIds.add((e.data as any)?.goalId);
      }
    });

    if (goalIds.size === 0) return undefined;

    // Get lifecycle state for each goal
    const lifecycles: any[] = [];

    goalIds.forEach(goalId => {
      // Find creation event
      const creationEvent = this.trace!.events.find(
        e => e.eventType === 'goal_created' && (e.data as any)?.goalId === goalId
      );
      if (!creationEvent) return;

      const goalIntent = (creationEvent.data as any)?.goalIntent || 'unknown';
      const createdAtTick = creationEvent.tick;

      // Find all transitions
      const transitions = this.trace!.events
        .filter(
          e =>
            e.eventType === 'goal_lifecycle_transitioned' &&
            (e.data as any)?.goalId === goalId
        )
        .map(e => ({
          tick: e.tick,
          from: (e.data as any)?.fromState || '',
          to: (e.data as any)?.toState || '',
        }));

      // Derive current lifecycle state
      let lifecycleState = 'Queued'; // Initial state
      if (transitions.length > 0) {
        lifecycleState = transitions[transitions.length - 1].to;
      }

      // Check for explicit completion
      const completedEvent = this.trace!.events.find(
        e => e.eventType === 'goal_completed' && (e.data as any)?.goalId === goalId
      );
      if (completedEvent) {
        lifecycleState = 'Completed';
      }

      lifecycles.push({
        goalId,
        intent: goalIntent,
        lifecycleState,
        createdAtTick,
        transitions,
      });
    });

    return lifecycles.length > 0 ? Object.freeze(lifecycles) : undefined;
  }

  private extractLastGoalAdaptation(): DashboardMissionState['lastGoalAdaptation'] {
    if (!this.trace || !this.trace.events) return undefined;

    // Find the last goal_adapted event
    const adaptedEvents = this.trace.events.filter(e => e.eventType === 'goal_adapted');
    if (adaptedEvents.length === 0) return undefined;

    const lastEvent = adaptedEvents[adaptedEvents.length - 1];
    if (!lastEvent) return undefined;

    const data = lastEvent.data as any;
    const scoreImprovement = data.newScore - data.previousScore;

    return {
      tick: lastEvent.tick,
      from: data.previousGoalIntent,
      to: data.newGoalIntent,
      worldStateChange: data.worldStateChange,
      scoreImprovement,
      reasoning: data.reasoning,
    };
  }

  private extractGatheringProgress(): DashboardMissionState['gatheringProgress'] {
    if (!this.trace || !this.trace.events) return undefined;

    // Find the most recent gathering-related events
    const detectedEvents = this.trace.events.filter(e => e.eventType === 'resource_field_detected');
    const selectedEvents = this.trace.events.filter(e => e.eventType === 'resource_field_selected');
    const startedEvents = this.trace.events.filter(e => e.eventType === 'gathering_started');
    const progressEvents = this.trace.events.filter(e => e.eventType === 'gathering_progress_updated');
    const completedEvents = this.trace.events.filter(e => e.eventType === 'gathering_completed');

    // If no gathering events, no active gathering
    if (selectedEvents.length === 0) return undefined;

    const lastSelected = selectedEvents[selectedEvents.length - 1];
    if (!lastSelected) return undefined;

    const selectedData = lastSelected.data as any;
    const lastProgress = progressEvents.length > 0 ? progressEvents[progressEvents.length - 1] : null;
    const lastStarted = startedEvents.length > 0 ? startedEvents[startedEvents.length - 1] : null;
    const lastDetected = detectedEvents.length > 0 ? detectedEvents[detectedEvents.length - 1] : null;

    if (!lastProgress && !lastStarted) return undefined;

    const progressData = lastProgress ? (lastProgress.data as any) : null;
    const startedData = lastStarted ? (lastStarted.data as any) : null;
    const detectedData = lastDetected ? (lastDetected.data as any) : null;

    const amountCollected = progressData?.amountCollected || 0;
    const amountRemaining = progressData?.amountRemaining || selectedData.targetAmount || 0;
    const percentComplete = progressData?.percentComplete || 0;
    const targetAmount = startedData?.targetAmount || selectedData.targetAmount || amountCollected + amountRemaining;
    const status = progressData?.status || 'traveling';

    // Calculate gathering rate (units per tick)
    const ticksElapsed = (lastProgress?.tick || lastStarted?.tick || 0) - (lastDetected?.tick || 0);
    const gatheringRate = ticksElapsed > 0 ? amountCollected / ticksElapsed : 0;

    // Estimate completion tick
    const ticksRemaining = gatheringRate > 0 ? Math.ceil(amountRemaining / gatheringRate) : 100;
    const estimatedCompletionTick = (lastProgress?.tick || lastStarted?.tick || 0) + ticksRemaining;

    return {
      fieldId: String(selectedData.fieldId),
      resourceType: String(selectedData.resourceType),
      targetAmount: Number(targetAmount),
      amountCollected: Number(amountCollected),
      amountRemaining: Number(amountRemaining),
      percentComplete: Number(percentComplete),
      status: status as 'traveling' | 'gathering' | 'returning' | 'complete',
      gatheringRate: Number(gatheringRate),
      estimatedCompletionTick: percentComplete < 100 ? estimatedCompletionTick : undefined,
      detectedAtTick: Number(lastDetected?.tick || 0),
      selectedAtTick: Number(lastSelected.tick),
      startedAtTick: Number(lastStarted?.tick || 0),
    };
  }

  /**
   * Format event detail for display.
   */
  private formatEventDetail(event: TraceEvent): string {
    const type = event.eventType;
    const data = event.data || {};

    switch (type) {
      case 'mission_tick':
        return `Executing tick ${data.tick}`;
      case 'decision_selected':
        return `Decision: ${(data as any)?.action || 'unknown'} action`;
      case 'command_executed':
        return `Executed: ${(data as any)?.action || 'command'}`;
      case 'plan_generated':
        return `Plan generated with ${(data as any)?.steps || 0} steps`;
      case 'mission_completed':
        return 'Mission completed successfully';
      case 'mission_failed':
        return 'Mission failed';
      case 'resource_field_detected':
        return `Detected: ${(data as any)?.fieldId || 'unknown'} (${(data as any)?.amount || 0} ${(data as any)?.resourceType || 'resource'})`;
      case 'resource_field_selected':
        return `Selected: ${(data as any)?.fieldId || 'unknown'} (score: ${((data as any)?.score || 0).toFixed(2)})`;
      case 'gathering_started':
        return `Started: ${(data as any)?.fieldId || 'unknown'} (target: ${(data as any)?.targetAmount || 0})`;
      case 'gathering_progress_updated':
        return `Progress: ${(data as any)?.amountCollected || 0}/${(data as any)?.amountCollected + (data as any)?.amountRemaining || 0} (${(data as any)?.percentComplete || 0}%)`;
      case 'gathering_completed':
        return `Completed: collected ${(data as any)?.totalCollected || 0} ${(data as any)?.resourceType || 'resources'}`;
      case 'goal_candidates_evaluated':
        return `Evaluated ${((data as any)?.evaluations || []).length} goal candidates`;
      case 'goal_selected':
        return `Selected: ${(data as any)?.goalIntent || 'goal'}`;
      case 'goal_lifecycle_transitioned':
        return `${(data as any)?.goalIntent || 'Goal'}: ${(data as any)?.fromState || '?'} → ${(data as any)?.toState || '?'}`;
      case 'goal_adapted':
        return `Adapted: ${(data as any)?.previousGoalIntent || '?'} → ${(data as any)?.newGoalIntent || '?'}`;
      case 'goal_progress_updated':
        return `Progress: ${(data as any)?.progressPercent || 0}% (${(data as any)?.trend || 'stable'})`;
      case 'worker_movement_started':
        return `Movement: traveling to ${(data as any)?.fieldId || 'field'} (${(data as any)?.distance || 0} units)`;
      case 'worker_position_updated':
        return `Position: (${(data as any)?.currentPosition?.x || 0},${(data as any)?.currentPosition?.y || 0}) → distance ${(data as any)?.distanceRemaining || 0}`;
      case 'worker_arrival_detected':
        return `Arrived: at ${(data as any)?.fieldId || 'field'} after ${(data as any)?.ticksToArrive || 0} ticks`;
      case 'worker_gathering_begun':
        return `Gathering: ${(data as any)?.resourceType || 'resource'} (target: ${(data as any)?.targetAmount || 0})`;
      case 'worker_return_started':
        return `Return: ${(data as any)?.amountCollected || 0} ${(data as any)?.resourceType || 'resource'} to base`;
      case 'worker_return_progress':
        return `Return: ${(data as any)?.percentComplete || 0}% - distance: ${(data as any)?.distanceRemaining || 0}`;
      case 'worker_return_complete':
        return `Arrived at base with ${(data as any)?.resourcesReturned || 0} resources`;
      case 'resources_deposited':
        return `Deposited: ${(data as any)?.amount || 0} resources`;
      case 'production_started':
        return `Production: ${(data as any)?.unitType || 'unit'} (cost: ${(data as any)?.cost || 0})`;
      case 'production_progress_updated':
        return `Production: ${(data as any)?.percentComplete || 0}% of ${(data as any)?.unitType || 'unit'}`;
      case 'production_completed':
        return `Production: ${(data as any)?.unitType || 'unit'} complete`;
      case 'unit_spawned':
        return `Spawned: ${(data as any)?.unitType || 'unit'} at (${(data as any)?.position?.x || 0},${(data as any)?.position?.y || 0})`;
      case 'worker_assigned':
        return `Assigned: ${(data as any)?.workerId || 'worker'} to ${(data as any)?.resourceType || 'resource'}`;
      case 'worker_reassigned':
        return `Reassigned: ${(data as any)?.workerId || 'worker'} to ${(data as any)?.newFieldId || 'field'} (${(data as any)?.reason || 'rebalance'})`;
      case 'plan_generated':
        return `Plan generated with ${(data as any)?.stepCount || 0} steps`;
      case 'plan_invalidated':
        return `Plan invalidated: ${(data as any)?.reason || 'unknown reason'}`;
      case 'plan_reused':
        return `Plan reused with ${(data as any)?.stepCount || 0} steps`;
      case 'plan_empty':
        return 'Plan is empty';
      case 'plan_error':
        return `Plan error: ${(data as any)?.error || 'unknown'}`;
      default:
        return `${type}: event`;

    }
  }
}

/**
 * Map runtime status to dashboard status.
 */
function mapRuntimeStatus(status: string): 'initializing' | 'running' | 'paused' | 'stopped' | 'completed' {
  if (status.toLowerCase().includes('idle')) return 'running';
  if (status.toLowerCase().includes('paused')) return 'paused';
  if (status.toLowerCase().includes('stopped')) return 'stopped';
  if (status.toLowerCase().includes('completed')) return 'completed';
  return 'running';
}
