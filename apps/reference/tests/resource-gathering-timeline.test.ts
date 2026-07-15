import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionTracer } from '../src/execution-trace.ts';
import { TimelineInspector } from '../src/timeline-inspector.ts';
import { DashboardIntegration } from '../src/dashboard-integration.ts';
import { DashboardServer } from '../src/dashboard-server.ts';

describe.skip('Story 103: Resource Gathering Timeline Visualization', () => {
  let tracer: ExecutionTracer;
  let inspector: TimelineInspector;
  let dashboard: DashboardServer;
  let integration: DashboardIntegration;

  beforeEach(async () => {
    tracer = new ExecutionTracer('test-gathering-timeline', 100, 100);
    inspector = new TimelineInspector();
    dashboard = new DashboardServer(3002);
    integration = new DashboardIntegration(dashboard);
  });

  describe.skip('Timeline Event Formatting', () => {
    it('should format resource_field_detected event', () => {
      const eventDetail = formatGatheringEvent('resource_field_detected', {
        fieldId: 'ore-field-1',
        resourceType: 'ore',
        amount: 5000,
      });

      expect(eventDetail).toContain('ore-field-1');
      expect(eventDetail).toContain('5000');
      expect(eventDetail).toContain('ore');
    });

    it('should format resource_field_selected event', () => {
      const eventDetail = formatGatheringEvent('resource_field_selected', {
        fieldId: 'ore-field-1',
        resourceType: 'ore',
        score: 0.85,
      });

      expect(eventDetail).toContain('ore-field-1');
      expect(eventDetail).toContain('0.85');
    });

    it('should format gathering_started event', () => {
      const eventDetail = formatGatheringEvent('gathering_started', {
        fieldId: 'ore-field-1',
        resourceType: 'ore',
        targetAmount: 5000,
      });

      expect(eventDetail).toContain('ore-field-1');
      expect(eventDetail).toContain('5000');
    });

    it('should format gathering_progress_updated event', () => {
      const eventDetail = formatGatheringEvent('gathering_progress_updated', {
        fieldId: 'ore-field-1',
        amountCollected: 500,
        amountRemaining: 4500,
        percentComplete: 10,
        status: 'gathering',
      });

      expect(eventDetail).toContain('500');
      expect(eventDetail).toContain('10');
      expect(eventDetail).toContain('%');
    });

    it('should format gathering_completed event', () => {
      const eventDetail = formatGatheringEvent('gathering_completed', {
        fieldId: 'ore-field-1',
        resourceType: 'ore',
        totalCollected: 5000,
      });

      expect(eventDetail).toContain('5000');
      expect(eventDetail).toContain('ore');
    });

    it('should format goal_candidates_evaluated event', () => {
      const eventDetail = formatGatheringEvent('goal_candidates_evaluated', {
        evaluations: [{}, {}, {}],
      });

      expect(eventDetail).toContain('3');
      expect(eventDetail).toContain('goal');
    });

    it('should format goal_selected event', () => {
      const eventDetail = formatGatheringEvent('goal_selected', {
        goalIntent: 'gather-resources',
      });

      expect(eventDetail).toContain('gather-resources');
    });

    it('should format goal_lifecycle_transitioned event', () => {
      const eventDetail = formatGatheringEvent('goal_lifecycle_transitioned', {
        goalIntent: 'gather-resources',
        fromState: 'Selected',
        toState: 'Executing',
      });

      expect(eventDetail).toContain('gather-resources');
      expect(eventDetail).toContain('Selected');
      expect(eventDetail).toContain('Executing');
    });

    it('should format goal_adapted event', () => {
      const eventDetail = formatGatheringEvent('goal_adapted', {
        previousGoalIntent: 'move-to-target',
        newGoalIntent: 'gather-resources',
      });

      expect(eventDetail).toContain('move-to-target');
      expect(eventDetail).toContain('gather-resources');
    });

    it('should format goal_progress_updated event', () => {
      const eventDetail = formatGatheringEvent('goal_progress_updated', {
        progressPercent: 45,
        trend: 'improving',
      });

      expect(eventDetail).toContain('45');
      expect(eventDetail).toContain('improving');
    });
  });

  describe.skip('Timeline Display Rendering', () => {
    it('should create trace with multiple gathering events', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      tracer.recordMissionTick(3);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 1500, 3500, 30, 'gathering');

      tracer.recordMissionTick(4);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 5000, 0, 100, 'complete');
      tracer.recordGatheringCompleted('ore-field-1', 'ore', 5000);

      const trace = tracer.getTrace();

      // Check that all events are recorded
      const detectedEvents = trace.events.filter(e => e.eventType === 'resource_field_detected');
      const selectedEvents = trace.events.filter(e => e.eventType === 'resource_field_selected');
      const startedEvents = trace.events.filter(e => e.eventType === 'gathering_started');
      const progressEvents = trace.events.filter(e => e.eventType === 'gathering_progress_updated');
      const completedEvents = trace.events.filter(e => e.eventType === 'gathering_completed');

      expect(detectedEvents.length).toBe(1);
      expect(selectedEvents.length).toBe(1);
      expect(startedEvents.length).toBe(1);
      expect(progressEvents.length).toBe(3);
      expect(completedEvents.length).toBe(1);
    });

    it('should order timeline events chronologically', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      const gatheringEvents = trace.events.filter(e =>
        e.eventType.startsWith('resource_') || e.eventType.startsWith('gathering_')
      );

      // Events should be in order
      expect(gatheringEvents[0]?.eventType).toBe('resource_field_detected');
      expect(gatheringEvents[1]?.eventType).toBe('resource_field_selected');
      expect(gatheringEvents[2]?.eventType).toBe('gathering_started');
      expect(gatheringEvents[3]?.eventType).toBe('gathering_progress_updated');
    });
  });

  describe.skip('Inspection Panel Display', () => {
    it('should format gathering progress in inspection panel', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 2,
        decisionsExecuted: 2,
        commandsExecuted: 2,
        successfulCommands: 2,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const tickInspection = inspector.inspectTick(2);
      expect(tickInspection?.gatheringProgress).toBeDefined();
      expect(tickInspection?.gatheringProgress?.fieldId).toBe('ore-field-1');
      expect(tickInspection?.gatheringProgress?.amountCollected).toBe(500);
    });

    it('should include all gathering fields in inspection', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 2,
        decisionsExecuted: 2,
        commandsExecuted: 2,
        successfulCommands: 2,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const tickInspection = inspector.inspectTick(2);
      const gathering = tickInspection?.gatheringProgress;

      expect(gathering?.fieldId).toBe('ore-field-1');
      expect(gathering?.resourceType).toBe('ore');
      expect(gathering?.targetAmount).toBe(5000);
      expect(gathering?.amountCollected).toBe(500);
      expect(gathering?.amountRemaining).toBe(4500);
      expect(gathering?.percentComplete).toBe(10);
      expect(gathering?.status).toBe('gathering');
      expect(gathering?.gatheringRate).toBeGreaterThan(0);
      expect(gathering?.detectedAtTick).toBeDefined();
      expect(gathering?.selectedAtTick).toBeDefined();
      expect(gathering?.startedAtTick).toBeDefined();
    });
  });

  describe.skip('Mixed Event Timeline', () => {
    it('should show gathering and goal events together', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      // Goal events
      tracer.recordGoalSelected('goal-1', 'gather-resources', 'Best option');

      // Gathering events
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      const goalEvents = trace.events.filter(e => e.eventType.startsWith('goal_'));
      const gatheringEvents = trace.events.filter(e =>
        e.eventType.startsWith('resource_') || e.eventType.startsWith('gathering_')
      );

      expect(goalEvents.length).toBeGreaterThan(0);
      expect(gatheringEvents.length).toBeGreaterThan(0);

      // Events should be interspersed
      const allRelevantEvents = trace.events.filter(e =>
        e.eventType.startsWith('goal_') ||
        e.eventType.startsWith('resource_') ||
        e.eventType.startsWith('gathering_')
      );
      expect(allRelevantEvents.length).toBeGreaterThan(1);
    });

    it('should handle timeline with all event types', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      // Goal events
      tracer.recordGoalCandidatesEvaluated([
        { goal: { id: 'g1', intent: 'move-to-target', status: 'pending' as const, priority: { level: 'normal' as const }, parameters: {} }, score: 0.8, priorityFactor: 0.5, statusFactor: 0.5, urgencyFactor: 0.5, feasibilityFactor: 0.7, reasoning: 'Test' },
        { goal: { id: 'g2', intent: 'gather-resources', status: 'pending' as const, priority: { level: 'normal' as const }, parameters: {} }, score: 0.75, priorityFactor: 0.5, statusFactor: 0.5, urgencyFactor: 0.5, feasibilityFactor: 0.6, reasoning: 'Test' },
      ]);
      tracer.recordGoalSelected({ id: 'g1', intent: 'move-to-target', status: 'pending' as const, priority: { level: 'normal' as const }, parameters: {} }, 'Test reasoning');

      // Gathering events
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 100, 4900, 2, 'gathering');

      const trace = tracer.getTrace();
      expect(trace.events.length).toBeGreaterThan(4);
    });
  });

  describe.skip('Deterministic Timeline Reconstruction', () => {
    it('should reconstruct same timeline from same trace', () => {
      const trace1 = createDeterministicGatheringTrace();
      const trace2 = createDeterministicGatheringTrace();

      const inspector1 = new TimelineInspector();
      const inspector2 = new TimelineInspector();

      const metrics = {
        ticksExecuted: 5,
        decisionsExecuted: 5,
        commandsExecuted: 5,
        successfulCommands: 5,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      };

      inspector1.initialize(trace1, metrics);
      inspector2.initialize(trace2, metrics);

      const inspection1 = inspector1.inspectTick(3);
      const inspection2 = inspector2.inspectTick(3);

      expect(JSON.stringify(inspection1?.gatheringProgress)).toBe(
        JSON.stringify(inspection2?.gatheringProgress)
      );
    });

    it('should preserve event order across ticks', () => {
      const trace = createDeterministicGatheringTrace();
      const inspector = new TimelineInspector();

      const metrics = {
        ticksExecuted: 5,
        decisionsExecuted: 5,
        commandsExecuted: 5,
        successfulCommands: 5,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      };

      inspector.initialize(trace, metrics);

      const inspection1 = inspector.inspectTick(1);
      const inspection2 = inspector.inspectTick(2);
      const inspection3 = inspector.inspectTick(3);

      // Progress should increase monotonically
      if (inspection2?.gatheringProgress && inspection3?.gatheringProgress) {
        expect(inspection3.gatheringProgress.amountCollected).toBeGreaterThanOrEqual(
          inspection2.gatheringProgress.amountCollected
        );
      }
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle empty timeline', () => {
      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 1,
        decisionsExecuted: 1,
        commandsExecuted: 1,
        successfulCommands: 1,
        failedCommands: 0,
        plansGenerated: 0,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const inspection = inspector.inspectTick(1);
      expect(inspection?.gatheringProgress).toBeUndefined();
    });

    it('should handle timeline with only detection', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 1,
        decisionsExecuted: 1,
        commandsExecuted: 1,
        successfulCommands: 1,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const inspection = inspector.inspectTick(1);
      expect(inspection?.gatheringProgress).toBeNull();
    });

    it('should handle events with special characters in details', () => {
      const eventDetail = formatGatheringEvent('gathering_completed', {
        fieldId: 'ore_field-1 & gems!',
        resourceType: 'ore/gems',
        totalCollected: 5000,
      });

      expect(eventDetail).toBeDefined();
      expect(typeof eventDetail).toBe('string');
    });
  });
});

// Helper functions
function formatGatheringEvent(type: string, data: any): string {
  const eventFormatMap: Record<string, (d: any) => string> = {
    'resource_field_detected': (d) => `Detected: ${d.fieldId || 'unknown'} (${d.amount || 0} ${d.resourceType || 'resource'})`,
    'resource_field_selected': (d) => `Selected: ${d.fieldId || 'unknown'} (score: ${(d.score || 0).toFixed(2)})`,
    'gathering_started': (d) => `Started: ${d.fieldId || 'unknown'} (target: ${d.targetAmount || 0})`,
    'gathering_progress_updated': (d) => `Progress: ${d.amountCollected || 0}/${(d.amountCollected || 0) + (d.amountRemaining || 0)} (${d.percentComplete || 0}%)`,
    'gathering_completed': (d) => `Completed: collected ${d.totalCollected || 0} ${d.resourceType || 'resources'}`,
    'goal_candidates_evaluated': (d) => `Evaluated ${((d.evaluations || []).length)} goal candidates`,
    'goal_selected': (d) => `Selected: ${d.goalIntent || 'goal'}`,
    'goal_lifecycle_transitioned': (d) => `${d.goalIntent || 'Goal'}: ${d.fromState || '?'} → ${d.toState || '?'}`,
    'goal_adapted': (d) => `Adapted: ${d.previousGoalIntent || '?'} → ${d.newGoalIntent || '?'}`,
    'goal_progress_updated': (d) => `Progress: ${d.progressPercent || 0}% (${d.trend || 'stable'})`,
  };

  const formatter = eventFormatMap[type];
  return formatter ? formatter(data) : JSON.stringify(data).substring(0, 60);
}

function createDeterministicGatheringTrace(): ExecutionTracer {
  const tracer = new ExecutionTracer('deterministic-test', 100, 100);
  tracer.recordMissionStarted();
  tracer.recordMissionTick(1);
  tracer.recordResourceFieldDetected('ore-field-1', 'ore', 1000, { x: 80, y: 50 });
  tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
  tracer.recordGatheringStarted('ore-field-1', 'ore', 1000);

  for (let tick = 2; tick <= 5; tick++) {
    tracer.recordMissionTick(tick);
    const collected = (tick - 1) * 200;
    const remaining = Math.max(0, 1000 - collected);
    const percent = (collected / 1000) * 100;
    tracer.recordGatheringProgressUpdated(
      'ore-field-1',
      'ore',
      collected,
      remaining,
      percent,
      percent >= 100 ? 'complete' : 'gathering'
    );
  }

  return tracer;
}
