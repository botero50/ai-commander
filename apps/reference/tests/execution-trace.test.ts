import { describe, it, expect } from 'vitest';
import { ExecutionTracer, formatTrace, traceToJson } from '../src/execution-trace.js';
import { MissionAgent } from '../src/mission-agent.js';
import {
  createGoal,
  createGoalId,
  GoalStatus,
  GoalPriorityLevel,
  createGoalPriority,
} from '@ai-commander/goals';

describe('Execution Trace - Structured Observability', () => {
  it('should create an empty trace', () => {
    const tracer = new ExecutionTracer('test-mission', 1, 1);
    const trace = tracer.getTrace();

    expect(trace.missionId).toBe('test-mission');
    expect(trace.targetX).toBe(1);
    expect(trace.targetY).toBe(1);
    expect(trace.events).toHaveLength(0);
    expect(trace.status).toBe('running');
  });

  it('should record mission lifecycle events', () => {
    const tracer = new ExecutionTracer('lifecycle-test', 2, 2);

    tracer.recordMissionStarted();
    expect(tracer.getTrace().events).toHaveLength(1);

    tracer.recordMissionInitialized();
    expect(tracer.getTrace().events).toHaveLength(2);

    tracer.recordMissionCompleted();
    expect(tracer.getTrace().status).toBe('completed');
    expect(tracer.getTrace().events).toHaveLength(3);

    tracer.recordMissionShutdown();
    expect(tracer.getTrace().events).toHaveLength(4);
  });

  it('should record goal creation', () => {
    const tracer = new ExecutionTracer('goal-test', 1, 1);
    const goal = createGoal({
      id: createGoalId('test-goal'),
      intent: 'move-to-target',
      status: GoalStatus.Pending,
      priority: createGoalPriority(GoalPriorityLevel.NORMAL),
      parameters: { targetX: 1, targetY: 1 },
    });

    tracer.recordGoalCreated(goal);
    const trace = tracer.getTrace();

    expect(trace.events).toHaveLength(1);
    expect(trace.events[0].eventType).toBe('goal_created');
    expect(trace.events[0].data.goalIntent).toBe('move-to-target');
  });

  it('should record planning events', () => {
    const tracer = new ExecutionTracer('planning-test', 1, 1);

    tracer.recordPlannerInvoked(1, 1);
    expect(tracer.getTrace().events[0].eventType).toBe('planner_invoked');

    tracer.recordPlanError('Test error');
    expect(tracer.getTrace().events[1].eventType).toBe('plan_error');

    tracer.recordPlanEmpty();
    expect(tracer.getTrace().events[2].eventType).toBe('plan_empty');
  });

  it('should record decision engine events', () => {
    const tracer = new ExecutionTracer('decision-test', 1, 1);

    tracer.recordDecisionEngineInvoked();
    expect(tracer.getTrace().events[0].eventType).toBe('decision_engine_invoked');

    tracer.recordDecisionError('Test decision error');
    expect(tracer.getTrace().events[1].eventType).toBe('decision_error');
  });

  it('should record command execution events', () => {
    const tracer = new ExecutionTracer('command-test', 1, 1);

    tracer.recordCommandExecuted({ actionType: 'move', parameters: { dx: 1, dy: 0 } } as any, {
      success: true,
      message: 'Command executed',
      data: { newTick: 1 },
    });
    expect(tracer.getTrace().events[0].eventType).toBe('command_executed');
    expect(tracer.getTrace().events[0].data.success).toBe(true);

    tracer.recordCommandFailed({ actionType: 'move', parameters: { dx: 1, dy: 0 } } as any, {
      success: false,
      message: 'Command failed',
      error: { code: 'INVALID_COMMAND', reason: 'Test' },
    });
    expect(tracer.getTrace().events[1].eventType).toBe('command_failed');
  });

  it('should record world state updates', () => {
    const tracer = new ExecutionTracer('world-state-test', 3, 2);

    tracer.recordWorldStateUpdated(0, 0, 0);
    expect(tracer.getTrace().events[0].eventType).toBe('world_state_updated');
    expect(tracer.getTrace().events[0].data.agentX).toBe(0);
    expect(tracer.getTrace().events[0].data.agentY).toBe(0);

    tracer.recordWorldStateUpdated(1, 0, 1);
    expect(tracer.getTrace().events[1].data.agentX).toBe(1);

    tracer.recordWorldStateUpdated(2, 0, 2);
    expect(tracer.getTrace().events[2].data.agentX).toBe(2);
  });

  it('should record mission tick progression', () => {
    const tracer = new ExecutionTracer('tick-test', 1, 1);

    tracer.recordMissionTick(1);
    expect(tracer.getTrace().events[0].tick).toBe(1);

    tracer.recordMissionTick(2);
    expect(tracer.getTrace().events[1].tick).toBe(2);

    tracer.recordMissionTick(3);
    expect(tracer.getTrace().events[2].tick).toBe(3);
  });

  it('should maintain chronological order', () => {
    const tracer = new ExecutionTracer('chrono-test', 1, 1);

    tracer.recordMissionStarted();
    const event1Time = tracer.getTrace().events[0].timestamp;

    tracer.recordMissionInitialized();
    const event2Time = tracer.getTrace().events[1].timestamp;

    expect(event2Time).toBeGreaterThanOrEqual(event1Time);
  });

  it('should freeze events (immutable)', () => {
    const tracer = new ExecutionTracer('immutable-test', 1, 1);

    tracer.recordMissionStarted();
    const event = tracer.getTrace().events[0];

    expect(() => {
      (event as any).timestamp = 999;
    }).toThrow();

    expect(() => {
      (event.data as any).missionId = 'modified';
    }).toThrow();
  });

  it('should format trace as human-readable text', () => {
    const tracer = new ExecutionTracer('format-test', 1, 1);

    tracer.recordMissionStarted();
    tracer.recordMissionCompleted();

    const formatted = formatTrace(tracer.getTrace());

    expect(formatted).toContain('EXECUTION TRACE');
    expect(formatted).toContain('format-test');
    expect(formatted).toContain('mission_started');
    expect(formatted).toContain('mission_completed');
  });

  it('should convert trace to JSON', () => {
    const tracer = new ExecutionTracer('json-test', 1, 1);

    tracer.recordMissionStarted();
    const json = traceToJson(tracer.getTrace());

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionId).toBe('json-test');
    expect(parsed.events).toHaveLength(1);
  });
});

describe('Execution Trace - Integration with Mission Agent', () => {
  it('should record trace for complete mission', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    expect(trace.status).toBe('completed');
    expect(trace.events.length).toBeGreaterThan(0);

    // Check for key event types
    const eventTypes = trace.events.map((e) => e.eventType);
    expect(eventTypes).toContain('mission_started');
    expect(eventTypes).toContain('mission_initialized');
    expect(eventTypes).toContain('goal_created');
    expect(eventTypes).toContain('mission_completed');
    expect(eventTypes).toContain('mission_shutdown');
  });

  it('should produce deterministic traces across runs', async () => {
    // Run mission twice and compare traces
    const traces = [];

    for (let run = 0; run < 2; run++) {
      const agent = new MissionAgent(2, 1);
      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      traces.push(agent.getTrace());
    }

    // Same number of events
    expect(traces[0].events.length).toBe(traces[1].events.length);

    // Same event types in same order
    for (let i = 0; i < traces[0].events.length; i++) {
      expect(traces[0].events[i].eventType).toBe(traces[1].events[i].eventType);
      expect(traces[0].events[i].tick).toBe(traces[1].events[i].tick);
    }
  });

  it('should include all required lifecycle events', async () => {
    const agent = new MissionAgent(1, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();
    const eventTypes = new Set(trace.events.map((e) => e.eventType));

    // Check minimum required events
    expect(eventTypes.has('mission_started')).toBe(true);
    expect(eventTypes.has('mission_initialized')).toBe(true);
    expect(eventTypes.has('goal_created')).toBe(true);
    expect(eventTypes.has('mission_tick')).toBe(true);
    expect(eventTypes.has('mission_completed')).toBe(true);
    expect(eventTypes.has('mission_shutdown')).toBe(true);
  });

  it('should record trace with multiple ticks', async () => {
    const agent = new MissionAgent(3, 0);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    // Count ticks
    const ticks = trace.events.filter((e) => e.eventType === 'mission_tick');
    expect(ticks.length).toBeGreaterThan(0);

    // Verify tick numbers are sequential
    for (let i = 0; i < ticks.length; i++) {
      expect(ticks[i].data.tickNumber).toBe(i + 1);
    }
  });

  it('should format trace for human consumption', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const formatted = agent.formatTrace();

    expect(formatted).toContain('EXECUTION TRACE');
    expect(formatted).toContain('mission-1-1');
    expect(formatted).toContain('mission_started');
    expect(formatted).toContain('mission_completed');
    expect(formatted.length).toBeGreaterThan(100); // Should be substantial
  });

  it('should provide JSON representation', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const json = agent.traceAsJson();

    expect(() => JSON.parse(json)).not.toThrow();

    const parsed = JSON.parse(json);
    expect(parsed.missionId).toBe('mission-1-1');
    expect(parsed.targetX).toBe(1);
    expect(parsed.targetY).toBe(1);
    expect(parsed.status).toBe('completed');
  });

  it('should have consistent trace across mission variations', async () => {
    const targetConfigs = [
      [2, 1],
      [0, 1],
    ];

    for (const [x, y] of targetConfigs) {
      const agent = new MissionAgent(x, y);

      await agent.initialize();
      await agent.run();
      await agent.shutdown();

      const trace = agent.getTrace();

      // All should complete or fail consistently
      expect(['completed', 'failed']).toContain(trace.status);

      // All should have events
      expect(trace.events.length).toBeGreaterThan(0);

      // All should have same critical events
      const eventTypes = trace.events.map((e) => e.eventType);
      expect(eventTypes).toContain('mission_started');
      expect(eventTypes).toContain(trace.status === 'completed' ? 'mission_completed' : 'mission_failed');
    }
  });
});

describe('Execution Trace - Trace Structure and Content', () => {
  it('should capture mission metadata', async () => {
    const agent = new MissionAgent(2, 3);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    expect(trace.missionId).toBe('mission-2-3');
    expect(trace.targetX).toBe(2);
    expect(trace.targetY).toBe(3);
    expect(trace.startTime).toBeGreaterThan(0);
    expect(trace.endTime).toBeGreaterThanOrEqual(trace.startTime);
  });

  it('should record goal parameters in trace', async () => {
    const agent = new MissionAgent(3, 2);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    const goalEvent = trace.events.find((e) => e.eventType === 'goal_created');
    expect(goalEvent).toBeDefined();
    expect(goalEvent?.data.goalIntent).toBe('move-to-target');
    expect(goalEvent?.data.goalParameters).toEqual(
      expect.objectContaining({
        targetX: 3,
        targetY: 2,
      })
    );
  });

  it('should record event timestamps', async () => {
    const agent = new MissionAgent(1, 1);

    await agent.initialize();
    await agent.run();
    await agent.shutdown();

    const trace = agent.getTrace();

    // Each event should have a timestamp
    for (const event of trace.events) {
      expect(event.timestamp).toBeGreaterThanOrEqual(trace.startTime);
      expect(event.timestamp).toBeGreaterThan(0);
    }
  });

  it('should record mission duration', async () => {
    const agent = new MissionAgent(1, 1);

    const startTime = Date.now();
    await agent.initialize();
    await agent.run();
    await agent.shutdown();
    const endTime = Date.now();

    const trace = agent.getTrace();

    expect(trace.endTime).toBeGreaterThanOrEqual(trace.startTime);
    expect(trace.endTime).toBeGreaterThanOrEqual(startTime);
    expect(trace.endTime).toBeLessThanOrEqual(endTime + 100); // Allow small margin
  });
});
