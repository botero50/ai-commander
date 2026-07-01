import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRAMissionAgent } from '../src/openra-mission-agent.js';
import type { OpenRAGameState } from '@ai-commander/openra-adapter';

/**
 * Test helpers
 */
function createMockGameStateAccessor(gameState: OpenRAGameState) {
  return async () => gameState;
}

function createMockOrderSubmitter() {
  return async () => true;
}

function createMockStateChecker(isAvailable: boolean = true) {
  return async () => isAvailable;
}

function createTestGameState(): OpenRAGameState {
  return {
    world: {
      tick: 0,
      frameNumber: 0,
      actors: [
        {
          id: 'actor-1',
          name: 'Infantry',
          owner: 0,
          type: 'infantry',
          position: { x: 512, y: 512 },
          health: 100,
          maxHealth: 100,
        },
      ],
      players: [
        {
          index: 0,
          clientIndex: 0,
          playerName: 'Player',
          color: 0xFF00FF00,
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
        bounds: {
          left: 0,
          top: 0,
          width: 1024,
          height: 1024,
        },
        terrain: {
          tileset: 'DESERT',
        },
      },
    },
    orderManager: {
      orderQueue: [],
      localFrameNumber: 0,
    },
    modData: {
      tileset: new Map([['DESERT', { id: 'DESERT', name: 'Desert' }]]),
    },
  };
}

describe('OpenRAMissionAgent', () => {
  let gameState: OpenRAGameState;

  beforeEach(() => {
    gameState = createTestGameState();
  });

  describe('Lifecycle', () => {
    it('initializes successfully', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      // Should not throw
    });

    it('initializes and shuts down cleanly', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.shutdown();
      // Should not throw
    });

    it('rejects run before initialize', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await expect(agent.run()).rejects.toThrow('not initialized');
    });
  });

  describe('Mission Execution', () => {
    it('completes mission successfully', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.ticksExecuted).toBeGreaterThan(0);
    });

    it('completes mission with different target coordinates', async () => {
      const agent = new OpenRAMissionAgent(256, 256, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getMetrics();
      expect(metrics?.ticksExecuted).toBeGreaterThan(0);
    });

    it('handles mission timeout gracefully', async () => {
      const agent = new OpenRAMissionAgent(10000, 10000, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      // Should complete without throwing, even if goal not reached
      expect(agent.getMetrics()).toBeDefined();
    });
  });

  describe('Determinism', () => {
    it('produces identical traces on repeated execution', async () => {
      const runMission = async () => {
        const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
        return agent.getTrace();
      };

      const trace1 = await runMission();
      const trace2 = await runMission();

      // Check trace lengths match
      expect(trace1.events.length).toBe(trace2.events.length);

      // Check event types match in same order
      for (let i = 0; i < trace1.events.length; i++) {
        expect(trace1.events[i]?.type).toBe(trace2.events[i]?.type);
      }
    });

    it('produces identical metrics on repeated execution', async () => {
      const runMission = async () => {
        const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
        return agent.getMetrics();
      };

      const metrics1 = await runMission();
      const metrics2 = await runMission();

      expect(metrics1?.ticksExecuted).toBe(metrics2?.ticksExecuted);
      expect(metrics1?.commandsExecuted).toBe(metrics2?.commandsExecuted);
      expect(metrics1?.decisionsExecuted).toBe(metrics2?.decisionsExecuted);
    });

    it('produces consistent metrics across multiple runs', async () => {
      const results = [];
      for (let i = 0; i < 3; i++) {
        const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
        results.push(agent.getMetrics());
      }

      // All metrics should be identical
      const first = results[0];
      for (let i = 1; i < results.length; i++) {
        expect(results[i]?.ticksExecuted).toBe(first?.ticksExecuted);
        expect(results[i]?.commandsExecuted).toBe(first?.commandsExecuted);
      }
    });
  });

  describe('Component Integration', () => {
    it('exercises planner and generates plan', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const planEvents = trace.events.filter(e => e.type === 'PlanGenerated');
      expect(planEvents.length).toBeGreaterThan(0);
    });

    it('exercises decision engine and selects steps', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const decisionEvents = trace.events.filter(e => e.type === 'DecisionSelected');
      expect(decisionEvents.length).toBeGreaterThan(0);
    });

    it('executes commands and updates world state', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getMetrics();
      expect(metrics?.commandsExecuted).toBeGreaterThan(0);
    });

    it('generates correct plan structure', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const planEvents = trace.events.filter(e => e.type === 'PlanGenerated');
      expect(planEvents.length).toBeGreaterThan(0);

      // Plan should have steps (at least x and y movement)
      const firstPlanEvent = planEvents[0] as any;
      if (firstPlanEvent?.data?.plan?.steps) {
        expect(firstPlanEvent.data.plan.steps.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('Observability', () => {
    it('generates execution trace with all required events', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const eventTypes = trace.events.map(e => e.type);

      // Check for required events
      expect(eventTypes).toContain('MissionStarted');
      expect(eventTypes).toContain('MissionInitialized');
      expect(eventTypes).toContain('MissionCompleted');
    });

    it('produces valid trace formatting', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const traceText = agent.formatTrace(false);
      expect(typeof traceText).toBe('string');
      expect(traceText.length).toBeGreaterThan(0);
    });

    it('produces valid JSON trace output', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const traceJson = agent.formatTrace(true);
      expect(typeof traceJson).toBe('string');
      const parsed = JSON.parse(traceJson);
      expect(parsed.events).toBeDefined();
      expect(Array.isArray(parsed.events)).toBe(true);
    });

    it('collects runtime metrics', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metrics = agent.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.ticksExecuted).toBeGreaterThan(0);
      expect(metrics?.decisionsExecuted).toBeGreaterThanOrEqual(0);
      expect(metrics?.commandsExecuted).toBeGreaterThanOrEqual(0);
    });

    it('produces valid metrics formatting', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metricsText = agent.formatMetrics(false);
      expect(typeof metricsText).toBe('string');
      expect(metricsText.length).toBeGreaterThan(0);
    });

    it('produces valid JSON metrics output', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const metricsJson = agent.formatMetrics(true);
      expect(typeof metricsJson).toBe('string');
      const parsed = JSON.parse(metricsJson);
      expect(parsed.ticksExecuted).toBeDefined();
      expect(parsed.commandsExecuted).toBeDefined();
    });

    it('validates replay report', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const replayReport = agent.getReplayReport();
      expect(replayReport).toBeDefined();
      expect(replayReport?.isValid).toBe(true);
    });

    it('captures runtime snapshot', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const snapshot = agent.getSnapshot();
      expect(snapshot).toBeDefined();
      expect(snapshot.metadata.targetX).toBe(512);
      expect(snapshot.metadata.targetY).toBe(512);
    });

    it('produces valid snapshot formatting', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const snapshotText = agent.formatSnapshot(false);
      expect(typeof snapshotText).toBe('string');
      expect(snapshotText.length).toBeGreaterThan(0);
    });

    it('produces valid JSON snapshot output', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const snapshotJson = agent.formatSnapshot(true);
      expect(typeof snapshotJson).toBe('string');
      const parsed = JSON.parse(snapshotJson);
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('handles unavailable game gracefully', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker(false));

      // Should not throw even if game unavailable
      await agent.initialize();
    });

    it('handles order submission failure gracefully', async () => {
      const failingSubmitter = async () => false;
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), failingSubmitter, createMockStateChecker());

      await agent.initialize();
      // Should continue even if orders fail
      await agent.run();
      await agent.shutdown();
    });
  });

  describe('Full Stack Integration', () => {
    it('exercises entire stack: observe → plan → decide → execute', async () => {
      const agent = new OpenRAMissionAgent(512, 512, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const eventTypes = trace.events.map(e => e.type);

      // Verify all components were exercised
      expect(eventTypes).toContain('PlannerInvoked');
      expect(eventTypes).toContain('PlanGenerated');
      expect(eventTypes).toContain('DecisionEngineInvoked');
      expect(eventTypes).toContain('DecisionSelected');
    });

    it('maintains determinism across full execution cycle', async () => {
      const firstRun = async () => {
        const agent = new OpenRAMissionAgent(300, 300, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
        return {
          trace: agent.getTrace(),
          metrics: agent.getMetrics(),
        };
      };

      const secondRun = async () => {
        const agent = new OpenRAMissionAgent(300, 300, createMockGameStateAccessor(gameState), createMockOrderSubmitter(), createMockStateChecker());
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
        return {
          trace: agent.getTrace(),
          metrics: agent.getMetrics(),
        };
      };

      const result1 = await firstRun();
      const result2 = await secondRun();

      expect(result1.metrics?.ticksExecuted).toBe(result2.metrics?.ticksExecuted);
      expect(result1.metrics?.commandsExecuted).toBe(result2.metrics?.commandsExecuted);
      expect(result1.trace.events.length).toBe(result2.trace.events.length);
    });
  });
});
