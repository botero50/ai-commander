import { describe, it, expect, beforeEach } from 'vitest';
import { WorkerAssignment_Logic } from '../src/worker-assignment';
import { ExecutionTracer } from '../src/execution-trace';

describe('Story 108: Autonomous Worker Assignment', () => {
  let assignment: WorkerAssignment_Logic;
  let tracer: ExecutionTracer;

  beforeEach(() => {
    assignment = new WorkerAssignment_Logic();
    tracer = new ExecutionTracer();
  });

  describe('Idle worker detection', () => {
    it('should detect idle workers', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: {
              status: 'idle',
              position: '10,10',
            },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(1);
      expect(idle[0].workerId).toBe('worker-1');
      expect(idle[0].isIdle).toBe(true);
    });

    it('should not detect gathering workers', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: {
              status: 'gathering',
              position: '10,10',
            },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(0);
    });

    it('should not detect returning workers', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: {
              status: 'returning',
              position: '10,10',
            },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(0);
    });

    it('should detect multiple idle workers', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: { status: 'idle', position: '10,10' },
          },
          {
            id: 'worker-2',
            customData: { status: 'idle', position: '15,15' },
          },
          {
            id: 'worker-3',
            customData: { status: 'gathering', position: '20,20' },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(2);
    });

    it('should extract worker position', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: { status: 'idle', position: '5,7' },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle[0].position).toEqual({ x: 5, y: 7 });
    });
  });

  describe('Field selection and balancing', () => {
    it('should select best field with no workers', () => {
      const fields = [
        { id: 'ore-1', resourceType: 'ore', amount: 1000 },
        { id: 'ore-2', resourceType: 'ore', amount: 500 },
      ];
      const workerCount = new Map();

      const best = assignment.selectBestField(fields, workerCount);
      expect(best?.id).toBe('ore-1');
    });

    it('should balance workers across fields', () => {
      const fields = [
        { id: 'ore-1', resourceType: 'ore', amount: 1000 },
        { id: 'ore-2', resourceType: 'ore', amount: 1000 },
      ];
      const workerCount = new Map([['ore-1', 2]]);

      const best = assignment.selectBestField(fields, workerCount);
      expect(best?.id).toBe('ore-2');
    });

    it('should select field with fewest workers', () => {
      const fields = [
        { id: 'ore-1', resourceType: 'ore', amount: 1000 },
        { id: 'ore-2', resourceType: 'ore', amount: 1000 },
        { id: 'ore-3', resourceType: 'ore', amount: 1000 },
      ];
      const workerCount = new Map([
        ['ore-1', 3],
        ['ore-2', 1],
        ['ore-3', 2],
      ]);

      const best = assignment.selectBestField(fields, workerCount);
      expect(best?.id).toBe('ore-2');
    });

    it('should return null for no fields', () => {
      const best = assignment.selectBestField([], new Map());
      expect(best).toBeNull();
    });
  });

  describe('Assignment tracking', () => {
    it('should record assignment', () => {
      assignment.recordAssignment('worker-1');
      expect(assignment.isAssigned('worker-1')).toBe(true);
    });

    it('should prevent duplicate assignments', () => {
      assignment.recordAssignment('worker-1');
      assignment.recordAssignment('worker-1');
      expect(assignment.isAssigned('worker-1')).toBe(true);
    });

    it('should track multiple assignments', () => {
      assignment.recordAssignment('worker-1');
      assignment.recordAssignment('worker-2');
      assignment.recordAssignment('worker-3');

      expect(assignment.isAssigned('worker-1')).toBe(true);
      expect(assignment.isAssigned('worker-2')).toBe(true);
      expect(assignment.isAssigned('worker-3')).toBe(true);
    });

    it('should clear assignments', () => {
      assignment.recordAssignment('worker-1');
      assignment.clearAssignments();
      expect(assignment.isAssigned('worker-1')).toBe(false);
    });
  });

  describe('Trace recording', () => {
    it('should record worker assignment', () => {
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');

      const events = tracer.getTrace().events;
      const assigned = events.find(e => e.eventType === 'worker_assigned');
      expect(assigned).toBeDefined();
      expect((assigned?.data as any)?.workerId).toBe('worker-1');
      expect((assigned?.data as any)?.fieldId).toBe('ore-1');
    });

    it('should record worker reassignment', () => {
      tracer.recordWorkerReassigned('worker-1', 'ore-1', 'ore-2', 'rebalance');

      const events = tracer.getTrace().events;
      const reassigned = events.find(e => e.eventType === 'worker_reassigned');
      expect(reassigned).toBeDefined();
      expect((reassigned?.data as any)?.workerId).toBe('worker-1');
      expect((reassigned?.data as any)?.newFieldId).toBe('ore-2');
    });
  });

  describe('Complete assignment lifecycle', () => {
    it('should record full assignment lifecycle', () => {
      // Spawn
      tracer.recordUnitSpawned('worker-1', 'worker', { x: 20, y: 20 });

      // Detect as idle
      // (implicit - worker would be idle)

      // Assign to field
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');

      // Later reassign for balance
      tracer.recordWorkerReassigned('worker-1', 'ore-1', 'ore-2', 'rebalance');

      const events = tracer.getTrace().events;
      expect(events.some(e => e.eventType === 'unit_spawned')).toBe(true);
      expect(events.some(e => e.eventType === 'worker_assigned')).toBe(true);
      expect(events.some(e => e.eventType === 'worker_reassigned')).toBe(true);
    });

    it('should maintain event order', () => {
      tracer.recordUnitSpawned('worker-1', 'worker', { x: 20, y: 20 });
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');
      tracer.recordWorkerReassigned('worker-1', 'ore-1', 'ore-2', 'rebalance');

      const events = tracer.getTrace().events;
      const spawnIdx = events.findIndex(e => e.eventType === 'unit_spawned');
      const assignIdx = events.findIndex(e => e.eventType === 'worker_assigned');
      const reassignIdx = events.findIndex(e => e.eventType === 'worker_reassigned');

      expect(spawnIdx).toBeLessThan(assignIdx);
      expect(assignIdx).toBeLessThan(reassignIdx);
    });
  });

  describe('Multi-worker assignment', () => {
    it('should assign multiple workers to same field', () => {
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');
      tracer.recordWorkerAssigned('worker-2', 'ore-1', 'ore');

      const events = tracer.getTrace().events;
      const assigned = events.filter(e => e.eventType === 'worker_assigned');
      expect(assigned.length).toBe(2);
    });

    it('should assign workers to different fields', () => {
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');
      tracer.recordWorkerAssigned('worker-2', 'ore-2', 'ore');
      tracer.recordWorkerAssigned('worker-3', 'gold-1', 'gold');

      const events = tracer.getTrace().events;
      const assigned = events.filter(e => e.eventType === 'worker_assigned');
      expect(assigned.length).toBe(3);
    });

    it('should rebalance workers across fields', () => {
      // Initial assignments
      tracer.recordWorkerAssigned('worker-1', 'ore-1', 'ore');
      tracer.recordWorkerAssigned('worker-2', 'ore-1', 'ore');
      tracer.recordWorkerAssigned('worker-3', 'ore-2', 'ore');

      // Rebalance
      tracer.recordWorkerReassigned('worker-1', 'ore-1', 'ore-2', 'rebalance');

      const events = tracer.getTrace().events;
      expect(events.some(e => e.eventType === 'worker_reassigned')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle null world state', () => {
      const idle = assignment.detectIdleWorkers(null as any);
      expect(idle.length).toBe(0);
    });

    it('should handle missing position data', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: { status: 'idle' },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(0);
    });

    it('should handle malformed position string', () => {
      const worldState = {
        agents: [
          {
            id: 'worker-1',
            customData: {
              status: 'idle',
              position: 'invalid',
            },
          },
        ],
      } as any;

      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(0);
    });

    it('should handle empty agent list', () => {
      const worldState = { agents: [] } as any;
      const idle = assignment.detectIdleWorkers(worldState);
      expect(idle.length).toBe(0);
    });
  });
});
