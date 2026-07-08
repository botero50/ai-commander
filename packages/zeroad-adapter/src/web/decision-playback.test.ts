import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecisionPlayback, type PlaybackFrame } from './decision-playback.js';
import { MatchReplay } from '../tournament/match-replay.js';
import { DecisionTimeline } from './decision-timeline.js';
import type { DecisionEvent } from '../match/decision-overlay.js';
import type { TimelineSnapshot } from '../match/match-timeline.js';

describe('DecisionPlayback', () => {
  let replay: MatchReplay;
  let timeline: DecisionTimeline;
  let playback: DecisionPlayback;
  let baseTime: number;

  beforeEach(() => {
    replay = new MatchReplay('test-match');
    timeline = new DecisionTimeline();
    playback = new DecisionPlayback(replay, timeline);
    baseTime = Date.now();

    // Load test data into replay
    const decisions: DecisionEvent[] = [];
    const snapshots: TimelineSnapshot[] = [];

    for (let tick = 0; tick <= 10; tick++) {
      snapshots.push({
        tick,
        timestamp: baseTime + tick * 100,
        gameState: {
          unitCount: 10 + tick,
          buildingCount: 5 + tick * 0.5,
          playerCount: 2,
          resourcesPerPlayer: [
            { wood: 100 + tick * 10, stone: 50 + tick * 5 },
            { wood: 100 + tick * 10, stone: 50 + tick * 5 },
          ],
        },
        decisions: [],
      });

      if (tick % 2 === 0) {
        const decision: DecisionEvent = {
          tick,
          timestamp: baseTime + tick * 100,
          player: tick % 4 === 0 ? 'player1' : 'player2',
          brainName: tick % 4 === 0 ? 'Brain-1' : 'Brain-2',
          reasoning: `Decision at tick ${tick}`,
          commands: ['move', 'train'],
          commandCount: 2,
          durationMs: 250,
        };
        decisions.push(decision);
        timeline.addDecision(decision, snapshots[tick]);
      }
    }

    replay.loadMatchData(decisions, snapshots);
  });

  it('should initialize in stopped state', () => {
    expect(playback.getState()).toBe('stopped');
    expect(playback.getCurrentTick()).toBe(0);
  });

  it('should seek to specific tick', () => {
    playback.seek(5);
    expect(playback.getCurrentTick()).toBe(5);
  });

  it('should step forward one tick', () => {
    playback.seek(3);
    playback.stepForward();
    expect(playback.getCurrentTick()).toBe(4);
  });

  it('should step backward one tick', () => {
    playback.seek(5);
    playback.stepBackward();
    expect(playback.getCurrentTick()).toBe(4);
  });

  it('should not step backward past tick 0', () => {
    playback.seek(0);
    playback.stepBackward();
    expect(playback.getCurrentTick()).toBe(0);
  });

  it('should pause when stepping', () => {
    playback.play();
    expect(playback.getState()).toBe('playing');

    playback.stepForward();
    expect(playback.getState()).toBe('paused');
  });

  it('should set playback speed', () => {
    playback.setSpeed(2);
    expect(playback.getSpeed()).toBe(2);

    playback.setSpeed(0.5);
    expect(playback.getSpeed()).toBe(0.5);
  });

  it('should handle stop command', () => {
    playback.seek(5);
    playback.play();

    playback.stop();
    expect(playback.getState()).toBe('stopped');
    expect(playback.getCurrentTick()).toBe(0);
  });

  it('should notify listeners on frame change', () => {
    const listener = vi.fn();
    playback.subscribe(listener);

    playback.seek(3);

    expect(listener).toHaveBeenCalled();
    const frame = listener.mock.calls[0][0] as PlaybackFrame;
    expect(frame.tick).toBe(3);
  });

  it('should unsubscribe listener', () => {
    const listener = vi.fn();
    const unsubscribe = playback.subscribe(listener);

    playback.seek(1);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    playback.seek(2);

    expect(listener).toHaveBeenCalledOnce(); // Still only called once
  });

  it('should detect unit count changes', () => {
    const listener = vi.fn();
    playback.subscribe(listener);

    playback.seek(0);
    listener.mockClear();

    playback.seek(1);

    const frame = listener.mock.calls[0][0] as PlaybackFrame;
    expect(frame.changes.length).toBeGreaterThan(0);

    const unitChange = frame.changes.find((c) => c.type === 'unit_created' || c.type === 'unit_destroyed');
    expect(unitChange).toBeDefined();
  });

  it('should detect decision ticks', () => {
    const listener = vi.fn();
    playback.subscribe(listener);

    playback.seek(0); // This is a decision tick
    const frame = listener.mock.calls[0][0] as PlaybackFrame;
    expect(frame.isDecisionTick).toBe(true);

    listener.mockClear();
    playback.seek(1); // This is not a decision tick
    const frame2 = listener.mock.calls[0][0] as PlaybackFrame;
    expect(frame2.isDecisionTick).toBe(false);
  });

  it('should include decision data in decision ticks', () => {
    const listener = vi.fn();
    playback.subscribe(listener);

    playback.seek(0); // Decision tick
    const frame = listener.mock.calls[0][0] as PlaybackFrame;

    expect(frame.decision).not.toBeNull();
    expect(frame.decision?.reasoning).toBe('Decision at tick 0');
  });

  it('should get max tick', () => {
    const maxTick = playback.getMaxTick();
    expect(maxTick).toBeGreaterThanOrEqual(10);
  });

  it('should handle empty frames gracefully', () => {
    const listener = vi.fn();
    playback.subscribe(listener);

    // This should not crash even if the frame doesn't exist
    playback.seek(100); // Beyond max tick

    // Current tick should remain at last valid position
    expect(playback.getCurrentTick()).toBeLessThanOrEqual(playback.getMaxTick());
  });

  it('should support listener error handling', () => {
    const errorListener = vi.fn(() => {
      throw new Error('Listener error');
    });

    const normalListener = vi.fn();

    playback.subscribe(errorListener);
    playback.subscribe(normalListener);

    // Should not crash despite error in first listener
    playback.seek(1);

    expect(errorListener).toHaveBeenCalled();
    expect(normalListener).toHaveBeenCalled();
  });
});
