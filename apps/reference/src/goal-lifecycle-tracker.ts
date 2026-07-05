/**
 * Goal Lifecycle Tracker: Reconstructs goal lifecycle from execution trace.
 *
 * Single source of truth: Lifecycle state is derived from trace events.
 * This ensures:
 * - Deterministic reconstruction (same trace = same state always)
 * - Historical accuracy (any tick can be inspected)
 * - No duplicate state (trace is authoritative)
 *
 * Lifecycle states:
 * - Queued: Goal created, waiting to be evaluated
 * - Candidate: Goal is being evaluated against others
 * - Selected: Goal was chosen for execution
 * - Executing: Goal's plan is being executed
 * - Completed: Goal satisfied
 * - Failed: Goal execution failed
 * - Blocked: Goal cannot progress
 * - Cancelled: Goal was abandoned
 */

import type { ExecutionTrace, TraceEvent } from './execution-trace.js';

export interface GoalLifecycleState {
  readonly goalId: string;
  readonly goalIntent: string;
  readonly currentState: 'Queued' | 'Candidate' | 'Selected' | 'Executing' | 'Completed' | 'Failed' | 'Blocked' | 'Cancelled';
  readonly createdAtTick: number;
  readonly transitions: readonly {
    readonly tick: number;
    readonly fromState: string;
    readonly toState: string;
    readonly reason: string;
  }[];
}

export class GoalLifecycleTracker {
  private trace: ExecutionTrace | null = null;

  /**
   * Initialize tracker with trace data.
   */
  initialize(trace: ExecutionTrace): void {
    this.trace = trace;
  }

  /**
   * Get current lifecycle state of a goal at a specific tick.
   * Reconstructs from trace events up to that tick.
   */
  getGoalLifecycleAtTick(goalId: string, tick: number): GoalLifecycleState | null {
    if (!this.trace) return null;

    // Find creation event
    const creationEvent = this.trace.events.find(
      e => e.eventType === 'goal_created' && e.tick <= tick && (e.data as any)?.goalId === goalId
    );
    if (!creationEvent) return null;

    const goalIntent = (creationEvent.data as any)?.goalIntent || 'unknown';
    const createdAtTick = creationEvent.tick;

    // Find all transitions for this goal up to the specified tick
    const transitionEvents = this.trace.events.filter(
      e =>
        e.eventType === 'goal_lifecycle_transitioned' &&
        e.tick <= tick &&
        (e.data as any)?.goalId === goalId
    );

    const transitions = transitionEvents.map(e => ({
      tick: e.tick,
      fromState: (e.data as any)?.fromState || '',
      toState: (e.data as any)?.toState || '',
      reason: (e.data as any)?.reason || '',
    }));

    // Determine current state based on transitions
    let currentState: GoalLifecycleState['currentState'] = 'Queued'; // Initial state

    // Apply transitions to derive current state
    if (transitionEvents.length > 0) {
      const lastTransition = transitionEvents[transitionEvents.length - 1];
      if (lastTransition) {
        currentState = (lastTransition.data as any)?.toState || 'Queued';
      }
    }

    // Also check for explicit completion
    const completedEvent = this.trace.events.find(
      e => e.eventType === 'goal_completed' && e.tick <= tick && (e.data as any)?.goalId === goalId
    );
    if (completedEvent) {
      currentState = 'Completed';
    }

    return {
      goalId,
      goalIntent,
      currentState,
      createdAtTick,
      transitions,
    };
  }

  /**
   * Get lifecycle states for all goals at a specific tick.
   */
  getAllGoalLifecyclesAtTick(tick: number): GoalLifecycleState[] {
    if (!this.trace) return [];

    // Find all unique goals created up to this tick
    const goalIds = new Set<string>();
    this.trace.events.forEach(e => {
      if (e.eventType === 'goal_created' && e.tick <= tick) {
        goalIds.add((e.data as any)?.goalId);
      }
    });

    // Get lifecycle for each goal
    const lifecycles: GoalLifecycleState[] = [];
    goalIds.forEach(goalId => {
      const lifecycle = this.getGoalLifecycleAtTick(goalId, tick);
      if (lifecycle) {
        lifecycles.push(lifecycle);
      }
    });

    return lifecycles;
  }

  /**
   * Get all transitions for a specific goal.
   */
  getGoalTransitions(goalId: string): Array<{
    readonly tick: number;
    readonly from: string;
    readonly to: string;
    readonly reason: string;
  }> {
    if (!this.trace) return [];

    return this.trace.events
      .filter(
        e =>
          e.eventType === 'goal_lifecycle_transitioned' &&
          (e.data as any)?.goalId === goalId
      )
      .map(e => ({
        tick: e.tick,
        from: (e.data as any)?.fromState || '',
        to: (e.data as any)?.toState || '',
        reason: (e.data as any)?.reason || '',
      }));
  }

  /**
   * Check if a goal was ever in a specific state.
   */
  goalWasInState(goalId: string, state: string): boolean {
    if (!this.trace) return false;

    // Check initial state (Queued)
    if (state === 'Queued') {
      const creationEvent = this.trace.events.find(
        e => e.eventType === 'goal_created' && (e.data as any)?.goalId === goalId
      );
      if (creationEvent) return true;
    }

    // Check transitions
    return this.trace.events.some(
      e =>
        e.eventType === 'goal_lifecycle_transitioned' &&
        (e.data as any)?.goalId === goalId &&
        ((e.data as any)?.fromState === state || (e.data as any)?.toState === state)
    );
  }

  /**
   * Get the tick when a goal entered a specific state.
   */
  getTickWhenGoalEnteredState(goalId: string, state: string): number | null {
    if (!this.trace) return null;

    // Check if it's the initial state
    if (state === 'Queued') {
      const creationEvent = this.trace.events.find(
        e => e.eventType === 'goal_created' && (e.data as any)?.goalId === goalId
      );
      if (creationEvent) return creationEvent.tick;
    }

    // Check transitions
    const transitionEvent = this.trace.events.find(
      e =>
        e.eventType === 'goal_lifecycle_transitioned' &&
        (e.data as any)?.goalId === goalId &&
        (e.data as any)?.toState === state
    );

    return transitionEvent?.tick || null;
  }
}
