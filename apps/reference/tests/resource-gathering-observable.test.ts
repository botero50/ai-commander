import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionTracer } from '../src/execution-trace.ts';
import { TimelineInspector } from '../src/timeline-inspector.ts';
import { DashboardIntegration } from '../src/dashboard-integration.ts';
import { DashboardServer } from '../src/dashboard-server.ts';

describe.skip('Story 102: Observable Resource Gathering', () => {
  let tracer: ExecutionTracer;
  let inspector: TimelineInspector;
  let dashboard: DashboardServer;
  let integration: DashboardIntegration;

  beforeEach(async () => {
    tracer = new ExecutionTracer('test-gathering', 100, 100);
    inspector = new TimelineInspector();
    dashboard = new DashboardServer(3001);
    integration = new DashboardIntegration(dashboard);
  });

  describe.skip('Trace Events', () => {
    it('should record resource_field_detected event', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });

      const trace = tracer.getTrace();
      const event = trace.events.find(e => e.eventType === 'resource_field_detected');

      expect(event).toBeDefined();
      expect((event?.data as any).fieldId).toBe('ore-field-1');
      expect((event?.data as any).resourceType).toBe('ore');
      expect((event?.data as any).amount).toBe(5000);
    });

    it('should record resource_field_selected event', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Highest priority ore deposit');

      const trace = tracer.getTrace();
      const event = trace.events.find(e => e.eventType === 'resource_field_selected');

      expect(event).toBeDefined();
      expect((event?.data as any).fieldId).toBe('ore-field-1');
      expect((event?.data as any).score).toBe(0.85);
    });

    it('should record gathering_started event', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      const trace = tracer.getTrace();
      const event = trace.events.find(e => e.eventType === 'gathering_started');

      expect(event).toBeDefined();
      expect((event?.data as any).targetAmount).toBe(5000);
    });

    it('should record gathering_progress_updated event', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordMissionTick(2);

      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      const event = trace.events.find(e => e.eventType === 'gathering_progress_updated');

      expect(event).toBeDefined();
      expect((event?.data as any).amountCollected).toBe(500);
      expect((event?.data as any).percentComplete).toBe(10);
      expect((event?.data as any).status).toBe('gathering');
    });

    it('should record gathering_completed event', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      tracer.recordGatheringCompleted('ore-field-1', 'ore', 5000);

      const trace = tracer.getTrace();
      const event = trace.events.find(e => e.eventType === 'gathering_completed');

      expect(event).toBeDefined();
      expect((event?.data as any).totalCollected).toBe(5000);
    });
  });

  describe.skip('Gathering Progress Reconstruction', () => {
    it('should reconstruct gathering progress from trace events', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      tracer.recordMissionTick(3);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 1500, 3500, 30, 'gathering');

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 3,
        decisionsExecuted: 3,
        commandsExecuted: 3,
        successfulCommands: 3,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const tickInspection = inspector.inspectTick(3);
      expect(tickInspection).toBeDefined();
      expect(tickInspection?.gatheringProgress).toBeDefined();
      expect(tickInspection?.gatheringProgress?.amountCollected).toBe(1500);
      expect(tickInspection?.gatheringProgress?.percentComplete).toBe(30);
    });

    it('should calculate gathering rate from progress', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      // Tick 2: 100 collected
      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 100, 4900, 2, 'gathering');

      // Tick 3: 200 collected (100 per tick)
      tracer.recordMissionTick(3);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 200, 4800, 4, 'gathering');

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 3,
        decisionsExecuted: 3,
        commandsExecuted: 3,
        successfulCommands: 3,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const tickInspection = inspector.inspectTick(3);
      expect(tickInspection?.gatheringProgress?.gatheringRate).toBeDefined();
      expect(tickInspection?.gatheringProgress?.gatheringRate).toBeGreaterThan(0);
    });

    it('should estimate completion tick', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 1000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 1000);

      // Collect 100 per tick for 10 ticks = 1000 total
      for (let tick = 2; tick <= 10; tick++) {
        tracer.recordMissionTick(tick);
        const collected = (tick - 1) * 100;
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

      const trace = tracer.getTrace();
      inspector.initialize(trace, {
        ticksExecuted: 10,
        decisionsExecuted: 10,
        commandsExecuted: 10,
        successfulCommands: 10,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      });

      const tickInspection = inspector.inspectTick(5);
      expect(tickInspection?.gatheringProgress?.estimatedCompletionTick).toBeDefined();
      expect(tickInspection?.gatheringProgress?.estimatedCompletionTick).toBeGreaterThan(5);
    });

    it('should handle multiple resource fields', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);

      // Detect multiple fields
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldDetected('gems-field-1', 'gems', 2000, { x: 70, y: 70 });

      // Select ore field
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Best field');

      const trace = tracer.getTrace();
      const detectedEvents = trace.events.filter(e => e.eventType === 'resource_field_detected');
      const selectedEvents = trace.events.filter(e => e.eventType === 'resource_field_selected');

      expect(detectedEvents.length).toBe(2);
      expect(selectedEvents.length).toBe(1);
      expect((selectedEvents[0]?.data as any).fieldId).toBe('ore-field-1');
    });
  });

  describe.skip('Dashboard Display', () => {
    it('should display gathering progress in dashboard state', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      tracer.recordMissionTick(2);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 500, 4500, 10, 'gathering');

      const trace = tracer.getTrace();
      const metrics = {
        ticksExecuted: 2,
        decisionsExecuted: 2,
        commandsExecuted: 2,
        successfulCommands: 2,
        failedCommands: 0,
        plansGenerated: 1,
        missionDurationMs: 0,
        eventCountByType: {},
      };

      // Test extraction
      const extractedGathering = extractGatheringFromTrace(trace);
      expect(extractedGathering).toBeDefined();
      expect(extractedGathering?.fieldId).toBe('ore-field-1');
      expect(extractedGathering?.resourceType).toBe('ore');
      expect(extractedGathering?.amountCollected).toBe(500);
      expect(extractedGathering?.percentComplete).toBe(10);
    });

    it('should show gathering status transitions', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      const statuses = ['traveling', 'gathering', 'returning', 'complete'] as const;
      for (let i = 0; i < statuses.length; i++) {
        tracer.recordMissionTick(i + 2);
        const status = statuses[i];
        tracer.recordGatheringProgressUpdated(
          'ore-field-1',
          'ore',
          (i + 1) * 1250,
          Math.max(0, 5000 - (i + 1) * 1250),
          ((i + 1) * 25),
          status
        );
      }

      const trace = tracer.getTrace();
      const progressEvents = trace.events.filter(e => e.eventType === 'gathering_progress_updated');

      expect(progressEvents.length).toBe(4);
      progressEvents.forEach((event, index) => {
        expect((event.data as any).status).toBe(statuses[index]);
      });
    });
  });

  describe.skip('Determinism', () => {
    it('should produce deterministic gathering events from same world state', () => {
      const trace1 = createDeterministicGatheringTrace();
      const trace2 = createDeterministicGatheringTrace();

      const e1 = trace1.events.filter(e => e.eventType === 'gathering_progress_updated');
      const e2 = trace2.events.filter(e => e.eventType === 'gathering_progress_updated');

      expect(e1.length).toBe(e2.length);
      e1.forEach((event, index) => {
        expect((event.data as any).amountCollected).toBe(((e2[index]?.data as any).amountCollected));
        expect((event.data as any).percentComplete).toBe((e2[index]?.data as any).percentComplete);
      });
    });

    it('should produce identical timeline reconstruction from identical traces', () => {
      const trace = createDeterministicGatheringTrace();
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

      inspector1.initialize(trace, metrics);
      inspector2.initialize(trace, metrics);

      const inspection1 = inspector1.inspectTick(5);
      const inspection2 = inspector2.inspectTick(5);

      expect(JSON.stringify(inspection1?.gatheringProgress)).toBe(JSON.stringify(inspection2?.gatheringProgress));
    });
  });

  describe.skip('Edge Cases', () => {
    it('should handle gathering with no progress updates', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      const trace = tracer.getTrace();
      const progressEvents = trace.events.filter(e => e.eventType === 'gathering_progress_updated');

      expect(progressEvents.length).toBe(0);
    });

    it('should handle completion without progress events', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);
      tracer.recordMissionTick(2);
      tracer.recordGatheringCompleted('ore-field-1', 'ore', 5000);

      const trace = tracer.getTrace();
      const completedEvents = trace.events.filter(e => e.eventType === 'gathering_completed');

      expect(completedEvents.length).toBe(1);
    });

    it('should handle zero gathering rate gracefully', () => {
      tracer.recordMissionStarted();
      tracer.recordMissionTick(1);
      tracer.recordResourceFieldDetected('ore-field-1', 'ore', 5000, { x: 80, y: 50 });
      tracer.recordResourceFieldSelected('ore-field-1', 'ore', 0.85, 'Selected');
      tracer.recordGatheringStarted('ore-field-1', 'ore', 5000);

      // Same tick, no progress
      tracer.recordMissionTick(1);
      tracer.recordGatheringProgressUpdated('ore-field-1', 'ore', 0, 5000, 0, 'traveling');

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
      expect(inspection?.gatheringProgress?.gatheringRate).toBeDefined();
      expect(inspection?.gatheringProgress?.gatheringRate).toBe(0);
    });
  });
});

// Helper: Create trace with deterministic gathering events
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

// Helper: Extract gathering progress from trace
function extractGatheringFromTrace(trace: any): any {
  const selectedEvents = trace.events.filter((e: any) => e.eventType === 'resource_field_selected');
  if (selectedEvents.length === 0) return null;

  const lastSelected = selectedEvents[selectedEvents.length - 1];
  const progressEvents = trace.events.filter((e: any) => e.eventType === 'gathering_progress_updated');

  if (progressEvents.length === 0) return null;

  const lastProgress = progressEvents[progressEvents.length - 1];

  return {
    fieldId: (lastSelected?.data as any).fieldId,
    resourceType: (lastSelected?.data as any).resourceType,
    amountCollected: (lastProgress?.data as any).amountCollected,
    amountRemaining: (lastProgress?.data as any).amountRemaining,
    percentComplete: (lastProgress?.data as any).percentComplete,
    status: (lastProgress?.data as any).status,
  };
}
