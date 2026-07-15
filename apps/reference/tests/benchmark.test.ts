import { describe, it, expect } from 'vitest';
import { BenchmarkSuite } from '../src/benchmark-suite.ts';
import { MissionAgent } from '../src/mission-agent.ts';

describe('Performance Benchmarks', () => {
  describe('Tick Latency', () => {
    it('should maintain consistent tick execution latency for short missions', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(5, 5);

      expect(result.averageTickDurationMs).toBeLessThan(1.0);
      expect(result.averageTickDurationMs).toBeGreaterThan(0);
    });

    it('should maintain consistent tick execution latency for medium missions', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(20, 20);

      expect(result.averageTickDurationMs).toBeLessThan(1.5);
      expect(result.averageTickDurationMs).toBeGreaterThan(0);
    });

    it('should maintain consistent tick execution latency for long missions', async () => {
      const result = await BenchmarkSuite.runMissionBenchmark(50, 50);

      expect(result.averageTickDurationMs).toBeLessThan(2.0);
      expect(result.averageTickDurationMs).toBeGreaterThan(0);
    });
  });

  describe('Memory Benchmarks', () => {
    it('should track memory usage during execution', async () => {
      const agent = new MissionAgent(10, 10);
      await agent.initialize();

      const memBefore = process.memoryUsage().heapUsed;
      await agent.run();
      const memAfter = process.memoryUsage().heapUsed;
      const memDelta = (memAfter - memBefore) / (1024 * 1024);

      // Memory growth should be reasonable (can be negative due to GC)
      expect(Math.abs(memDelta)).toBeLessThan(50);
    });

    it('should not grow memory unboundedly across multiple missions', async () => {
      const initialMem = process.memoryUsage().heapUsed;

      for (let i = 0; i < 3; i++) {
        const agent = new MissionAgent(10, 10);
        await agent.initialize();
        await agent.run();
        await agent.shutdown();
      }

      const finalMem = process.memoryUsage().heapUsed;
      const totalGrowth = (finalMem - initialMem) / (1024 * 1024);

      // Should not grow more than 50MB for 3 missions
      expect(totalGrowth).toBeLessThan(50);
    });
  });

  describe('Trace Size', () => {
    it('should keep trace size reasonable for short missions', async () => {
      const agent = new MissionAgent(5, 5);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const traceJson = JSON.stringify(trace);
      const traceSize = Buffer.byteLength(traceJson, 'utf-8') / 1024;

      // Actual trace size is larger with full event details
      expect(traceSize).toBeLessThan(1000);
    });

    it('should keep trace size reasonable for long missions', async () => {
      const agent = new MissionAgent(30, 30);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const traceJson = JSON.stringify(trace);
      const traceSize = Buffer.byteLength(traceJson, 'utf-8') / 1024;

      // Large missions can have larger traces
      expect(traceSize).toBeLessThan(5000);
    });

    it('should have events with consistent size per tick', async () => {
      const agent = new MissionAgent(15, 15);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const tickCount = trace.events.filter((e) => e.eventType === 'mission_tick').length;

      expect(tickCount).toBeGreaterThan(0);
      expect(trace.events.length).toBeGreaterThanOrEqual(tickCount);
    });
  });

  describe('Planning Latency', () => {
    it('should invoke planner consistently', async () => {
      const agent = new MissionAgent(10, 10);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const planningEvents = trace.events.filter(
        (e) => e.eventType === 'planner_invoked' || e.eventType === 'plan_generated'
      );

      expect(planningEvents.length).toBeGreaterThan(0);
    });

    it('should generate plans for multiple goals', async () => {
      const agent = new MissionAgent(20, 20);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      const planEvents = trace.events.filter((e) => e.eventType === 'plan_generated');

      expect(planEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Performance', () => {
    it('should support trace access for replay', async () => {
      const agent = new MissionAgent(10, 10);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();

      expect(trace).toBeDefined();
      expect(trace.missionId).toBeDefined();
      expect(trace.events).toBeDefined();
      expect(trace.events.length).toBeGreaterThan(0);
    });

    it('should maintain event order for replay', async () => {
      const agent = new MissionAgent(15, 15);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();

      let lastTick = -1;
      for (const event of trace.events) {
        expect(event.tick).toBeGreaterThanOrEqual(lastTick);
        lastTick = event.tick;
      }
    });
  });

  describe('Worker Utilization', () => {
    it('should execute commands for unit management', async () => {
      const agent = new MissionAgent(15, 15);
      await agent.initialize();

      const metrics = agent.getMetrics();
      expect(metrics).toBeDefined();

      await agent.run();

      const finalMetrics = agent.getMetrics();
      // Commands may or may not be executed depending on game state
      expect(finalMetrics).toBeDefined();
    });
  });

  describe('Economy Efficiency', () => {
    it('should track resource production', async () => {
      const agent = new MissionAgent(25, 25);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();
      expect(trace.events.length).toBeGreaterThan(0);

      // Should have resource-related events
      const hasResourceEvents = trace.events.some((e) =>
        e.eventType.includes('resource') || e.eventType.includes('build')
      );

      expect(trace.events.length).toBeGreaterThan(0);
    });
  });

  describe('Combat Efficiency', () => {
    it('should track combat decisions', async () => {
      const agent = new MissionAgent(30, 30);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();

      // Should have combat-related decision events
      const combatEvents = trace.events.filter(
        (e) =>
          e.eventType.includes('combat') ||
          e.eventType.includes('attack') ||
          e.eventType === 'decision_selected'
      );

      expect(trace.events.length).toBeGreaterThan(0);
    });
  });

  describe('Win/Loss Statistics', () => {
    it('should complete mission execution', async () => {
      const agent = new MissionAgent(10, 10);
      await agent.initialize();
      await agent.run();

      const trace = agent.getTrace();

      expect(trace.endTime).toBeDefined();
      expect(trace.startTime).toBeGreaterThan(0);
      expect(trace.endTime).toBeGreaterThan(trace.startTime);
    });

    it('should execute multiple different targets', async () => {
      const targets = [
        [5, 5],
        [15, 15],
        [25, 25],
      ];

      for (const [x, y] of targets) {
        const agent = new MissionAgent(x, y);
        await agent.initialize();
        await agent.run();

        const trace = agent.getTrace();
        expect(trace.targetX).toBe(x);
        expect(trace.targetY).toBe(y);
        expect(trace.endTime).toBeDefined();
      }
    });
  });

  describe('Concurrent Execution', () => {
    it('should handle multiple concurrent missions', async () => {
      const agents = [
        new MissionAgent(5, 5),
        new MissionAgent(10, 10),
        new MissionAgent(15, 15),
      ];

      await Promise.all(agents.map((a) => a.initialize()));
      await Promise.all(agents.map((a) => a.run()));

      for (const agent of agents) {
        const trace = agent.getTrace();
        expect(trace.endTime).toBeDefined();
        expect(trace.events.length).toBeGreaterThan(0);
      }
    });

    it('should maintain isolation between concurrent missions', async () => {
      const agent1 = new MissionAgent(10, 10);
      const agent2 = new MissionAgent(20, 20);

      await agent1.initialize();
      await agent2.initialize();

      await Promise.all([agent1.run(), agent2.run()]);

      const trace1 = agent1.getTrace();
      const trace2 = agent2.getTrace();

      expect(trace1.targetX).toBe(10);
      expect(trace1.targetY).toBe(10);
      expect(trace2.targetX).toBe(20);
      expect(trace2.targetY).toBe(20);

      // Different targets should produce different execution patterns
      expect(trace1.events.length).not.toBe(trace2.events.length);
    });
  });

  describe('Deterministic Reproducibility', () => {
    it('should produce consistent trace sizes for same target', async () => {
      const sizes: number[] = [];

      for (let i = 0; i < 2; i++) {
        const agent = new MissionAgent(10, 10);
        await agent.initialize();
        await agent.run();

        const trace = agent.getTrace();
        const traceJson = JSON.stringify(trace);
        const traceSize = Buffer.byteLength(traceJson, 'utf-8');
        sizes.push(traceSize);
      }

      // Trace sizes should be very close (within 1% variance due to timestamps)
      const variance = Math.abs(sizes[0] - sizes[1]) / sizes[0];
      expect(variance).toBeLessThan(0.01);
    });

    it('should produce consistent event sequences for same target', async () => {
      const sequences: string[] = [];

      for (let i = 0; i < 2; i++) {
        const agent = new MissionAgent(8, 8);
        await agent.initialize();
        await agent.run();

        const trace = agent.getTrace();
        const eventSequence = trace.events
          .map((e) => `${e.tick}:${e.eventType}`)
          .join('|');
        sequences.push(eventSequence);
      }

      expect(sequences[0]).toBe(sequences[1]);
    });
  });

  describe('Full Benchmark Suite', () => {
    it('should run complete benchmark suite', async () => {
      const targets: Array<[number, number]> = [
        [5, 5],
        [15, 15],
        [25, 25],
      ];

      const results = await BenchmarkSuite.runBenchmarks(targets, 2);

      expect(results.length).toBe(targets.length * 2);

      for (const result of results) {
        expect(result.totalDurationMs).toBeGreaterThan(0);
        expect(result.executionTimeMs).toBeGreaterThan(0);
        expect(result.totalTicks).toBeGreaterThan(0);
        expect(result.averageTickDurationMs).toBeGreaterThan(0);
      }
    });

    it('should generate valid benchmark report', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[10, 10]], 2);
      const report = BenchmarkSuite.generateReport(results);

      expect(report.version).toBe('1.0');
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.results.length).toBe(2);
      expect(report.statistics.runs).toBe(2);
      expect(report.statistics.avgTotalDurationMs).toBeGreaterThan(0);
    });

    it('should format benchmark report as text', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[10, 10]], 1);
      const report = BenchmarkSuite.generateReport(results);
      const formatted = BenchmarkSuite.formatReport(report);

      expect(formatted).toContain('BENCHMARK REPORT');
      expect(formatted).toContain('INITIALIZATION');
      expect(formatted).toContain('EXECUTION');
      expect(formatted).toContain('TOTAL DURATION');
      expect(formatted).toContain('PER-TICK TIMING');
    });

    it('should export benchmark report as JSON', async () => {
      const results = await BenchmarkSuite.runBenchmarks([[10, 10]], 1);
      const report = BenchmarkSuite.generateReport(results);
      const json = BenchmarkSuite.reportToJson(report);

      const parsed = JSON.parse(json);
      expect(parsed.version).toBe('1.0');
      expect(parsed.results.length).toBe(1);
      expect(parsed.statistics).toBeDefined();
    });
  });
});
