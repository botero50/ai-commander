import { describe, it, expect } from 'vitest';
import { ReplayEngine, formatReplayReport, replayReportToJson } from '../src/replay-engine.js';
import { MissionAgent } from '../src/mission-agent.js';
import { ExecutionTracer } from '../src/execution-trace.js';

describe('Replay Engine - Trace Validation', () => {
  it('should validate a complete trace', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const result = ReplayEngine.replay(trace);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing mission_started event', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionInitialized();
    tracer.recordMissionCompleted();
    tracer.recordMissionShutdown();

    const trace = tracer.getTrace();
    const result = ReplayEngine.replay(trace);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('mission_started'))).toBe(true);
  });

  it('should detect missing mission_initialized event', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    tracer.recordMissionCompleted();
    tracer.recordMissionShutdown();

    const trace = tracer.getTrace();
    const result = ReplayEngine.replay(trace);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('mission_initialized'))).toBe(true);
  });

  it('should detect missing mission_shutdown event', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    tracer.recordMissionInitialized();
    tracer.recordMissionCompleted();

    const trace = tracer.getTrace();
    const result = ReplayEngine.replay(trace);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('mission_shutdown'))).toBe(true);
  });

  it('should detect out-of-order events', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    tracer.recordMissionInitialized();

    // Manually create events with wrong timestamps
    const trace = tracer.getTrace();
    const badTrace = Object.freeze({
      ...trace,
      events: Object.freeze([
        { ...trace.events[0], timestamp: 100 },
        { ...trace.events[1], timestamp: 50 }, // Out of order!
      ]),
    });

    const result = ReplayEngine.replay(badTrace);

    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('chronological'))).toBe(true);
  });

  it('should validate mission completion status', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    tracer.recordMissionInitialized();
    tracer.recordMissionCompleted();
    tracer.recordMissionShutdown();

    const trace = tracer.getTrace();
    const result = ReplayEngine.replay(trace);

    // Status should match: completed with mission_completed event
    const completionValidation = result.validations.find((v) => v.name === 'Mission Completion');
    expect(completionValidation?.passed).toBe(true);
  });

  it('should validate event data consistency', async () => {
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    // All events should have valid data
    for (const event of trace.events) {
      expect(typeof event.timestamp).toBe('number');
      expect(event.timestamp).toBeGreaterThan(0);
      expect(typeof event.tick).toBe('number');
      expect(event.tick).toBeGreaterThanOrEqual(0);
      expect(typeof event.eventType).toBe('string');
      expect(event.data).toBeDefined();
      expect(typeof event.data).toBe('object');
    }

    const result = ReplayEngine.replay(trace);
    const consistencyValidation = result.validations.find(
      (v) => v.name === 'Event Data Consistency'
    );
    expect(consistencyValidation?.passed).toBe(true);
  });

  it('should validate tick ordering', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const result = ReplayEngine.replay(trace);

    const tickValidation = result.validations.find((v) => v.name === 'Tick Ordering');
    expect(tickValidation?.passed).toBe(true);
  });
});

describe('Replay Engine - Report Generation', () => {
  it('should generate a valid replay report', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const report = ReplayEngine.generateReport(trace);

    expect(report.traceId).toBe(trace.missionId);
    expect(report.missionStatus).toBe('completed');
    expect(report.isValid).toBe(true);
    expect(report.eventCount).toBe(trace.events.length);
  });

  it('should populate all report fields', async () => {
    const agent = new MissionAgent(2, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const report = agent.getReplayReport();

    expect(report?.traceId).toBeDefined();
    expect(report?.missionId).toBeDefined();
    expect(report?.targetX).toBe(2);
    expect(report?.targetY).toBe(0);
    expect(report?.missionStatus).toBeDefined();
    expect(report?.isValid).toBeDefined();
    expect(report?.eventCount).toBeGreaterThan(0);
    expect(Array.isArray(report?.errors)).toBe(true);
    expect(Array.isArray(report?.validations)).toBe(true);
    expect(report?.duration).toBeGreaterThanOrEqual(0);
  });

  it('should record validation results in report', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const report = agent.getReplayReport();

    expect(report?.validations.length).toBeGreaterThan(0);

    // All validations should have required fields
    for (const validation of report?.validations ?? []) {
      expect(validation.name).toBeDefined();
      expect(typeof validation.passed).toBe('boolean');
      expect(validation.message).toBeDefined();
    }
  });
});

describe('Replay Engine - Determinism', () => {
  it('should produce identical replay reports for identical missions', async () => {
    const reports = [];

    for (let run = 0; run < 2; run++) {
      const agent = new MissionAgent(2, 1);

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const report = agent.getReplayReport();
      reports.push(report);
    }

    // Both reports should be valid
    expect(reports[0]?.isValid).toBe(true);
    expect(reports[1]?.isValid).toBe(true);

    // Both should have same event count
    expect(reports[0]?.eventCount).toBe(reports[1]?.eventCount);

    // Both should have same validation count
    expect(reports[0]?.validations.length).toBe(reports[1]?.validations.length);

    // All validations should match
    for (let i = 0; i < (reports[0]?.validations.length ?? 0); i++) {
      expect(reports[0]?.validations[i].name).toBe(reports[1]?.validations[i].name);
      expect(reports[0]?.validations[i].passed).toBe(reports[1]?.validations[i].passed);
    }
  });
});

describe('Replay Engine - Output Formatting', () => {
  it('should format replay report as human-readable text', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const formatted = agent.formatReplayReport();

    expect(formatted).toContain('REPLAY REPORT');
    expect(formatted).toContain('mission-1-1');
    expect(formatted).toContain('VALIDATIONS');
    expect(formatted).toContain('Target:');
    expect(formatted).toContain('Status:');
  });

  it('should convert replay report to JSON', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.replayReportAsJson();

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.traceId).toBe('mission-1-1');
    expect(parsed.isValid).toBeDefined();
    expect(Array.isArray(parsed.validations)).toBe(true);
  });

  it('should show validation status in formatted output', async () => {
    const agent = new MissionAgent(1, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const formatted = agent.formatReplayReport();

    // Should show pass/fail markers
    expect(formatted).toContain('✓');
    expect(formatted).toContain('YES'); // For "Valid: YES"
  });

  it('should display errors in formatted output if present', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    tracer.recordMissionStarted();
    // Missing initialized, completed, and shutdown events

    const trace = tracer.getTrace();
    const report = ReplayEngine.generateReport(trace);
    const formatted = formatReplayReport(report);

    expect(formatted).toContain('ERRORS');
    expect(report.errors.length).toBeGreaterThan(0);
  });
});

describe('Replay Engine - Immutability', () => {
  it('should freeze replay result', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const result = ReplayEngine.replay(trace);

    expect(() => {
      (result as any).isValid = false;
    }).toThrow();
  });

  it('should freeze replay report', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const report = agent.getReplayReport();

    expect(() => {
      (report as any).isValid = false;
    }).toThrow();
  });
});

describe('Replay Engine - Multiple Missions', () => {
  it('should successfully validate various missions', async () => {
    const targets = [
      [0, 1],
      [2, 2],
    ];

    for (const [x, y] of targets) {
      const agent = new MissionAgent(x, y);

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const report = agent.getReplayReport();

      expect(report).toBeDefined();
      expect(['completed', 'failed']).toContain(report?.missionStatus);
    }
  });

  it('should validate all validations pass for complete missions', async () => {
    const agent = new MissionAgent(2, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const report = agent.getReplayReport();

    // All validations should pass for a complete mission
    expect(report?.validations.every((v) => v.passed)).toBe(true);
  });
});
