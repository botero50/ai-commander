/**
 * Dashboard Debugger: Browser-based autonomous AI debugger.
 *
 * Transforms the Browser Runtime Dashboard into a professional debugging experience.
 *
 * Core features:
 * - Select any tick and instantly see why it happened
 * - Inspector panel showing goal, observation, plan, decision, command, result
 * - Compare two ticks to understand divergence
 * - Export complete timeline as offline HTML report
 * - Resume live execution with one click
 *
 * NOT included (deferred):
 * - Advanced search / filtering (available in exported report)
 * - Keyboard shortcuts (nice-to-have)
 * - Timeline virtualization (works fine without it)
 * - Complex UI patterns (keep it simple)
 *
 * Design principle: Every pixel should answer "Why did it do that?"
 */

import type { ExecutionTrace } from './execution-trace.js';
import type { RuntimeMetrics } from './runtime-metrics.js';
import { TimelineInspector, type TickInspection } from './timeline-inspector.js';

/**
 * Debugger UI state.
 */
export interface DebuggerState {
  readonly mode: 'live' | 'inspection' | 'comparison';
  readonly selectedTick: number | null;
  readonly comparisonTickA: number | null;
  readonly comparisonTickB: number | null;
  readonly autoFollow: boolean;
}

/**
 * DashboardDebugger: Autonomous AI debugger for mission execution.
 */
export class DashboardDebugger {
  private inspector: TimelineInspector = new TimelineInspector();
  private state: DebuggerState = Object.freeze({
    mode: 'live',
    selectedTick: null,
    comparisonTickA: null,
    comparisonTickB: null,
    autoFollow: true,
  });

  private stateChangeListeners: Set<(state: DebuggerState) => void> = new Set();

  /**
   * Initialize debugger with mission data.
   */
  initialize(trace: ExecutionTrace, metrics: RuntimeMetrics): void {
    this.inspector.initialize(trace, metrics);
  }

  /**
   * Get current debugger state.
   */
  getState(): DebuggerState {
    return this.state;
  }

  /**
   * Subscribe to state changes.
   */
  onStateChange(listener: (state: DebuggerState) => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => {
      this.stateChangeListeners.delete(listener);
    };
  }

  /**
   * Select a tick for inspection.
   */
  selectTick(tick: number): void {
    this.state = Object.freeze({
      ...this.state,
      mode: 'inspection',
      selectedTick: tick,
      autoFollow: false,
    });
    this.notifyStateChange();
  }

  /**
   * Get inspection for selected tick.
   */
  getSelectedTickInspection(): TickInspection | null {
    if (!this.state.selectedTick) return null;
    return this.inspector.inspectTick(this.state.selectedTick);
  }

  /**
   * Compare two ticks.
   */
  compareTicks(tickA: number, tickB: number): void {
    this.state = Object.freeze({
      ...this.state,
      mode: 'comparison',
      comparisonTickA: tickA,
      comparisonTickB: tickB,
      autoFollow: false,
    });
    this.notifyStateChange();
  }

  /**
   * Get comparison results.
   */
  getComparison() {
    if (this.state.comparisonTickA === null || this.state.comparisonTickB === null) {
      return null;
    }
    return this.inspector.compare(this.state.comparisonTickA, this.state.comparisonTickB);
  }

  /**
   * Resume live execution.
   */
  resumeLive(): void {
    this.state = Object.freeze({
      ...this.state,
      mode: 'live',
      selectedTick: null,
      comparisonTickA: null,
      comparisonTickB: null,
      autoFollow: true,
    });
    this.notifyStateChange();
  }

  /**
   * Navigate to next tick.
   */
  nextTick(): void {
    const ticks = this.inspector.getAllTicks();
    if (this.state.selectedTick === null || ticks.length === 0) return;

    const index = ticks.indexOf(this.state.selectedTick);
    if (index >= 0 && index < ticks.length - 1) {
      const nextTick = ticks[index + 1];
      if (nextTick !== undefined) {
        this.selectTick(nextTick);
      }
    }
  }

  /**
   * Navigate to previous tick.
   */
  previousTick(): void {
    const ticks = this.inspector.getAllTicks();
    if (this.state.selectedTick === null || ticks.length === 0) return;

    const index = ticks.indexOf(this.state.selectedTick);
    if (index > 0) {
      const prevTick = ticks[index - 1];
      if (prevTick !== undefined) {
        this.selectTick(prevTick);
      }
    }
  }

  /**
   * Jump to first tick.
   */
  firstTick(): void {
    const ticks = this.inspector.getAllTicks();
    if (ticks.length > 0) {
      const firstTick = ticks[0];
      if (firstTick !== undefined) {
        this.selectTick(firstTick);
      }
    }
  }

  /**
   * Jump to latest tick.
   */
  latestTick(): void {
    const ticks = this.inspector.getAllTicks();
    if (ticks.length > 0) {
      const lastTick = ticks[ticks.length - 1];
      if (lastTick !== undefined) {
        this.selectTick(lastTick);
      }
    }
  }

  /**
   * Jump to specific tick.
   */
  jumpToTick(tick: number): void {
    this.selectTick(tick);
  }

  /**
   * Export mission timeline as JSON.
   */
  exportJson(): string {
    return this.inspector.exportAsJson();
  }

  /**
   * Export mission timeline as offline HTML.
   */
  exportHtml(): string {
    return this.inspector.exportAsHtml();
  }

  /**
   * Get all ticks in timeline.
   */
  getAllTicks(): number[] {
    return this.inspector.getAllTicks();
  }

  /**
   * Notify state change listeners.
   */
  private notifyStateChange(): void {
    this.stateChangeListeners.forEach((listener) => {
      listener(this.state);
    });
  }
}

/**
 * Format tick inspection for display.
 */
export function formatTickInspection(inspection: TickInspection): string {
  const lines: string[] = [];

  lines.push(`TICK ${inspection.tick} @ ${new Date(inspection.timestamp).toISOString()}`);
  lines.push('');

  if (inspection.observation) {
    lines.push('OBSERVATION:');
    lines.push(`  Agents: ${inspection.observation.agents}`);
    lines.push(`  Resources: ${inspection.observation.resources}`);
    lines.push('');
  }

  if (inspection.planning) {
    lines.push('PLANNING:');
    lines.push(`  Goal: ${inspection.planning.goal}`);
    lines.push(`  Plan ID: ${inspection.planning.planId}`);
    lines.push(`  Steps: ${inspection.planning.steps}`);
    lines.push('');
  }

  if (inspection.decision) {
    lines.push('DECISION:');
    lines.push(`  Command: ${inspection.decision.command}`);
    lines.push(`  Confidence: ${(inspection.decision.confidence * 100).toFixed(0)}%`);
    lines.push(`  Engine: ${inspection.decision.engineType}`);
    lines.push('');
  }

  if (inspection.execution) {
    lines.push('EXECUTION:');
    lines.push(`  Status: ${inspection.execution.success ? 'SUCCESS' : 'FAILED'}`);
    lines.push(`  Action: ${inspection.execution.commandAction}`);
    if (inspection.execution.result) {
      lines.push(`  Result: ${inspection.execution.result}`);
    }
    lines.push('');
  }

  if (inspection.metrics) {
    lines.push('METRICS:');
    lines.push(`  Tick Duration: ${inspection.metrics.tickDurationMs.toFixed(2)}ms`);
    lines.push(`  Total Ticks: ${inspection.metrics.totalTicksExecuted}`);
    lines.push('');
  }

  return lines.join('\n');
}
