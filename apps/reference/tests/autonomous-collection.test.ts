import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionTracer } from '../src/execution-trace';
import { ResourceGatherer } from '../src/resource-gatherer';
import type { ResourceFieldInfo } from '../src/resource-gatherer';

describe('Story 105: Autonomous Resource Collection', () => {
  let tracer: ExecutionTracer;
  let gatherer: ResourceGatherer;
  let resourceFields: Map<string, ResourceFieldInfo>;

  beforeEach(() => {
    tracer = new ExecutionTracer();
    gatherer = new ResourceGatherer();
    resourceFields = new Map();
  });

  describe('Gathering command execution', () => {
    it('should record gathering begun after arrival', () => {
      const fieldId = 'ore-1';
      const resourceType = 'ore';
      const targetAmount = 1000;

      tracer.recordWorkerGatheringBegun(fieldId, resourceType, targetAmount);

      const events = tracer.getTrace().events;
      const gatheringBegun = events.find(e => e.eventType === 'worker_gathering_begun');
      expect(gatheringBegun).toBeDefined();
      expect((gatheringBegun?.data as any)?.resourceType).toBe('ore');
    });

    it('should track gathering progress during collection', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 1000,
        collected: 0,
      });

      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 1000);

      // Simulate ticks of gathering
      for (let tick = 1; tick <= 5; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, 1, tick, resourceFields);
        if (progress) {
          tracer.recordGatheringProgressUpdated(
            fieldId,
            progress.resourceType,
            progress.amountCollected,
            progress.amountRemaining,
            progress.percentComplete,
            progress.status
          );
        }
      }

      const events = tracer.getTrace().events;
      const progressEvents = events.filter(e => e.eventType === 'gathering_progress_updated');
      expect(progressEvents.length).toBeGreaterThan(0);
    });

    it('should detect gathering completion at 100 ticks', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 100,
        collected: 0,
      });

      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 100);

      // Gathering takes 100 ticks to complete
      const startTick = 0;
      for (let tick = 1; tick <= 105; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, startTick, tick, resourceFields);
        if (progress) {
          tracer.recordGatheringProgressUpdated(
            fieldId,
            progress.resourceType,
            progress.amountCollected,
            progress.amountRemaining,
            progress.percentComplete,
            progress.status
          );

          if (progress.status === 'complete') {
            tracer.recordGatheringCompleted(fieldId, progress.resourceType, progress.amountCollected);
            break;
          }
        }
      }

      const events = tracer.getTrace().events;
      const completedEvent = events.find(e => e.eventType === 'gathering_completed');
      expect(completedEvent).toBeDefined();
    });
  });

  describe('Resource field depletion', () => {
    it('should track resource amount remaining', () => {
      const fieldId = 'gold-1';
      const totalAmount = 500;

      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 10, y: 10 },
        resourceType: 'gold',
        amount: totalAmount,
        collected: 0,
      });

      tracer.recordWorkerGatheringBegun(fieldId, 'gold', totalAmount);

      const progress = gatherer.calculateGatheringProgress(fieldId, 1, 10, resourceFields);
      expect(progress?.amountRemaining).toBeGreaterThan(0);
      expect(progress?.amountCollected).toBeGreaterThan(0);
    });

    it('should complete gathering when 100 ticks elapsed', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 500,
        collected: 0,
      });

      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 500);

      let isComplete = false;
      const startTick = 0;
      for (let tick = 1; tick <= 105; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, startTick, tick, resourceFields);
        if (progress?.status === 'complete') {
          tracer.recordGatheringCompleted(fieldId, progress.resourceType, progress.amountCollected);
          isComplete = true;
          break;
        }
      }

      expect(isComplete).toBe(true);
    });
  });

  describe('Multi-field gathering', () => {
    it('should handle multiple resource fields independently', () => {
      const oreFieldId = 'ore-1';
      const goldFieldId = 'gold-1';

      resourceFields.set(oreFieldId, {
        id: oreFieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 1000,
        collected: 0,
      });

      resourceFields.set(goldFieldId, {
        id: goldFieldId,
        position: { x: 10, y: 10 },
        resourceType: 'gold',
        amount: 500,
        collected: 0,
      });

      tracer.recordWorkerGatheringBegun(oreFieldId, 'ore', 1000);
      tracer.recordWorkerGatheringBegun(goldFieldId, 'gold', 500);

      const events = tracer.getTrace().events;
      const gatheringBegun = events.filter(e => e.eventType === 'worker_gathering_begun');
      expect(gatheringBegun.length).toBe(2);
    });

    it('should track gathering sequence across multiple fields', () => {
      const field1 = 'ore-1';
      const field2 = 'ore-2';

      resourceFields.set(field1, {
        id: field1,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 100,
        collected: 0,
      });

      resourceFields.set(field2, {
        id: field2,
        position: { x: 10, y: 10 },
        resourceType: 'ore',
        amount: 100,
        collected: 0,
      });

      // Gather from first field (100 ticks to complete)
      tracer.recordWorkerGatheringBegun(field1, 'ore', 100);
      for (let tick = 1; tick <= 105; tick++) {
        const progress = gatherer.calculateGatheringProgress(field1, 0, tick, resourceFields);
        if (progress?.status === 'complete') {
          tracer.recordGatheringCompleted(field1, 'ore', progress.amountCollected);
          break;
        }
      }

      // Gather from second field
      tracer.recordWorkerGatheringBegun(field2, 'ore', 100);

      const events = tracer.getTrace().events;
      const begunEvents = events.filter(e => e.eventType === 'worker_gathering_begun');
      const completedEvents = events.filter(e => e.eventType === 'gathering_completed');

      expect(begunEvents.length).toBe(2);
      expect(completedEvents.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Gathering state transitions', () => {
    it('should transition from arrival to gathering', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 1000,
        collected: 0,
      });

      tracer.recordWorkerArrivalDetected(fieldId, { x: 5, y: 5 }, 10);
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 1000);

      const events = tracer.getTrace().events;
      const arrivalIndex = events.findIndex(e => e.eventType === 'worker_arrival_detected');
      const gatheringIndex = events.findIndex(e => e.eventType === 'worker_gathering_begun');

      expect(arrivalIndex).toBeLessThan(gatheringIndex);
    });

    it('should record complete gathering sequence', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 100,
        collected: 0,
      });

      // Movement
      tracer.recordWorkerMovementStarted(fieldId, { x: 5, y: 5 }, { x: 0, y: 0 });

      // Arrival
      tracer.recordWorkerArrivalDetected(fieldId, { x: 5, y: 5 }, 10);

      // Gathering (100 ticks to complete)
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 100);

      const startTick = 11;
      for (let tick = 12; tick <= 115; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, startTick, tick, resourceFields);
        if (progress) {
          tracer.recordGatheringProgressUpdated(
            fieldId,
            'ore',
            progress.amountCollected,
            progress.amountRemaining,
            progress.percentComplete,
            progress.status
          );

          if (progress.status === 'complete') {
            tracer.recordGatheringCompleted(fieldId, 'ore', progress.amountCollected);
            break;
          }
        }
      }

      const events = tracer.getTrace().events;
      const sequence = events.filter(
        e =>
          e.eventType.startsWith('worker_') ||
          e.eventType.startsWith('gathering_')
      );

      expect(sequence.length).toBeGreaterThan(4);
      expect(sequence[0].eventType).toBe('worker_movement_started');
    });
  });

  describe('Gathering progress calculation', () => {
    it('should calculate correct collection amounts', () => {
      const fieldId = 'ore-1';
      const totalAmount = 1000;

      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: totalAmount,
        collected: 0,
      });

      const progress = gatherer.calculateGatheringProgress(fieldId, 0, 10, resourceFields);

      expect(progress?.amountCollected).toBeGreaterThan(0);
      expect(progress?.amountRemaining).toBeLessThan(totalAmount);
      expect(progress?.amountCollected + progress?.amountRemaining).toBeLessThanOrEqual(totalAmount);
    });

    it('should track collection rate', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 1000,
        collected: 0,
      });

      const progress1 = gatherer.calculateGatheringProgress(fieldId, 0, 5, resourceFields);
      const progress2 = gatherer.calculateGatheringProgress(fieldId, 0, 10, resourceFields);

      expect(progress2!.amountCollected).toBeGreaterThan(progress1!.amountCollected);
      expect(progress2!.percentComplete).toBeGreaterThan(progress1!.percentComplete);
    });

    it('should cap collection at field amount', () => {
      const fieldId = 'ore-1';
      const totalAmount = 100;

      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: totalAmount,
        collected: 0,
      });

      const progress = gatherer.calculateGatheringProgress(fieldId, 0, 1000, resourceFields);

      expect(progress?.amountCollected).toBeLessThanOrEqual(totalAmount);
      expect(progress?.amountRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Timeline integration', () => {
    it('should record all gathering events in trace', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 500,
        collected: 0,
      });

      tracer.recordWorkerMovementStarted(fieldId, { x: 5, y: 5 }, { x: 0, y: 0 });
      tracer.recordWorkerArrivalDetected(fieldId, { x: 5, y: 5 }, 5);
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 500);

      const startTick = 6;
      for (let tick = 7; tick <= 115; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, startTick, tick, resourceFields);
        if (progress) {
          tracer.recordGatheringProgressUpdated(
            fieldId,
            'ore',
            progress.amountCollected,
            progress.amountRemaining,
            progress.percentComplete,
            progress.status
          );

          if (progress.status === 'complete') {
            tracer.recordGatheringCompleted(fieldId, 'ore', progress.amountCollected);
            break;
          }
        }
      }

      const trace = tracer.getTrace();
      expect(trace.events.length).toBeGreaterThan(5);

      const eventTypes = trace.events.map(e => e.eventType);
      expect(eventTypes).toContain('worker_movement_started');
      expect(eventTypes).toContain('worker_arrival_detected');
      expect(eventTypes).toContain('worker_gathering_begun');
      expect(eventTypes).toContain('gathering_progress_updated');
      expect(eventTypes).toContain('gathering_completed');
    });

    it('should maintain chronological order of events', () => {
      const fieldId = 'ore-1';
      resourceFields.set(fieldId, {
        id: fieldId,
        position: { x: 5, y: 5 },
        resourceType: 'ore',
        amount: 200,
        collected: 0,
      });

      tracer.recordWorkerMovementStarted(fieldId, { x: 5, y: 5 }, { x: 0, y: 0 });
      tracer.recordWorkerArrivalDetected(fieldId, { x: 5, y: 5 }, 5);
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 200);

      for (let tick = 6; tick <= 100; tick++) {
        const progress = gatherer.calculateGatheringProgress(fieldId, 6, tick, resourceFields);
        if (progress?.status === 'complete') {
          tracer.recordGatheringCompleted(fieldId, 'ore', progress.amountCollected);
          break;
        }
      }

      const events = tracer.getTrace().events;
      for (let i = 1; i < events.length; i++) {
        expect(events[i].tick).toBeGreaterThanOrEqual(events[i - 1].tick);
      }
    });
  });
});
