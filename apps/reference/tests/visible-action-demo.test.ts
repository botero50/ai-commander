import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VisibleActionDemo } from '../src/visible-action-demo.ts';
import type { IntegrationHostCallbacks } from '../src/game adapter-integration-host.ts';
import type { OpenRAGameState } from '@ai-commander/openra-adapter';

describe('Visible Action Demo', () => {
  let demo: VisibleActionDemo;
  let mockCallbacks: IntegrationHostCallbacks;
  let mockGameStateInitial: OpenRAGameState;
  let mockGameStateFinal: OpenRAGameState;

  beforeEach(() => {
    demo = new VisibleActionDemo();

    // Initial game state: unit at (512, 512)
    mockGameStateInitial = {
      world: {
        tick: 100,
        frameNumber: 100,
        actors: [
          {
            actorID: 1,
            owner: {
              index: 0,
              clientIndex: 0,
              playerName: 'Player',
              color: 0xff00ff00,
              faction: 'gdi',
              isBot: false,
              isObserver: false,
              isAlive: true,
              teamId: -1,
              cash: 5000,
              resources: 2500,
            },
            info: {
              name: 'Infantry',
              traits: ['Buildable', 'Selectable', 'Health'],
            },
            location: { x: 512, y: 512 },
            centerLocation: { x: 1024, y: 1024 },
            health: 100,
            maxHealth: 100,
            isIdle: false,
          },
        ],
        players: [
          {
            index: 0,
            clientIndex: 0,
            playerName: 'Player',
            color: 0xff00ff00,
            faction: 'gdi',
            isBot: false,
            isObserver: false,
            isAlive: true,
            teamId: -1,
            cash: 5000,
            resources: 2500,
          },
        ],
        map: {
          name: 'TestMap',
          bounds: { left: 0, top: 0, width: 1024, height: 1024 },
          terrain: { tileset: 'DESERT' },
        },
      },
      orderManager: { orderQueue: [], localFrameNumber: 100 },
      modData: { tileset: new Map([['DESERT', { id: 'DESERT', name: 'Desert' }]]) },
    };

    // Final game state: unit moved to (612, 512) - moved 100 pixels right
    mockGameStateFinal = {
      ...mockGameStateInitial,
      world: {
        ...mockGameStateInitial.world,
        tick: 105,
        frameNumber: 105,
        actors: [
          {
            ...mockGameStateInitial.world.actors[0],
            location: { x: 612, y: 512 }, // Moved 100 pixels right
            centerLocation: { x: 1224, y: 1024 },
          },
        ],
      },
      orderManager: { orderQueue: [], localFrameNumber: 105 },
    };

    let callCount = 0;
    mockCallbacks = {
      gameStateAccessor: vi.fn().mockImplementation(() => {
        callCount++;
        // First call returns initial state, subsequent calls return final state
        return Promise.resolve(callCount === 1 ? mockGameStateInitial : mockGameStateFinal);
      }),
      orderSubmitter: vi.fn().mockResolvedValue(true),
      stateChecker: vi.fn().mockResolvedValue(true),
    };
  });

  describe('captureBeforeState', () => {
    it('captures initial game state', async () => {
      const result = await demo.captureBeforeState(mockCallbacks);
      expect(result).toBe(true);

      const evidence = demo.getEvidence();
      expect(evidence.some((e) => e.stage === 'CAPTURE_BEFORE')).toBe(true);
    });

    it('identifies target unit from game state', async () => {
      await demo.captureBeforeState(mockCallbacks);

      const evidence = demo.getEvidence();
      const captureEvent = evidence.find((e) => e.stage === 'CAPTURE_BEFORE' && e.data);
      expect(captureEvent?.data?.firstActorId).toBe(1);
      expect(captureEvent?.data?.actorName).toBe('Infantry');
    });

    it('records unit location in before state', async () => {
      await demo.captureBeforeState(mockCallbacks);

      const evidence = demo.getEvidence();
      const captureEvent = evidence.find((e) => e.stage === 'CAPTURE_BEFORE' && e.data);
      expect(captureEvent?.data?.location).toEqual({ x: 512, y: 512 });
    });

    it('returns false when no actors in game', async () => {
      mockCallbacks.gameStateAccessor = vi.fn().mockResolvedValue({
        ...mockGameStateInitial,
        world: {
          ...mockGameStateInitial.world,
          actors: [],
        },
      });

      const result = await demo.captureBeforeState(mockCallbacks);
      expect(result).toBe(false);
    });

    it('returns false on fetch error', async () => {
      mockCallbacks.gameStateAccessor = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await demo.captureBeforeState(mockCallbacks);
      expect(result).toBe(false);
    });
  });

  describe('issueMoveCommand', () => {
    it('issues move command for identified unit', async () => {
      await demo.captureBeforeState(mockCallbacks);
      const result = await demo.issueMoveCommand(mockCallbacks);

      expect(result).toBe(true);
      expect(mockCallbacks.orderSubmitter).toHaveBeenCalled();
    });

    it('submits move order with correct format', async () => {
      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);

      const callArgs = (mockCallbacks.orderSubmitter as any).mock.calls[0][0];
      expect(callArgs.orderName).toBe('Move');
      expect(callArgs.targetPosition).toBeDefined();
      expect(callArgs.playerIndex).toBe(0);
    });

    it('returns false when no target unit', async () => {
      const result = await demo.issueMoveCommand(mockCallbacks);
      expect(result).toBe(false);
    });

    it('returns false on order submission error', async () => {
      await demo.captureBeforeState(mockCallbacks);
      mockCallbacks.orderSubmitter = vi.fn().mockRejectedValue(new Error('Submission failed'));

      const result = await demo.issueMoveCommand(mockCallbacks);
      expect(result).toBe(false);
    });

    it('returns false when order submission returns false', async () => {
      await demo.captureBeforeState(mockCallbacks);
      mockCallbacks.orderSubmitter = vi.fn().mockResolvedValue(false);

      const result = await demo.issueMoveCommand(mockCallbacks);
      expect(result).toBe(false);
    });
  });

  describe('waitForGameTicks', () => {
    it('waits specified number of ticks', async () => {
      const startTime = Date.now();
      await demo.waitForGameTicks(5);
      const elapsed = Date.now() - startTime;

      // 5 ticks * 40ms per tick = 200ms
      expect(elapsed).toBeGreaterThanOrEqual(200);
      expect(elapsed).toBeLessThan(300);
    });

    it('logs wait event', async () => {
      await demo.waitForGameTicks(2);

      const evidence = demo.getEvidence();
      expect(evidence.some((e) => e.stage === 'WAIT_TICKS')).toBe(true);
    });
  });

  describe('captureAfterState', () => {
    it('captures final game state', async () => {
      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);
      await demo.waitForGameTicks(1);

      const result = await demo.captureAfterState(mockCallbacks);
      expect(result).toBe(true);
    });

    it('updates unit location in after state', async () => {
      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);
      await demo.waitForGameTicks(1);
      await demo.captureAfterState(mockCallbacks);

      const evidence = demo.getEvidence();
      const afterEvent = evidence.find((e) => e.stage === 'CAPTURE_AFTER' && e.data);
      expect(afterEvent?.data?.location).toEqual({ x: 612, y: 512 });
    });

    it('returns false when unit not found in final state', async () => {
      await demo.captureBeforeState(mockCallbacks);

      mockCallbacks.gameStateAccessor = vi.fn().mockResolvedValue({
        ...mockGameStateFinal,
        world: {
          ...mockGameStateFinal.world,
          actors: [], // Unit disappeared
        },
      });

      const result = await demo.captureAfterState(mockCallbacks);
      expect(result).toBe(false);
    });
  });

  describe('detectVisibleChange', () => {
    it('detects unit movement', async () => {
      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);
      await demo.waitForGameTicks(1);
      await demo.captureAfterState(mockCallbacks);

      const result = demo.detectVisibleChange();

      expect(result.changed).toBe(true);
      expect(result.movedDistance).toBeGreaterThan(0);
      expect(result.locationChange).toBeDefined();
    });

    it('calculates movement distance correctly', async () => {
      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);
      await demo.waitForGameTicks(1);
      await demo.captureAfterState(mockCallbacks);

      const result = demo.detectVisibleChange();

      // Unit moved from (512, 512) to (612, 512) = 100 pixels
      expect(result.movedDistance).toBeCloseTo(100, 1);
    });

    it('returns false when no movement detected', async () => {
      // Don't move the unit - return same location
      mockCallbacks.gameStateAccessor = vi.fn().mockResolvedValue(mockGameStateInitial);

      await demo.captureBeforeState(mockCallbacks);
      await demo.issueMoveCommand(mockCallbacks);
      await demo.captureAfterState(mockCallbacks);

      const result = demo.detectVisibleChange();

      expect(result.changed).toBe(false);
      expect(result.movedDistance).toBe(0);
    });

    it('detects health changes', async () => {
      // Create game state where unit health decreased
      const damageState: OpenRAGameState = {
        ...mockGameStateFinal,
        world: {
          ...mockGameStateFinal.world,
          actors: [
            {
              ...mockGameStateFinal.world.actors[0],
              health: 75, // Health decreased
            },
          ],
        },
      };

      mockCallbacks.gameStateAccessor = vi.fn().mockResolvedValueOnce(mockGameStateInitial).mockResolvedValueOnce(damageState);

      await demo.captureBeforeState(mockCallbacks);
      await demo.captureAfterState(mockCallbacks);

      const result = demo.detectVisibleChange();

      expect(result.changed).toBe(true);
      expect(result.healthChange?.before).toBe(100);
      expect(result.healthChange?.after).toBe(75);
    });

    it('handles missing before/after states gracefully', () => {
      const result = demo.detectVisibleChange();

      expect(result.changed).toBe(false);
      expect(result.movedDistance).toBe(0);
    });
  });

  describe('runDemonstration', () => {
    it('completes full demonstration successfully', async () => {
      const result = await demo.runDemonstration(mockCallbacks);

      expect(result.success).toBe(true);
      expect(result.changed).toBe(true);
      expect(result.beforeState).toBeDefined();
      expect(result.afterState).toBeDefined();
    });

    it('collects evidence throughout demonstration', async () => {
      await demo.runDemonstration(mockCallbacks);

      const evidence = demo.getEvidence();
      expect(evidence.length).toBeGreaterThan(0);
      expect(evidence.some((e) => e.stage === 'CAPTURE_BEFORE')).toBe(true);
      expect(evidence.some((e) => e.stage === 'ISSUE_COMMAND')).toBe(true);
      expect(evidence.some((e) => e.stage === 'CAPTURE_AFTER')).toBe(true);
      expect(evidence.some((e) => e.stage === 'DETECT_CHANGE')).toBe(true);
    });

    it('returns failure on capture error', async () => {
      mockCallbacks.gameStateAccessor = vi.fn().mockRejectedValue(new Error('Connection lost'));

      const result = await demo.runDemonstration(mockCallbacks);

      expect(result.success).toBe(false);
    });

    it('returns failure on command submission error', async () => {
      mockCallbacks.orderSubmitter = vi.fn().mockRejectedValue(new Error('Command failed'));

      const result = await demo.runDemonstration(mockCallbacks);

      expect(result.success).toBe(false);
    });
  });

  describe('generateEvidenceReport', () => {
    it('generates report after demonstration', async () => {
      await demo.runDemonstration(mockCallbacks);

      const report = demo.generateEvidenceReport();

      expect(report).toContain('Evidence Report');
      expect(report).toContain('Timeline');
      expect(report).toContain('Before/After');
      expect(report).toContain('Movement');
    });

    it('includes all evidence in report', async () => {
      await demo.runDemonstration(mockCallbacks);

      const report = demo.generateEvidenceReport();

      expect(report).toContain('CAPTURE_BEFORE');
      expect(report).toContain('ISSUE_COMMAND');
      expect(report).toContain('WAIT_TICKS');
      expect(report).toContain('CAPTURE_AFTER');
    });

    it('shows before/after state comparison', async () => {
      await demo.runDemonstration(mockCallbacks);

      const report = demo.generateEvidenceReport();

      expect(report).toContain('Before State');
      expect(report).toContain('After State');
      expect(report).toContain('512');
      expect(report).toContain('612');
    });

    it('verifies all layers in report', async () => {
      await demo.runDemonstration(mockCallbacks);

      const report = demo.generateEvidenceReport();

      expect(report).toContain('game adapter Service');
      expect(report).toContain('Integration Host');
      expect(report).toContain('Adapter');
      expect(report).toContain('Game Engine');
    });
  });
});
