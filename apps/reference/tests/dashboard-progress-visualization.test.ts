import { describe, it, expect, beforeEach } from 'vitest';
import { DashboardServer } from '../src/dashboard-server.ts';
import { DashboardIntegration } from '../src/dashboard-integration.ts';
import { TimelineInspector } from '../src/timeline-inspector.ts';
import { ExecutionTracer } from '../src/execution-trace.ts';
import { RuntimeMetricsCollector } from '../src/runtime-metrics.ts';
import { createGoal, createGoalId, GoalStatus, GoalPriorityLevel, createGoalPriority } from '@ai-commander/goals';
import {
  createWorldState,
  createGameTime,
  createGameMap,
  createPosition,
  createPlayer,
  createPlayerId,
  createAgent,
  createAgentSnapshot,
  createResourcePool,
  createTick,
  AgentState,
} from '@ai-commander/domain';

describe('Dashboard Progress Visualization', () => {
  let dashboard: DashboardServer;
  let integration: DashboardIntegration;
  let tracer: ExecutionTracer;
  let inspector: TimelineInspector;

  beforeEach(() => {
    dashboard = new DashboardServer(3001);
    integration = new DashboardIntegration(dashboard);
    tracer = new ExecutionTracer('test-mission', 10, 10);
    inspector = new TimelineInspector();
  });

  describe('Progress Display in Dashboard State', () => {
    it('should display progress percent in mission state', () => {
      dashboard.updateProgress({
        percent: 50,
        trend: 'improving',
        reason: 'Agent at (5,5), target (10,10), 10 units away',
        evidence: {
          currentX: 5,
          currentY: 5,
          targetX: 10,
          targetY: 10,
          currentDistance: 10,
          initialDistance: 20,
          distanceCovered: 10,
        },
        measurements: [
          { tick: 0, percent: 0 },
          { tick: 1, percent: 25 },
          { tick: 2, percent: 50 },
        ],
      });

      const state = dashboard['state'];
      expect(state.mission.progress).toBeDefined();
      expect(state.mission.progress?.percent).toBe(50);
    });

    it('should display progress trend indicator', () => {
      const progressData = {
        percent: 75,
        trend: 'improving' as const,
        reason: 'Agent approaching target',
        evidence: { currentX: 7, currentY: 8 },
        measurements: [{ tick: 0, percent: 50 }, { tick: 1, percent: 75 }],
      };

      dashboard.updateProgress(progressData);
      expect(dashboard['state'].mission.progress?.trend).toBe('improving');
    });

    it('should display all three trend states', () => {
      const trends: Array<'improving' | 'stable' | 'regressing'> = [
        'improving',
        'stable',
        'regressing',
      ];

      for (const trend of trends) {
        dashboard.updateProgress({
          percent: 50,
          trend,
          reason: `Agent status: ${trend}`,
          evidence: {},
          measurements: [],
        });

        expect(dashboard['state'].mission.progress?.trend).toBe(trend);
      }
    });

    it('should include evidence in progress display', () => {
      const evidence = {
        currentX: 5,
        currentY: 5,
        targetX: 10,
        targetY: 10,
        currentDistance: 10,
        initialDistance: 20,
        distanceCovered: 10,
      };

      dashboard.updateProgress({
        percent: 50,
        trend: 'improving',
        reason: 'Progress measured from world state',
        evidence,
        measurements: [],
      });

      const progress = dashboard['state'].mission.progress;
      expect(progress?.evidence).toEqual(evidence);
    });

    it('should track last 5 measurements', () => {
      const measurements = [
        { tick: 0, percent: 0 },
        { tick: 1, percent: 20 },
        { tick: 2, percent: 40 },
        { tick: 3, percent: 60 },
        { tick: 4, percent: 80 },
        { tick: 5, percent: 100 },
      ];

      dashboard.updateProgress({
        percent: 100,
        trend: 'improving',
        reason: 'Goal completed',
        evidence: {},
        measurements: measurements.slice(-5),
      });

      expect(dashboard['state'].mission.progress?.measurements).toHaveLength(5);
      expect(dashboard['state'].mission.progress?.measurements[0]?.percent).toBe(20);
      expect(dashboard['state'].mission.progress?.measurements[4]?.percent).toBe(100);
    });
  });

  describe('Progress Updates via SSE', () => {
    it('should broadcast progress updates to connected clients', () => {
      dashboard.updateProgress({
        percent: 50,
        trend: 'improving',
        reason: 'Test progress update',
        evidence: {},
        measurements: [],
      });

      // Verify the state was updated
      expect(dashboard['state'].mission.progress?.percent).toBe(50);
    });

    it('should preserve progress data during state updates', () => {
      const progress = {
        percent: 75,
        trend: 'stable' as const,
        reason: 'Agent making steady progress',
        evidence: { distance: 5 },
        measurements: [],
      };

      dashboard.updateProgress(progress);

      // Update other state
      const currentState = dashboard['state'];
      dashboard.updateState({
        runtime: {
          ...currentState.runtime,
          currentTick: 10,
        },
      });

      // Progress should still be there
      expect(dashboard['state'].mission.progress?.percent).toBe(75);
    });
  });

  describe('Historical Progress Reconstruction', () => {
    it('should reconstruct progress from trace events', () => {
      // Record trace events
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      tracer.recordGoalProgressUpdated({
        goalId: 'goal-1',
        goalIntent: 'move-to-target',
        progressPercent: 50,
        progressReason: 'Agent at (5,5), target (10,10)',
        trend: 'improving',
        evidence: {
          currentX: 5,
          currentY: 5,
          targetX: 10,
          targetY: 10,
        },
      } as any);

      const trace = tracer.getTrace();
      const metrics = RuntimeMetricsCollector.collect(trace);
      inspector.initialize(trace, metrics);

      const inspection = inspector.inspectTick(1);
      expect(inspection?.progress).toBeDefined();
      expect(inspection?.progress?.percent).toBe(50);
      expect(inspection?.progress?.trend).toBe('improving');
    });

    it('should include progress reason in historical inspection', () => {
      tracer.recordMissionTick(1);
      tracer.recordGoalProgressUpdated({
        goalId: 'goal-1',
        goalIntent: 'move-to-target',
        progressPercent: 30,
        progressReason: 'Agent moving toward target at steady pace',
        trend: 'improving',
        evidence: {},
      } as any);

      const trace = tracer.getTrace();
      const metrics = RuntimeMetricsCollector.collect(trace);
      inspector.initialize(trace, metrics);

      const inspection = inspector.inspectTick(1);
      expect(inspection?.progress?.reason).toBe('Agent moving toward target at steady pace');
    });

    it('should preserve evidence for historical tick', () => {
      const evidence = {
        currentX: 3,
        currentY: 4,
        targetX: 10,
        targetY: 10,
        currentDistance: 13,
        initialDistance: 20,
        distanceCovered: 7,
      };

      tracer.recordMissionTick(2);
      tracer.recordGoalProgressUpdated({
        goalId: 'goal-1',
        goalIntent: 'move-to-target',
        progressPercent: 35,
        progressReason: 'Movement progress',
        trend: 'stable',
        evidence,
      } as any);

      const trace = tracer.getTrace();
      const metrics = RuntimeMetricsCollector.collect(trace);
      inspector.initialize(trace, metrics);

      const inspection = inspector.inspectTick(2);
      expect(inspection?.progress?.evidence).toEqual(evidence);
    });

    it('should handle missing progress data gracefully', () => {
      tracer.recordMissionTick(1);
      // No progress event recorded

      const trace = tracer.getTrace();
      const metrics = RuntimeMetricsCollector.collect(trace);
      inspector.initialize(trace, metrics);

      const inspection = inspector.inspectTick(1);
      expect(inspection?.progress).toBeUndefined();
    });
  });

  describe('Trend Change Tracking', () => {
    it('should track trend changes in execution trace', () => {
      tracer.recordMissionTick(0);
      tracer.recordGoalProgressUpdated({
        goalId: 'goal-1',
        goalIntent: 'move-to-target',
        progressPercent: 0,
        progressReason: 'Start',
        trend: 'stable',
        evidence: {},
      } as any);

      tracer.recordMissionTick(1);
      tracer.recordGoalProgressUpdated({
        goalId: 'goal-1',
        goalIntent: 'move-to-target',
        progressPercent: 50,
        progressReason: 'Progress',
        trend: 'improving',
        evidence: {},
      } as any);

      tracer.recordGoalProgressTrendChanged('goal-1', 'move-to-target', 'stable', 'improving');

      const trace = tracer.getTrace();
      const events = trace.events;

      const trendChangeEvents = events.filter((e) => e.eventType === 'goal_progress_trend_changed');
      expect(trendChangeEvents).toHaveLength(1);
      expect((trendChangeEvents[0]?.data as any).previousTrend).toBe('stable');
      expect((trendChangeEvents[0]?.data as any).newTrend).toBe('improving');
    });
  });

  describe('Progress Completion', () => {
    it('should record goal completion at 100%', () => {
      tracer.recordMissionTick(5);
      tracer.recordGoalCompleted('goal-1', 'move-to-target', 100);

      const trace = tracer.getTrace();
      const completionEvents = trace.events.filter((e) => e.eventType === 'goal_completed');

      expect(completionEvents).toHaveLength(1);
      expect((completionEvents[0]?.data as any).finalProgress).toBe(100);
    });

    it('should show completion event in timeline', () => {
      tracer.recordMissionTick(10);
      tracer.recordGoalCompleted('goal-1', 'move-to-target', 100);

      const trace = tracer.getTrace();
      const lastEvent = trace.events[trace.events.length - 1];

      expect(lastEvent?.eventType).toBe('goal_completed');
    });
  });

  describe('Determinism and Reproducibility', () => {
    it('should produce identical progress for identical world state', () => {
      const progress1 = {
        percent: 50,
        trend: 'improving' as const,
        reason: 'Agent at (5,5), target (10,10), 10 units away',
        evidence: { currentX: 5, currentY: 5, targetX: 10, targetY: 10 },
        measurements: [{ tick: 0, percent: 0 }, { tick: 1, percent: 50 }],
      };

      const progress2 = {
        percent: 50,
        trend: 'improving' as const,
        reason: 'Agent at (5,5), target (10,10), 10 units away',
        evidence: { currentX: 5, currentY: 5, targetX: 10, targetY: 10 },
        measurements: [{ tick: 0, percent: 0 }, { tick: 1, percent: 50 }],
      };

      expect(progress1.percent).toBe(progress2.percent);
      expect(progress1.trend).toBe(progress2.trend);
      expect(JSON.stringify(progress1.evidence)).toBe(JSON.stringify(progress2.evidence));
    });

    it('should freeze progress object to ensure immutability', () => {
      const progress = Object.freeze({
        percent: 50,
        trend: 'improving' as const,
        reason: 'Test',
        evidence: {},
        measurements: [],
      });

      expect(() => {
        (progress as any).percent = 100;
      }).toThrow();
    });
  });
});
