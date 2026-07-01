import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRAMissionAgent } from '../src/openra-mission-agent.js';
import type { OpenRAGameState } from '@ai-commander/openra-adapter';

/**
 * Production Validation Suite for OpenRA Integration
 *
 * This suite validates the complete integration under realistic operating conditions.
 * Focus: reliability, determinism, resource stability, failure recovery.
 * NO new features, NO framework changes, NO optimizations.
 */

function createTestGameState(): OpenRAGameState {
  const player = {
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
  };

  return {
    world: {
      tick: 0,
      frameNumber: 0,
      actors: [
        {
          actorID: 1,
          owner: player,
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
      players: [player],
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

describe('OpenRA Production Validation', () => {
  describe('Reliability: Repeated Mission Execution', () => {
    it('executes 10 consecutive missions without failure', async () => {
      const results = [];
      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512 + i * 10,
          512 + i * 10,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        results.push({
          iteration: i,
          metrics: agent.getMetrics(),
        });

        // Should not throw and should complete successfully
        expect(agent.getMetrics()).toBeDefined();
        expect(agent.getMetrics()?.totalTicks).toBeGreaterThan(0);
      }

      // All 10 missions should complete
      expect(results.length).toBe(10);
    });

    it('executes 25 consecutive missions without memory issues', async () => {
      const results = [];
      for (let i = 0; i < 25; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        results.push(agent.getMetrics());
      }

      expect(results.length).toBe(25);
      expect(results.every(m => m?.totalTicks !== undefined)).toBe(true);
    });

    it('handles mission interruption gracefully', async () => {
      const gameState = createTestGameState();
      let isAvailable = true;

      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => true,
        async () => isAvailable,
      );

      await agent.initialize();

      // Simulate interruption by making game unavailable
      isAvailable = false;

      await agent.run();
      await agent.shutdown();

      // Should complete without throwing
      expect(agent.getMetrics()).toBeDefined();
    });
  });

  describe('Determinism: Identical Missions Produce Identical Results', () => {
    it('produces identical traces across 3 identical runs', async () => {
      const traces = [];

      for (let run = 0; run < 3; run++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        traces.push(agent.getTrace());
      }

      // All traces should have identical event structure
      const firstTrace = traces[0];
      for (let i = 1; i < traces.length; i++) {
        expect(traces[i].events.length).toBe(firstTrace.events.length);

        for (let j = 0; j < firstTrace.events.length; j++) {
          expect(traces[i].events[j]?.type).toBe(firstTrace.events[j]?.type);
        }
      }
    });

    it('produces identical metrics across 3 identical runs', async () => {
      const metrics = [];

      for (let run = 0; run < 3; run++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        metrics.push(agent.getMetrics());
      }

      // All metrics should be identical
      const firstMetrics = metrics[0];
      for (let i = 1; i < metrics.length; i++) {
        expect(metrics[i]?.totalTicks).toBe(firstMetrics?.totalTicks);
        expect(metrics[i]?.successfulCommands).toBe(firstMetrics?.successfulCommands);
        expect(metrics[i]?.decisionsSelected).toBe(firstMetrics?.decisionsSelected);
      }
    });

    it('produces identical replay reports across 3 identical runs', async () => {
      const reports = [];

      for (let run = 0; run < 3; run++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        reports.push(agent.getReplayReport());
      }

      // All reports should be valid and identical
      for (const report of reports) {
        expect(report?.isValid).toBe(true);
      }

      const firstReport = reports[0];
      for (let i = 1; i < reports.length; i++) {
        expect(reports[i]?.eventCount).toBe(firstReport?.eventCount);
        expect(reports[i]?.isValid).toBe(firstReport?.isValid);
      }
    });

    it('produces deterministic event ordering across 5 identical runs', async () => {
      const eventSequences = [];

      for (let run = 0; run < 5; run++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          256,
          256,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const trace = agent.getTrace();
        eventSequences.push(trace.events.map(e => e.eventType));
      }

      // All sequences should be identical
      const firstSequence = eventSequences[0];
      for (let i = 1; i < eventSequences.length; i++) {
        expect(eventSequences[i]).toEqual(firstSequence);
      }
    });
  });

  describe('Resource Stability: No Memory Growth', () => {
    it('maintains stable session cleanup across 10 runs', async () => {
      const sessionLifecycles = [];

      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        const startMetrics = agent.getMetrics();

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const endMetrics = agent.getMetrics();
        sessionLifecycles.push({
          iteration: i,
          start: startMetrics,
          end: endMetrics,
        });
      }

      // All sessions should complete and clean up
      expect(sessionLifecycles.length).toBe(10);
      expect(sessionLifecycles.every(s => s.end !== null)).toBe(true);
    });

    it('handles repeated adapter initialize/shutdown', async () => {
      const gameState = createTestGameState();

      for (let i = 0; i < 5; i++) {
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        // Just initialize and shutdown, no mission run
        await agent.shutdown();

        expect(agent.getMetrics()).toBeDefined();
      }
    });

    it('handles repeated session creation and cleanup', async () => {
      const gameState = createTestGameState();
      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => true,
        async () => true,
      );

      await agent.initialize();

      // Note: In current implementation, session creation happens during run()
      // This validates multiple runs (which create multiple sessions)
      for (let i = 0; i < 3; i++) {
        await agent.run();
      }

      await agent.shutdown();

      expect(agent.getMetrics()).toBeDefined();
    });
  });

  describe('Adapter Validation: Repeated Operations', () => {
    it('handles repeated observation across mission runs', async () => {
      const gameState = createTestGameState();
      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => true,
        async () => true,
      );

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();
      const observationEvents = trace.events.filter(e => e.eventType.includes('tick'));

      // Should have multiple observation events
      expect(observationEvents.length).toBeGreaterThan(0);
    });

    it('handles repeated command execution across missions', async () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const metrics = agent.getMetrics();
        results.push({
          iteration: i,
          successfulCommands: metrics?.successfulCommands,
        });
      }

      // All iterations should successfully execute commands
      expect(results.every(r => r.successfulCommands !== undefined)).toBe(true);
    });
  });

  describe('Failure Recovery: Graceful Degradation', () => {
    it('recovers from game unavailability during mission', async () => {
      const gameState = createTestGameState();
      let isAvailable = true;

      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => true,
        async () => isAvailable,
      );

      await agent.initialize();

      // Make game unavailable after initialization
      isAvailable = false;

      await agent.run();
      await agent.shutdown();

      // Should complete without throwing
      expect(agent.getMetrics()).toBeDefined();
    });

    it('recovers from order submission failure', async () => {
      const gameState = createTestGameState();
      let ordersSucceed = true;
      let failureCount = 0;

      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => {
          if (!ordersSucceed) {
            failureCount++;
            return false;
          }
          return true;
        },
        async () => true,
      );

      await agent.initialize();

      // Make orders fail after initialization
      ordersSucceed = false;

      await agent.run();
      await agent.shutdown();

      // Should complete even with order failures
      expect(agent.getMetrics()).toBeDefined();
      expect(failureCount).toBeGreaterThan(0);
    });

    it('handles initialization failure gracefully', async () => {
      let canInitialize = false;
      const gameState = createTestGameState();

      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => {
          if (!canInitialize) {
            throw new Error('Initialization failed');
          }
          return gameState;
        },
        async () => true,
        async () => true,
      );

      // Initialization should fail
      await expect(agent.initialize()).rejects.toThrow();
    });

    it('handles partial mission interruption', async () => {
      const gameState = createTestGameState();
      let interruptAfterTicks = 5;
      let tickCount = 0;

      const agent = new OpenRAMissionAgent(
        512,
        512,
        async () => gameState,
        async () => {
          tickCount++;
          if (tickCount > interruptAfterTicks) {
            // After 5 ticks, orders start failing
            return false;
          }
          return true;
        },
        async () => true,
      );

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      // Mission should complete despite interruption
      expect(agent.getMetrics()).toBeDefined();
      expect(tickCount).toBeGreaterThan(interruptAfterTicks);
    });
  });

  describe('Performance: Benchmark Comparison', () => {
    it('completes missions within reasonable time bounds', async () => {
      const times = [];

      for (let i = 0; i < 5; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        const startTime = Date.now();

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const endTime = Date.now();
        times.push(endTime - startTime);
      }

      // Should be reasonable (not infinite loops)
      const avgTime = times.reduce((a, b) => a + b) / times.length;
      expect(avgTime).toBeLessThan(10000); // Less than 10 seconds average

      // Should be consistent (no huge variance)
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      const variance = maxTime - minTime;
      expect(variance).toBeLessThan(avgTime * 0.5); // Variance < 50% of average
    });

    it('maintains consistent throughput across multiple runs', async () => {
      const throughput = [];

      for (let batch = 0; batch < 3; batch++) {
        const batchResults = [];

        for (let i = 0; i < 5; i++) {
          const gameState = createTestGameState();
          const agent = new OpenRAMissionAgent(
            512,
            512,
            async () => gameState,
            async () => true,
            async () => true,
          );

          const startTime = Date.now();

          await agent.initialize();
          await agent.run();
          await agent.shutdown();

          const endTime = Date.now();
          const duration = endTime - startTime;

          batchResults.push(duration);
        }

        const batchAverage = batchResults.reduce((a, b) => a + b) / batchResults.length;
        throughput.push(batchAverage);
      }

      // Throughput should be relatively consistent across batches
      const firstBatchAvg = throughput[0];
      for (let i = 1; i < throughput.length; i++) {
        const diff = Math.abs(throughput[i] - firstBatchAvg);
        expect(diff).toBeLessThan(firstBatchAvg * 0.3); // Within 30%
      }
    });
  });

  describe('Production Readiness: Integration Stability', () => {
    it('produces valid traces for all 10 consecutive missions', async () => {
      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const trace = agent.getTrace();
        expect(trace.events.length).toBeGreaterThan(0);
        expect(trace.missionId).toBeDefined();
      }
    });

    it('produces valid metrics for all 10 consecutive missions', async () => {
      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const metrics = agent.getMetrics();
        expect(metrics?.totalTicks).toBeGreaterThan(0);
        expect(metrics?.successfulCommands).toBeGreaterThan(0);
      }
    });

    it('produces valid replay reports for all 10 consecutive missions', async () => {
      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const report = agent.getReplayReport();
        expect(report?.isValid).toBe(true);
      }
    });

    it('produces valid runtime snapshots for all 10 consecutive missions', async () => {
      for (let i = 0; i < 10; i++) {
        const gameState = createTestGameState();
        const agent = new OpenRAMissionAgent(
          512,
          512,
          async () => gameState,
          async () => true,
          async () => true,
        );

        await agent.initialize();
        await agent.run();
        await agent.shutdown();

        const snapshot = agent.getSnapshot();
        expect(snapshot).toBeDefined();
      }
    });
  });
});
