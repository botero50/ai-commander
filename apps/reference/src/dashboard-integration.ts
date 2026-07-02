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

    // Throttle updates to avoid overwhelming the browser
    const now = Date.now();
    if (now - this.lastTickBroadcast < 50) {
      return;
    }
    this.lastTickBroadcast = now;

    this.updateRuntimeState(currentTick);
    this.updateMissionState();
    this.updateWorldState();
    this.updateTimelineState();
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

    const status = mapRuntimeStatus(runtimeStatus);
    const runtimeState: DashboardRuntimeState = Object.freeze({
      status,
      currentTick,
      missionId: this.trace.missionId,
      elapsedMs: this.metrics.missionDurationMs,
      executionMode,
    });

    this.dashboard.updateState({ runtime: runtimeState });
  }

  /**
   * Update mission state panel.
   */
  private updateMissionState(): void {
    if (!this.trace || !this.metrics) return;

    const progress = this.extractProgress();

    const missionState: DashboardMissionState = Object.freeze({
      goalId: 'goal-movement',
      goalIntent: `Move to (${this.trace.targetX}, ${this.trace.targetY})`,
      goalStatus: this.trace.status,
      planSteps: this.metrics.plansGenerated > 0 ? 5 : 0,
      currentStep: this.metrics.successfulCommands,
      lastDecision: this.extractLastDecision(),
      lastCommand: this.extractLastCommand(),
      progress,
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
   * Update timeline panel.
   */
  private updateTimelineState(): void {
    if (!this.trace) return;

    // Get last event from trace
    const events = this.trace.events || [];
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (!lastEvent) return;

      const event: DashboardTimelineEvent = Object.freeze({
        tick: lastEvent.tick,
        timestamp: Date.now(),
        type: lastEvent.eventType,
        detail: this.formatEventDetail(lastEvent),
      });

      this.dashboard.addTimelineEvent(event);
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
      default:
        return JSON.stringify(data).substring(0, 60);
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
