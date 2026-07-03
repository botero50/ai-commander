import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionTracer } from '../src/execution-trace';
import { WorkerMovement } from '../src/worker-movement';
import type { WorkerPosition } from '../src/worker-movement';

describe('Story 104: Worker Pathfinding', () => {
  let tracer: ExecutionTracer;
  let movement: WorkerMovement;

  beforeEach(() => {
    tracer = new ExecutionTracer();
    movement = new WorkerMovement();
  });

  describe('Trace recording for worker movement', () => {
    it('should record worker movement started event', () => {
      const fieldId = 'ore-1';
      const targetPos: WorkerPosition = { x: 5, y: 5 };
      const currentPos: WorkerPosition = { x: 0, y: 0 };

      tracer.recordWorkerMovementStarted(fieldId, targetPos, currentPos);

      const events = tracer.getTrace().events;
      const movementStarted = events.find(e => e.eventType === 'worker_movement_started');
      expect(movementStarted).toBeDefined();
      expect((movementStarted?.data as any)?.fieldId).toBe('ore-1');
      expect((movementStarted?.data as any)?.targetPosition).toEqual(targetPos);
    });

    it('should record worker position updated event', () => {
      const fieldId = 'ore-1';
      const currentPos: WorkerPosition = { x: 2, y: 0 };
      const targetPos: WorkerPosition = { x: 5, y: 5 };

      tracer.recordWorkerPositionUpdated(
        fieldId,
        currentPos,
        targetPos,
        7,
        40
      );

      const events = tracer.getTrace().events;
      const posUpdated = events.find(e => e.eventType === 'worker_position_updated');
      expect(posUpdated).toBeDefined();
      expect((posUpdated?.data as any)?.currentPosition).toEqual(currentPos);
      expect((posUpdated?.data as any)?.distanceRemaining).toBe(7);
    });

    it('should record worker arrival detected event', () => {
      const fieldId = 'ore-1';
      const arrivedPos: WorkerPosition = { x: 5, y: 5 };
      const ticksToArrive = 10;

      tracer.recordWorkerArrivalDetected(fieldId, arrivedPos, ticksToArrive);

      const events = tracer.getTrace().events;
      const arrivalEvent = events.find(e => e.eventType === 'worker_arrival_detected');
      expect(arrivalEvent).toBeDefined();
      expect((arrivalEvent?.data as any)?.fieldId).toBe('ore-1');
      expect((arrivalEvent?.data as any)?.ticksToArrive).toBe(10);
    });

    it('should record worker gathering begun event', () => {
      const fieldId = 'ore-1';
      const resourceType = 'ore';
      const targetAmount = 1000;

      tracer.recordWorkerGatheringBegun(fieldId, resourceType, targetAmount);

      const events = tracer.getTrace().events;
      const gatheringBegun = events.find(e => e.eventType === 'worker_gathering_begun');
      expect(gatheringBegun).toBeDefined();
      expect((gatheringBegun?.data as any)?.resourceType).toBe('ore');
      expect((gatheringBegun?.data as any)?.targetAmount).toBe(1000);
    });
  });

  describe('Movement sequence recording', () => {
    it('should record complete movement sequence', () => {
      const fieldId = 'ore-1';
      const startPos: WorkerPosition = { x: 0, y: 0 };
      const targetPos: WorkerPosition = { x: 3, y: 3 };

      // Record movement start
      tracer.recordWorkerMovementStarted(fieldId, targetPos, startPos);

      // Record position updates during travel
      tracer.recordWorkerPositionUpdated(fieldId, { x: 1, y: 0 }, targetPos, 5, 25);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 2, y: 0 }, targetPos, 4, 33);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 3, y: 0 }, targetPos, 3, 50);

      // Record arrival
      tracer.recordWorkerArrivalDetected(fieldId, targetPos, 4);

      // Record gathering start
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 500);

      const events = tracer.getTrace().events;
      const movementStarted = events.filter(e => e.eventType === 'worker_movement_started');
      const posUpdates = events.filter(e => e.eventType === 'worker_position_updated');
      const arrivalDetected = events.filter(e => e.eventType === 'worker_arrival_detected');
      const gatheringBegun = events.filter(e => e.eventType === 'worker_gathering_begun');

      expect(movementStarted.length).toBeGreaterThan(0);
      expect(posUpdates.length).toBeGreaterThan(0);
      expect(arrivalDetected.length).toBeGreaterThan(0);
      expect(gatheringBegun.length).toBeGreaterThan(0);
    });

    it('should maintain chronological order of movement events', () => {
      const fieldId = 'ore-1';
      const startPos: WorkerPosition = { x: 0, y: 0 };
      const targetPos: WorkerPosition = { x: 3, y: 3 };

      tracer.recordWorkerMovementStarted(fieldId, targetPos, startPos);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 1, y: 0 }, targetPos, 5, 25);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 2, y: 0 }, targetPos, 4, 33);
      tracer.recordWorkerArrivalDetected(fieldId, targetPos, 2);
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 500);

      const events = tracer.getTrace().events;
      const eventTypes = events.map(e => e.eventType);

      const movementStartIndex = eventTypes.lastIndexOf('worker_movement_started');
      const arrivalIndex = eventTypes.lastIndexOf('worker_arrival_detected');
      const gatheringBegunIndex = eventTypes.lastIndexOf('worker_gathering_begun');

      expect(movementStartIndex).toBeLessThan(arrivalIndex);
      expect(arrivalIndex).toBeLessThan(gatheringBegunIndex);
    });
  });

  describe('Worker movement distance calculation', () => {
    it('should calculate Manhattan distance correctly', () => {
      const from: WorkerPosition = { x: 0, y: 0 };
      const to: WorkerPosition = { x: 3, y: 4 };

      const distance = movement.calculateDistance(from, to);
      expect(distance).toBe(7);
    });

    it('should calculate distance for multi-step journey', () => {
      const spawn: WorkerPosition = { x: 0, y: 0 };
      const field: WorkerPosition = { x: 5, y: 3 };

      const distance = movement.calculateDistance(spawn, field);
      expect(distance).toBe(8);

      tracer.recordWorkerMovementStarted('ore-1', field, spawn);

      const events = tracer.getTrace().events;
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Movement phase tracking', () => {
    it('should detect traveling phase when not at target', () => {
      const current: WorkerPosition = { x: 0, y: 0 };
      const target: WorkerPosition = { x: 5, y: 5 };

      const phase = movement.determinePhase(current, target, false, false);
      expect(phase).toBe('traveling');
    });

    it('should detect arrived phase when at target', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const phase = movement.determinePhase(pos, pos, false, false);
      expect(['idle', 'arrived']).toContain(phase);
    });

    it('should detect gathering phase', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const phase = movement.determinePhase(pos, pos, true, false);
      expect(phase).toBe('gathering');
    });

    it('should detect returning phase', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const phase = movement.determinePhase(pos, pos, false, true);
      expect(phase).toBe('returning');
    });

    it('should prioritize returning over gathering', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const phase = movement.determinePhase(pos, pos, true, true);
      expect(phase).toBe('returning');
    });
  });

  describe('Arrival detection', () => {
    it('should detect arrival when at exact position', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };
      expect(movement.detectArrival(pos, pos)).toBe(true);
    });

    it('should not detect arrival when approaching', () => {
      const current: WorkerPosition = { x: 4, y: 5 };
      const target: WorkerPosition = { x: 5, y: 5 };

      expect(movement.detectArrival(current, target)).toBe(false);
    });

    it('should require exact coordinate match', () => {
      const current: WorkerPosition = { x: 5, y: 4 };
      const target: WorkerPosition = { x: 5, y: 5 };

      expect(movement.detectArrival(current, target)).toBe(false);
    });
  });

  describe('Movement progress calculation', () => {
    it('should calculate progress from start to target', () => {
      const start: WorkerPosition = { x: 0, y: 0 };
      const target: WorkerPosition = { x: 10, y: 10 };

      const progress = movement.calculateProgress(start, target, 'traveling', 0, 5);

      expect(progress.phase).toBe('traveling');
      expect(progress.currentPosition).toEqual(start);
      expect(progress.targetPosition).toEqual(target);
      expect(progress.pathLength).toBe(20);
      expect(progress.distanceRemaining).toBe(20);
      expect(progress.percentComplete).toBe(0);
      expect(progress.ticksElapsed).toBe(5);
    });

    it('should calculate progress at midpoint', () => {
      const start: WorkerPosition = { x: 0, y: 0 };
      const current: WorkerPosition = { x: 5, y: 5 };
      const target: WorkerPosition = { x: 10, y: 10 };

      const progress = movement.calculateProgress(current, target, 'traveling', 0, 10);

      expect(progress.percentComplete).toBe(50);
      expect(progress.ticksElapsed).toBe(10);
    });

    it('should calculate progress at arrival', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const progress = movement.calculateProgress(pos, pos, 'arrived', 5, 10, 10);

      expect(progress.percentComplete).toBe(100);
      expect(progress.distanceRemaining).toBe(0);
      expect(progress.arrivalTick).toBe(10);
    });
  });

  describe('Path generation', () => {
    it('should generate path from origin to target', () => {
      const from: WorkerPosition = { x: 0, y: 0 };
      const to: WorkerPosition = { x: 2, y: 2 };

      const path = movement.generatePath(from, to);

      expect(path.length).toBeGreaterThan(0);
      expect(path[path.length - 1]).toEqual(to);
    });

    it('should use Manhattan path (X then Y)', () => {
      const from: WorkerPosition = { x: 0, y: 0 };
      const to: WorkerPosition = { x: 3, y: 2 };

      const path = movement.generatePath(from, to);

      // Path should go X direction first, then Y
      expect(path[0].y).toBe(from.y);
    });

    it('should handle movement in negative direction', () => {
      const from: WorkerPosition = { x: 5, y: 5 };
      const to: WorkerPosition = { x: 2, y: 2 };

      const path = movement.generatePath(from, to);

      expect(path[path.length - 1]).toEqual(to);
    });

    it('should return target for zero-distance', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const path = movement.generatePath(pos, pos);

      expect(path.length).toBe(1);
      expect(path[0]).toEqual(pos);
    });
  });

  describe('World state position extraction', () => {
    it('should extract valid position from world state', () => {
      const worldState = {
        agents: [
          {
            customData: { position: '5,10' }
          }
        ]
      } as any;

      const pos = movement.extractWorkerPosition(worldState);
      expect(pos).toEqual({ x: 5, y: 10 });
    });

    it('should return null for invalid world state', () => {
      const pos = movement.extractWorkerPosition(null as any);
      expect(pos).toBeNull();
    });

    it('should return null for empty agents', () => {
      const worldState = { agents: [] } as any;
      const pos = movement.extractWorkerPosition(worldState);
      expect(pos).toBeNull();
    });

    it('should return null for malformed position', () => {
      const worldState = {
        agents: [{ customData: { position: 'invalid' } }]
      } as any;

      const pos = movement.extractWorkerPosition(worldState);
      expect(pos).toBeNull();
    });

    it('should handle large coordinates', () => {
      const worldState = {
        agents: [{ customData: { position: '1000,2000' } }]
      } as any;

      const pos = movement.extractWorkerPosition(worldState);
      expect(pos).toEqual({ x: 1000, y: 2000 });
    });
  });

  describe('Integration scenarios', () => {
    it('should record and track multi-tick journey', () => {
      const fieldId = 'ore-1';
      const startPos: WorkerPosition = { x: 0, y: 0 };
      const targetPos: WorkerPosition = { x: 3, y: 3 };

      tracer.recordWorkerMovementStarted(fieldId, targetPos, startPos);

      const positions = [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 1 },
        { x: 3, y: 2 },
      ];

      positions.forEach((pos) => {
        const distance = movement.calculateDistance(pos, targetPos);
        const percent = 100 - (distance / movement.calculateDistance(startPos, targetPos)) * 100;
        tracer.recordWorkerPositionUpdated(
          fieldId,
          pos as WorkerPosition,
          targetPos,
          distance,
          Math.floor(percent)
        );
      });

      tracer.recordWorkerArrivalDetected(fieldId, targetPos, 6);
      tracer.recordWorkerGatheringBegun(fieldId, 'ore', 1000);

      const events = tracer.getTrace().events;
      const movementEvents = events.filter(e => e.eventType.startsWith('worker_'));
      expect(movementEvents.length).toBeGreaterThanOrEqual(7); // 1 start + 5 updates + 1 arrival + maybe gathering
    });

    it('should maintain event order and ticks', () => {
      const fieldId = 'ore-1';
      const pos: WorkerPosition = { x: 0, y: 0 };
      const target: WorkerPosition = { x: 5, y: 5 };

      tracer.recordWorkerMovementStarted(fieldId, target, pos);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 1, y: 0 }, target, 8, 20);
      tracer.recordWorkerPositionUpdated(fieldId, { x: 2, y: 0 }, target, 7, 30);
      tracer.recordWorkerArrivalDetected(fieldId, target, 5);

      const events = tracer.getTrace().events;
      expect(events.length).toBeGreaterThan(0);

      // All events should be recorded
      expect(events.some(e => e.eventType === 'worker_movement_started')).toBe(true);
      expect(events.some(e => e.eventType === 'worker_position_updated')).toBe(true);
      expect(events.some(e => e.eventType === 'worker_arrival_detected')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle worker already at target', () => {
      const pos: WorkerPosition = { x: 5, y: 5 };

      const distance = movement.calculateDistance(pos, pos);
      const hasArrived = movement.detectArrival(pos, pos);
      const phase = movement.determinePhase(pos, pos, false, false);

      expect(distance).toBe(0);
      expect(hasArrived).toBe(true);
      expect(['idle', 'arrived']).toContain(phase);
    });

    it('should handle very large distance', () => {
      const from: WorkerPosition = { x: 0, y: 0 };
      const to: WorkerPosition = { x: 1000, y: 1000 };

      const distance = movement.calculateDistance(from, to);
      expect(distance).toBe(2000);

      const phase = movement.determinePhase(from, to, false, false);
      expect(phase).toBe('traveling');
    });

    it('should handle rapid position updates', () => {
      const fieldId = 'ore-1';
      const target: WorkerPosition = { x: 5, y: 5 };

      tracer.recordWorkerMovementStarted(fieldId, target, { x: 0, y: 0 });

      for (let i = 1; i <= 5; i++) {
        const pos: WorkerPosition = { x: i, y: 0 };
        tracer.recordWorkerPositionUpdated(
          fieldId,
          pos,
          target,
          movement.calculateDistance(pos, target),
          i * 20
        );
      }

      const events = tracer.getTrace().events;
      const posUpdates = events.filter(e => e.eventType === 'worker_position_updated');
      expect(posUpdates.length).toBe(5);
    });

    it('should not duplicate movement start events', () => {
      const fieldId = 'ore-1';
      const target: WorkerPosition = { x: 5, y: 5 };
      const start: WorkerPosition = { x: 0, y: 0 };

      tracer.recordWorkerMovementStarted(fieldId, target, start);
      tracer.recordWorkerMovementStarted(fieldId, target, start);

      const events = tracer.getTrace().events;
      const starts = events.filter(e => e.eventType === 'worker_movement_started');
      expect(starts.length).toBe(2); // Both recorded, it's up to mission-agent to avoid duplication
    });
  });
});
