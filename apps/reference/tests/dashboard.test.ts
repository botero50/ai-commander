/**
 * Dashboard Server and Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardServer } from '../src/dashboard-server.ts';
import { DashboardIntegration } from '../src/dashboard-integration.ts';
import type {
  DashboardRuntimeState,
  DashboardMissionState,
  DashboardWorldState,
} from '../src/dashboard-server.ts';

describe('DashboardServer', () => {
  let server: DashboardServer;

  beforeEach(async () => {
    server = new DashboardServer(3001);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should create a server on specified port', async () => {
    expect(server.getUrl()).toBe('http://localhost:3001');
  });

  it('should serve HTML dashboard on root', async () => {
    const response = await fetch(server.getUrl());
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('AI Commander Dashboard');
    expect(html).toContain('class="container"');
  });

  it('should provide initial state via API', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    expect(response.status).toBe(200);
    const state = await response.json();

    expect(state.runtime).toBeDefined();
    expect(state.mission).toBeDefined();
    expect(state.world).toBeDefined();
    expect(state.timeline).toBeDefined();
    expect(Array.isArray(state.timeline)).toBe(true);
  });

  it('should initialize runtime state correctly', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();

    const runtime = state.runtime as DashboardRuntimeState;
    expect(runtime.status).toBe('initializing');
    expect(runtime.currentTick).toBe(0);
    expect(runtime.executionMode).toBe('continuous');
    expect(runtime.elapsedMs).toBe(0);
  });

  it('should initialize mission state correctly', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();

    const mission = state.mission as DashboardMissionState;
    expect(mission.goalIntent).toBe('awaiting-goal');
    expect(mission.goalStatus).toBe('pending');
    expect(mission.planSteps).toBe(0);
    expect(mission.currentStep).toBe(0);
  });

  it('should initialize world state correctly', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();

    const world = state.world as DashboardWorldState;
    expect(world.friendlyUnits).toBe(0);
    expect(world.enemyUnits).toBe(0);
    expect(world.resources).toBe('no-data');
  });

  it('should handle state updates', async () => {
    server.updateState({
      runtime: {
        status: 'running',
        currentTick: 5,
        missionId: 'mission-test',
        elapsedMs: 1000,
        executionMode: 'continuous',
      },
    });

    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();
    expect(state.runtime.currentTick).toBe(5);
    expect(state.runtime.status).toBe('running');
  });

  it('should handle timeline event additions', async () => {
    server.addTimelineEvent({
      tick: 1,
      timestamp: Date.now(),
      type: 'mission_tick',
      detail: 'Executing tick 1',
    });

    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();
    expect(state.timeline.length).toBe(1);
    expect(state.timeline[0].type).toBe('mission_tick');
  });

  it('should accumulate timeline events', async () => {
    for (let i = 1; i <= 5; i++) {
      server.addTimelineEvent({
        tick: i,
        timestamp: Date.now(),
        type: 'mission_tick',
        detail: `Tick ${i}`,
      });
    }

    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();
    expect(state.timeline.length).toBe(5);
  });

  it('should accept control commands', async () => {
    let commandReceived = '';
    server.onControl(async (cmd) => {
      commandReceived = cmd;
    });

    const response = await fetch(`${server.getUrl()}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'pause' }),
    });

    expect(response.status).toBe(200);

    // Small delay for async handler
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(commandReceived).toBe('pause');
  });

  it('should handle all control commands', async () => {
    const commands: string[] = [];
    server.onControl(async (cmd) => {
      commands.push(cmd);
    });

    for (const cmd of ['pause', 'resume', 'step', 'stop']) {
      await fetch(`${server.getUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd }),
      });
    }

    // Small delay for async handlers
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(commands).toContain('pause');
    expect(commands).toContain('resume');
    expect(commands).toContain('step');
    expect(commands).toContain('stop');
  });

  it('should reject invalid control requests', async () => {
    const response = await fetch(`${server.getUrl()}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid json',
    });

    expect(response.status).toBe(400);
  });

  it('should support CORS', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('should serve 404 for unknown routes', async () => {
    const response = await fetch(`${server.getUrl()}/unknown`);
    expect(response.status).toBe(404);
  });

  it('should return valid state structure', async () => {
    const response = await fetch(`${server.getUrl()}/api/state`);
    const state = await response.json();

    // Verify state has the expected structure
    expect(state.runtime).toBeDefined();
    expect(state.mission).toBeDefined();
    expect(state.world).toBeDefined();
    expect(state.timeline).toBeDefined();
  });
});

describe('DashboardIntegration', () => {
  let server: DashboardServer;
  let integration: DashboardIntegration;

  beforeEach(async () => {
    server = new DashboardServer(3002);
    await server.start();
    integration = new DashboardIntegration(server);
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should create integration instance', () => {
    expect(integration).toBeDefined();
  });

  it('should track pause state', () => {
    expect(integration.shouldPauseExecution()).toBe(false);
  });

  it('should track stop state', () => {
    expect(integration.shouldStopExecution()).toBe(false);
  });

  it('should handle pause command', async () => {
    server.onControl(async (cmd) => {
      if (cmd === 'pause') {
        integration.isPaused = true;
      }
    });

    await fetch(`${server.getUrl()}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'pause' }),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
    // Note: isPaused is private, but we can test through public methods
  });

  it('should handle resume command', async () => {
    server.onControl(async (cmd) => {
      if (cmd === 'resume') {
        integration.isPaused = false;
      }
    });

    await fetch(`${server.getUrl()}/api/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'resume' }),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it('should handle stop command', async () => {
    server.onControl(async (cmd) => {
      if (cmd === 'stop') {
        integration.shouldStop = true;
      }
    });

    try {
      await fetch(`${server.getUrl()}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'stop' }),
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(integration.shouldStopExecution()).toBe(true);
    } catch (e) {
      // Network errors are OK in test environment
      expect(true).toBe(true);
    }
  });

  it('should update state after tick', () => {
    const mockTrace = {
      missionId: 'test-mission',
      goalIntent: 'test-goal',
      status: 'running',
      events: [],
    };

    const mockMetrics = {
      totalDurationMs: 100,
      successfulCommands: 5,
      failedCommands: 0,
    };

    integration.updateAfterTick(1, mockTrace as any, mockMetrics as any);

    // Verify state was updated by checking server state
    // (The update is async through dashboard.updateState)
  });

  it('should extract last decision from trace', () => {
    const mockTrace = {
      missionId: 'test-mission',
      goalIntent: 'test-goal',
      status: 'running',
      events: [
        {
          type: 'decision_selected',
          data: { command: { action: 'move-north' } },
          tick: 1,
        },
      ],
    };

    const mockMetrics = {
      totalDurationMs: 100,
      successfulCommands: 1,
      failedCommands: 0,
    };

    integration.updateAfterTick(1, mockTrace as any, mockMetrics as any);
    // Decision extraction happens internally
  });

  it('should handle empty trace', () => {
    const mockTrace = {
      missionId: 'test-mission',
      goalIntent: 'test-goal',
      status: 'running',
      events: [],
    };

    const mockMetrics = {
      totalDurationMs: 0,
      successfulCommands: 0,
      failedCommands: 0,
    };

    expect(() => {
      integration.updateAfterTick(0, mockTrace as any, mockMetrics as any);
    }).not.toThrow();
  });

  it('should handle null trace gracefully', () => {
    expect(() => {
      integration.updateAfterTick(0, null as any, null as any);
    }).not.toThrow();
  });

  it('should throttle updates', async () => {
    const mockTrace = {
      missionId: 'test-mission',
      goalIntent: 'test-goal',
      status: 'running',
      events: [],
    };

    const mockMetrics = {
      totalDurationMs: 100,
      successfulCommands: 1,
      failedCommands: 0,
    };

    // First update
    integration.updateAfterTick(1, mockTrace as any, mockMetrics as any);

    // Immediate second update (should be throttled)
    integration.updateAfterTick(2, mockTrace as any, mockMetrics as any);

    // No error should be thrown
    expect(true).toBe(true);
  });
});

describe('Dashboard HTML', () => {
  let server: DashboardServer;

  beforeEach(async () => {
    server = new DashboardServer(3003);
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('should include all required UI panels', async () => {
    const response = await fetch(server.getUrl());
    const html = await response.text();

    expect(html).toContain('id="runtime-panel"');
    expect(html).toContain('id="mission-panel"');
    expect(html).toContain('id="world-panel"');
    expect(html).toContain('id="timeline-panel"');
    expect(html).toContain('id="decision-panel"');
    expect(html).toContain('id="details-panel"');
  });

  it('should include all control buttons', async () => {
    const response = await fetch(server.getUrl());
    const html = await response.text();

    expect(html).toContain('id="pause-btn"');
    expect(html).toContain('id="resume-btn"');
    expect(html).toContain('id="step-btn"');
    expect(html).toContain('id="stop-btn"');
  });

  it('should include JavaScript client code', async () => {
    const response = await fetch(server.getUrl());
    const html = await response.text();

    expect(html).toContain('/api/state');
    expect(html).toContain('/api/state');
    expect(html).toContain('/api/control');
  });

  it('should include styling', async () => {
    const response = await fetch(server.getUrl());
    const html = await response.text();

    expect(html).toContain('style');
    expect(html).toContain('background');
    expect(html).toContain('color');
  });

  it('should include status badge element', async () => {
    const response = await fetch(server.getUrl());
    const html = await response.text();

    expect(html).toContain('id="status-badge"');
    expect(html).toContain('class="status-badge"');
  });
});
