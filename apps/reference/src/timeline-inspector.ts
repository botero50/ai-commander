/**
 * Timeline Inspector: Interactive tick-by-tick mission analysis.
 *
 * Provides detailed inspection of every tick in mission execution.
 * Reuses ExecutionTrace data from Story 085 (no duplication).
 * Enables "Why did it do that?" debugging without logs.
 *
 * Features:
 * - Click any tick to see full details
 * - View observation, goal, plan, decision, command, result
 * - Navigation (previous, next, first, latest, jump)
 * - Search by tick/goal/planner/decision/command
 * - Filter by event type
 * - Compare two ticks side-by-side
 * - Export as JSON or standalone HTML
 */

import type { ExecutionTrace, TraceEvent } from './execution-trace.js';
import type { RuntimeMetrics } from './runtime-metrics.js';

/**
 * Detailed information about a single tick.
 */
export interface TickInspection {
  readonly tick: number;
  readonly timestamp: number;

  // Observation phase
  readonly observation?: {
    readonly agents: number;
    readonly resources: string;
  } | null;

  // Planning phase
  readonly planning?: {
    readonly goal: string;
    readonly planId: string;
    readonly steps: number;
  } | null;

  // Decision phase
  readonly decision?: {
    readonly engineType: string;
    readonly confidence: number;
    readonly command: string;
  } | null;

  // Execution phase
  readonly execution?: {
    readonly commandAction: string;
    readonly success: boolean;
    readonly result?: string;
  } | null;

  // World state changes
  readonly worldDelta?: {
    readonly agentsChanged: number;
    readonly resourcesChanged: string;
  } | null;

  // Runtime metrics
  readonly metrics?: {
    readonly tickDurationMs: number;
    readonly totalTicksExecuted: number;
  } | null;

  // Goal progress (reconstructed from trace events)
  readonly progress?: {
    readonly percent: number;
    readonly trend: 'improving' | 'stable' | 'regressing';
    readonly reason: string;
    readonly evidence: Record<string, unknown>;
  } | null;

  // Goal candidates (reconstructed from trace events)
  readonly goalCandidates?: readonly {
    readonly goalId: string;
    readonly intent: string;
    readonly score: number;
    readonly statusFactor: number;
    readonly priorityFactor: number;
    readonly urgencyFactor: number;
    readonly feasibilityFactor: number;
    readonly reasoning: string;
    readonly isSelected: boolean;
  }[] | null;

  // Goal lifecycles at this tick (reconstructed from trace events)
  readonly goalLifecycles?: readonly {
    readonly goalId: string;
    readonly intent: string;
    readonly lifecycleState: string;
    readonly createdAtTick: number;
    readonly transitions: readonly {
      readonly tick: number;
      readonly from: string;
      readonly to: string;
    }[];
  }[] | null;

  // Goal adaptation at this tick (if one occurred)
  readonly goalAdaptation?: {
    readonly previousGoalIntent: string;
    readonly newGoalIntent: string;
    readonly worldStateChange: string;
    readonly previousScore: number;
    readonly newScore: number;
    readonly reasoning: string;
  } | null;

  // Resource gathering state (reconstructed from trace events)
  readonly gatheringProgress?: {
    readonly fieldId: string;
    readonly resourceType: string;
    readonly targetAmount: number;
    readonly amountCollected: number;
    readonly amountRemaining: number;
    readonly percentComplete: number;
    readonly status: 'traveling' | 'gathering' | 'returning' | 'complete';
    readonly gatheringRate: number;
    readonly estimatedCompletionTick: number | undefined;
    readonly detectedAtTick: number;
    readonly selectedAtTick: number;
    readonly startedAtTick: number;
  } | null;

  // All events for this tick
  readonly events: readonly TraceEvent[];
}

/**
 * Timeline search results.
 */
export interface TimelineSearchResult {
  readonly tick: number;
  readonly matches: readonly string[];
}

/**
 * Timeline filter options.
 */
export interface TimelineFilter {
  readonly types?: readonly string[];
  readonly fromTick?: number;
  readonly toTick?: number;
}

/**
 * Timeline comparison between two ticks.
 */
export interface TimelineComparison {
  readonly tickA: number;
  readonly tickB: number;
  readonly observationDiff: {
    readonly changed: boolean;
    readonly details: string;
  };
  readonly goalDiff: {
    readonly changed: boolean;
    readonly details: string;
  };
  readonly decisionDiff: {
    readonly changed: boolean;
    readonly details: string;
  };
  readonly commandDiff: {
    readonly changed: boolean;
    readonly details: string;
  };
  readonly worldDiff: {
    readonly changed: boolean;
    readonly details: string;
  };
}

/**
 * TimelineInspector: Analyze mission execution tick-by-tick.
 */
export class TimelineInspector {
  private trace: ExecutionTrace | null = null;
  private metrics: RuntimeMetrics | null = null;
  private cache: Map<number, TickInspection> = new Map();

  /**
   * Initialize inspector with trace data.
   */
  initialize(trace: ExecutionTrace, metrics: RuntimeMetrics): void {
    this.trace = trace;
    this.metrics = metrics;
    this.cache.clear();
  }

  /**
   * Get detailed inspection for a specific tick.
   */
  inspectTick(tick: number): TickInspection | null {
    if (!this.trace) return null;

    // Check cache
    if (this.cache.has(tick)) {
      return this.cache.get(tick) || null;
    }

    // Find events for this tick
    const events = this.trace.events.filter((e) => e.tick === tick);
    if (events.length === 0) return null;

    // Extract data from events
    const inspectionData: TickInspection = Object.freeze({
      tick,
      timestamp: events[0]?.timestamp || Date.now(),
      observation: this.extractObservation(events) as any,
      planning: this.extractPlanning(events) as any,
      decision: this.extractDecision(events) as any,
      execution: this.extractExecution(events) as any,
      worldDelta: this.extractWorldDelta(events) as any,
      metrics: this.extractMetrics(tick) as any,
      progress: this.extractProgress(events) as any,
      goalCandidates: this.extractGoalCandidates(events) as any,
      goalLifecycles: this.extractGoalLifecycles(events, tick) as any,
      goalAdaptation: this.extractGoalAdaptation(events) as any,
      gatheringProgress: this.extractGatheringProgress(tick) as any,
      events,
    });

    const inspection = inspectionData;

    this.cache.set(tick, inspection);
    return inspection;
  }

  /**
   * Search timeline by query.
   */
  search(query: string): TimelineSearchResult[] {
    if (!this.trace) return [];

    const results: TimelineSearchResult[] = [];
    const ticks = new Set<number>();

    // Search in events
    this.trace.events.forEach((event) => {
      if (
        event.eventType.includes(query) ||
        JSON.stringify(event.data).toLowerCase().includes(query.toLowerCase())
      ) {
        ticks.add(event.tick);
      }
    });

    // Convert to results
    Array.from(ticks)
      .sort((a, b) => a - b)
      .forEach((tick) => {
        results.push({
          tick,
          matches: [query],
        });
      });

    return results;
  }

  /**
   * Filter timeline by type.
   */
  filter(filter: TimelineFilter): number[] {
    if (!this.trace) return [];

    const ticks = new Set<number>();

    this.trace.events.forEach((event) => {
      // Check type filter
      if (filter.types && !filter.types.includes(event.eventType)) {
        return;
      }

      // Check tick range
      if (filter.fromTick !== undefined && event.tick < filter.fromTick) {
        return;
      }
      if (filter.toTick !== undefined && event.tick > filter.toTick) {
        return;
      }

      ticks.add(event.tick);
    });

    return Array.from(ticks).sort((a, b) => a - b);
  }

  /**
   * Compare two timeline entries.
   */
  compare(tickA: number, tickB: number): TimelineComparison {
    const inspectionA = this.inspectTick(tickA);
    const inspectionB = this.inspectTick(tickB);

    if (!inspectionA || !inspectionB) {
      return {
        tickA,
        tickB,
        observationDiff: { changed: false, details: 'Missing data' },
        goalDiff: { changed: false, details: 'Missing data' },
        decisionDiff: { changed: false, details: 'Missing data' },
        commandDiff: { changed: false, details: 'Missing data' },
        worldDiff: { changed: false, details: 'Missing data' },
      };
    }

    return Object.freeze({
      tickA,
      tickB,
      observationDiff: this.compareObservations(inspectionA, inspectionB),
      goalDiff: this.compareGoals(inspectionA, inspectionB),
      decisionDiff: this.compareDecisions(inspectionA, inspectionB),
      commandDiff: this.compareCommands(inspectionA, inspectionB),
      worldDiff: this.compareWorlds(inspectionA, inspectionB),
    });
  }

  /**
   * Get all tick numbers in trace.
   */
  getAllTicks(): number[] {
    if (!this.trace) return [];

    const ticks = new Set(this.trace.events.map((e) => e.tick));
    return Array.from(ticks).sort((a, b) => a - b) as number[];
  }

  /**
   * Export timeline as JSON.
   */
  exportAsJson(): string {
    if (!this.trace) return '{}';

    const ticks = this.getAllTicks();
    const timeline = ticks.map((tick) => this.inspectTick(tick));

    return JSON.stringify(
      {
        missionId: this.trace.missionId,
        targetX: this.trace.targetX,
        targetY: this.trace.targetY,
        status: this.trace.status,
        totalTicks: ticks.length,
        ticks: timeline,
      },
      null,
      2
    );
  }

  /**
   * Export timeline as standalone HTML.
   */
  exportAsHtml(): string {
    if (!this.trace) return '<html><body>No trace data</body></html>';

    const ticks = this.getAllTicks();
    const timeline = ticks.map((tick) => this.inspectTick(tick));

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Commander Timeline: ${this.trace.missionId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 10px; }
    .info { color: #666; margin-bottom: 30px; }
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .tick {
      background: white;
      border-left: 4px solid #0ea5e9;
      padding: 20px;
      border-radius: 4px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .tick-number {
      font-weight: bold;
      color: #0ea5e9;
      font-size: 18px;
      margin-bottom: 10px;
    }
    .tick-section {
      margin: 15px 0;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 4px;
    }
    .tick-section-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    .tick-section-value {
      color: #666;
      font-family: monospace;
      font-size: 13px;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>AI Commander Timeline: ${this.trace.missionId}</h1>
    <div class="info">
      <p><strong>Status:</strong> ${this.trace.status}</p>
      <p><strong>Target:</strong> (${this.trace.targetX}, ${this.trace.targetY})</p>
      <p><strong>Total Ticks:</strong> ${ticks.length}</p>
      <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="timeline">
      ${timeline
        .filter(Boolean)
        .map(
          (tick) => `
        <div class="tick">
          <div class="tick-number">Tick ${tick!.tick}</div>

          ${tick!.planning ? `
          <div class="tick-section">
            <div class="tick-section-title">Planning</div>
            <div class="tick-section-value">
              Goal: ${tick!.planning.goal}<br>
              Plan ID: ${tick!.planning.planId}<br>
              Steps: ${tick!.planning.steps}
            </div>
          </div>
          ` : ''}

          ${tick!.decision ? `
          <div class="tick-section">
            <div class="tick-section-title">Decision</div>
            <div class="tick-section-value">
              Command: ${tick!.decision.command}<br>
              Confidence: ${(tick!.decision.confidence * 100).toFixed(0)}%
            </div>
          </div>
          ` : ''}

          ${tick!.execution ? `
          <div class="tick-section">
            <div class="tick-section-title">Execution</div>
            <div class="tick-section-value">
              Status: ${tick!.execution.success ? '✓ Success' : '✗ Failed'}<br>
              Result: ${tick!.execution.result || 'N/A'}
            </div>
          </div>
          ` : ''}
        </div>
      `
        )
        .join('')}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Extract observation from events.
   */
  private extractObservation(
    events: TraceEvent[]
  ): TickInspection['observation'] {
    const obs = events.find((e) => e.eventType === 'world_state_updated');
    if (!obs) return undefined;

    return {
      agents: (obs.data as any)?.agents || 0,
      resources: (obs.data as any)?.resources || 'unknown',
    };
  }

  /**
   * Extract planning from events.
   */
  private extractPlanning(events: TraceEvent[]): TickInspection['planning'] {
    const plan = events.find((e) => e.eventType === 'plan_generated');
    if (!plan) return undefined;

    return {
      goal: (plan.data as any)?.goal || 'unknown',
      planId: (plan.data as any)?.planId || 'unknown',
      steps: (plan.data as any)?.steps || 0,
    };
  }

  /**
   * Extract decision from events.
   */
  private extractDecision(events: TraceEvent[]): TickInspection['decision'] {
    const decision = events.find((e) => e.eventType === 'decision_selected');
    if (!decision) return undefined;

    return {
      engineType: (decision.data as any)?.engineType || 'unknown',
      confidence: (decision.data as any)?.confidence || 0,
      command: (decision.data as any)?.command?.action || 'unknown',
    };
  }

  /**
   * Extract execution from events.
   */
  private extractExecution(events: TraceEvent[]): TickInspection['execution'] {
    const executed = events.find((e) => e.eventType === 'command_executed');
    const failed = events.find((e) => e.eventType === 'command_failed');

    if (!executed && !failed) return undefined;

    const event = executed || failed;
    return {
      commandAction: (event!.data as any)?.action || 'unknown',
      success: !!executed,
      result: (event!.data as any)?.result || undefined,
    };
  }

  /**
   * Extract world delta from events.
   */
  private extractWorldDelta(
    events: TraceEvent[]
  ): TickInspection['worldDelta'] {
    const updates = events.filter((e) => e.eventType === 'world_state_updated');
    if (updates.length === 0) return undefined;

    return {
      agentsChanged: updates.length,
      resourcesChanged: (updates[0]?.data as any)?.resources || 'unknown',
    };
  }

  /**
   * Extract metrics for a tick.
   */
  private extractMetrics(tick: number): TickInspection['metrics'] {
    if (!this.metrics) return undefined;

    return {
      tickDurationMs: this.metrics.averageTickDurationMs,
      totalTicksExecuted: this.metrics.totalTicks,
    };
  }

  /**
   * Extract goal progress from events.
   */
  private extractProgress(events: TraceEvent[]): TickInspection['progress'] {
    const progressEvent = events.find((e) => e.eventType === 'goal_progress_updated');
    if (!progressEvent) return undefined;

    return {
      percent: (progressEvent.data as any)?.progressPercent || 0,
      trend: (progressEvent.data as any)?.trend || 'stable',
      reason: (progressEvent.data as any)?.progressReason || 'Unknown',
      evidence: (progressEvent.data as any)?.evidence || {},
    };
  }

  private extractGoalCandidates(events: TraceEvent[]): TickInspection['goalCandidates'] {
    const candidatesEvent = events.find((e) => e.eventType === 'goal_candidates_evaluated');
    if (!candidatesEvent) return undefined;

    const evaluations = (candidatesEvent.data as any)?.evaluations || [];
    const selectedGoalId = events.find((e) => e.eventType === 'goal_selected')?.data?.goalId;

    return evaluations.map((evaluation: any) => ({
      goalId: evaluation.goalId,
      intent: evaluation.goalIntent,
      score: evaluation.score,
      statusFactor: evaluation.statusFactor,
      priorityFactor: evaluation.priorityFactor,
      urgencyFactor: evaluation.urgencyFactor,
      feasibilityFactor: evaluation.feasibilityFactor,
      reasoning: evaluation.reasoning,
      isSelected: evaluation.goalId === selectedGoalId,
    }));
  }

  private extractGoalLifecycles(events: TraceEvent[], currentTick: number): TickInspection['goalLifecycles'] {
    if (!this.trace) return undefined;

    // Find all unique goals created up to this tick
    const goalIds = new Set<string>();
    this.trace.events.forEach(e => {
      if (e.eventType === 'goal_created' && e.tick <= currentTick) {
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

      // Find all transitions up to current tick
      const transitions = this.trace!.events
        .filter(
          e =>
            e.eventType === 'goal_lifecycle_transitioned' &&
            e.tick <= currentTick &&
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
        e => e.eventType === 'goal_completed' && e.tick <= currentTick && (e.data as any)?.goalId === goalId
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

    return lifecycles.length > 0 ? lifecycles : undefined;
  }

  private extractGoalAdaptation(events: TraceEvent[]): TickInspection['goalAdaptation'] {
    const adaptationEvent = events.find((e) => e.eventType === 'goal_adapted');
    if (!adaptationEvent) return undefined;

    const data = adaptationEvent.data as any;
    return {
      previousGoalIntent: data.previousGoalIntent,
      newGoalIntent: data.newGoalIntent,
      worldStateChange: data.worldStateChange,
      previousScore: data.previousScore,
      newScore: data.newScore,
      reasoning: data.reasoning,
    };
  }

  /**
   * Compare observations.
   */
  private compareObservations(
    a: TickInspection,
    b: TickInspection
  ): TimelineComparison['observationDiff'] {
    const changed =
      JSON.stringify(a.observation) !== JSON.stringify(b.observation);
    return {
      changed,
      details: changed
        ? `Agents: ${a.observation?.agents} → ${b.observation?.agents}`
        : 'No change',
    };
  }

  /**
   * Compare goals.
   */
  private compareGoals(
    a: TickInspection,
    b: TickInspection
  ): TimelineComparison['goalDiff'] {
    const changed =
      a.planning?.goal !== b.planning?.goal;
    return {
      changed,
      details: changed
        ? `${a.planning?.goal} → ${b.planning?.goal}`
        : 'No change',
    };
  }

  /**
   * Compare decisions.
   */
  private compareDecisions(
    a: TickInspection,
    b: TickInspection
  ): TimelineComparison['decisionDiff'] {
    const changed =
      a.decision?.command !== b.decision?.command;
    return {
      changed,
      details: changed
        ? `${a.decision?.command} → ${b.decision?.command}`
        : 'No change',
    };
  }

  /**
   * Compare commands.
   */
  private compareCommands(
    a: TickInspection,
    b: TickInspection
  ): TimelineComparison['commandDiff'] {
    const changed =
      a.execution?.commandAction !== b.execution?.commandAction;
    return {
      changed,
      details: changed
        ? `${a.execution?.commandAction} → ${b.execution?.commandAction}`
        : 'No change',
    };
  }

  /**
   * Compare worlds.
   */
  private compareWorlds(
    a: TickInspection,
    b: TickInspection
  ): TimelineComparison['worldDiff'] {
    const changed =
      JSON.stringify(a.worldDelta) !== JSON.stringify(b.worldDelta);
    return {
      changed,
      details: changed ? 'World state changed' : 'World state unchanged',
    };
  }

  /**
   * Extract resource gathering progress at any historical tick.
   */
  private extractGatheringProgress(
    tick: number
  ): TickInspection['gatheringProgress'] {
    const allEvents = this.trace.events;

    // Find all gathering-related events up to this tick
    const detectedEvents = allEvents.filter(
      e => e.eventType === 'resource_field_detected' && e.tick <= tick
    );
    const selectedEvents = allEvents.filter(
      e => e.eventType === 'resource_field_selected' && e.tick <= tick
    );
    const startedEvents = allEvents.filter(
      e => e.eventType === 'gathering_started' && e.tick <= tick
    );
    const progressEvents = allEvents.filter(
      e => e.eventType === 'gathering_progress_updated' && e.tick <= tick
    );
    const completedEvents = allEvents.filter(
      e => e.eventType === 'gathering_completed' && e.tick <= tick
    );

    // If no field was selected by this tick, no gathering
    if (selectedEvents.length === 0) return null;

    const lastSelected = selectedEvents[selectedEvents.length - 1];
    if (!lastSelected) return null;

    const selectedData = lastSelected.data as any;
    const lastProgress = progressEvents.length > 0 ? progressEvents[progressEvents.length - 1] : null;
    const lastStarted = startedEvents.length > 0 ? startedEvents[startedEvents.length - 1] : null;
    const lastDetected = detectedEvents.length > 0 ? detectedEvents[detectedEvents.length - 1] : null;

    // If we haven't started gathering yet, no progress
    if (!lastProgress && !lastStarted) return null;

    const progressData = lastProgress ? (lastProgress.data as any) : null;
    const startedData = lastStarted ? (lastStarted.data as any) : null;

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
}
