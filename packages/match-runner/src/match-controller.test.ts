import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MatchController } from './match-controller.js';

describe('MatchController', () => {
  let controller: MatchController;

  beforeEach(() => {
    controller = new MatchController('match-001', 'mistral', 'llama2', 1000);
  });

  it('should initialize with correct settings', () => {
    const state = controller.getState();

    expect(state.matchId).toBe('match-001');
    expect(state.currentTick).toBe(0);
    expect(state.totalTicks).toBe(1000);
    expect(state.player1.model).toBe('mistral');
    expect(state.player2.model).toBe('llama2');
    expect(state.status).toBe('starting');
  });

  it('should transition to running state', () => {
    controller.startMatch();
    const state = controller.getState();

    expect(state.status).toBe('running');
  });

  it('should update tick count', () => {
    controller.startMatch();
    controller.updateTick(100);

    const state = controller.getState();
    expect(state.currentTick).toBe(100);
  });

  it('should complete when reaching total ticks', () => {
    controller.startMatch();
    controller.updateTick(1000);

    const state = controller.getState();
    expect(state.status).toBe('completed');
  });

  it('should record player commands', () => {
    controller.startMatch();
    controller.recordPlayerCommand(1, 5, 1200);

    const state = controller.getState();
    expect(state.player1.commandsExecuted).toBe(5);
    expect(state.player1.currentLatencyMs).toBe(1200);
  });

  it('should calculate average latency', () => {
    controller.startMatch();
    controller.recordPlayerCommand(1, 1, 1000);
    controller.recordPlayerCommand(1, 1, 1400);

    const state = controller.getState();
    expect(state.player1.averageLatencyMs).toBe(1200);
  });

  it('should track goals completed', () => {
    controller.startMatch();
    controller.recordGoalCompletion(2, 'expand');
    controller.recordGoalCompletion(2, 'defend');

    const state = controller.getState();
    expect(state.player2.goalsCompleted).toBe(2);
  });

  it('should pause and resume', () => {
    controller.startMatch();
    controller.pause();

    let state = controller.getState();
    expect(state.isPaused).toBe(true);
    expect(state.status).toBe('paused');

    controller.resume();
    state = controller.getState();
    expect(state.isPaused).toBe(false);
    expect(state.status).toBe('running');
  });

  it('should set playback speed', () => {
    controller.setPlaybackSpeed(2.0);

    let state = controller.getState();
    expect(state.playbackSpeed).toBe(2.0);

    controller.setPlaybackSpeed(0.5);
    state = controller.getState();
    expect(state.playbackSpeed).toBe(0.5);
  });

  it('should clamp playback speed to valid range', () => {
    controller.setPlaybackSpeed(10); // Too high
    let state = controller.getState();
    expect(state.playbackSpeed).toBe(4);

    controller.setPlaybackSpeed(0.1); // Too low
    state = controller.getState();
    expect(state.playbackSpeed).toBe(0.25);
  });

  it('should record errors', () => {
    controller.startMatch();
    controller.recordError(1, 'Brain timeout');

    const state = controller.getState();
    expect(state.status).toBe('error');
  });

  it('should emit state change events', () => {
    const callback = vi.fn();
    controller.onStateChange(callback);

    controller.startMatch();

    expect(callback).toHaveBeenCalled();
  });

  it('should emit match events', () => {
    const callback = vi.fn();
    controller.startMatch();
    controller.onEvent(callback);
    controller.recordPlayerCommand(1, 1, 100);

    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'command',
        playerId: 1,
        message: expect.stringContaining('commands'),
      })
    );
  });

  it('should unsubscribe from events', () => {
    const callback = vi.fn();
    const unsubscribe = controller.onStateChange(callback);

    controller.startMatch();
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    controller.updateTick(100);
    expect(callback).toHaveBeenCalledTimes(1); // Not called again
  });

  it('should get recent events', () => {
    controller.startMatch();
    controller.recordPlayerCommand(1, 1, 100);
    controller.recordGoalCompletion(1, 'expand');
    controller.recordPlayerCommand(2, 2, 150);

    const events = controller.getRecentEvents(10);
    expect(events).toHaveLength(3);
    expect(events[0].type).toBe('command');
    expect(events[1].type).toBe('goal');
    expect(events[2].type).toBe('command');
  });

  it('should limit stored events to 1000', () => {
    controller.startMatch();

    for (let i = 0; i < 1500; i++) {
      controller.recordPlayerCommand(1, 1, 100);
    }

    const events = controller.getRecentEvents(2000);
    expect(events.length).toBeLessThanOrEqual(1000);
  });

  it('should generate summary', () => {
    controller.startMatch();
    controller.updateTick(500);

    const summary = controller.getSummary();

    expect(summary).toContain('match-001');
    expect(summary).toContain('running');
    expect(summary).toContain('500');
    expect(summary).toContain('1000');
    expect(summary).toContain('%');
  });

  it('should calculate tick rate', () => {
    controller.startMatch();

    // Simulate tick updates with timing
    for (let i = 0; i < 10; i++) {
      controller.updateTick(i);
    }

    const state = controller.getState();
    // Tick rate should be calculated but varies based on timing
    expect(state.tickRate).toBeGreaterThan(0);
  });
});
