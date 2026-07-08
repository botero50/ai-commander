/**
 * Test: Web-based Match Viewer
 *
 * Validates:
 * 1. Match viewer state management
 * 2. Real-time event broadcasting
 * 3. Decision recording and updates
 * 4. Event subscription/unsubscription
 * 5. Multiple viewer management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchViewer, MatchViewerManager, MatchViewerState } from './match-viewer.js';
import type { DecisionEvent } from '../match/decision-overlay.js';

describe('Match Viewer', () => {
  let viewer: MatchViewer;
  const mockDecision: DecisionEvent = {
    tick: 1,
    timestamp: Date.now(),
    player: 'player1',
    brainName: 'Brain1',
    reasoning: 'test',
    commands: ['move', 'attack'],
    commandCount: 2,
    durationMs: 100,
  };

  beforeEach(() => {
    viewer = new MatchViewer('match1', 'Brain1', 'Brain2');
  });

  it('should initialize with match metadata', () => {
    const state = viewer.getState();
    expect(state.matchId).toBe('match1');
    expect(state.brain1).toBe('Brain1');
    expect(state.brain2).toBe('Brain2');
    expect(state.status).toBe('starting');
  });

  it('should subscribe to events', async () => {
    const events: any[] = [];

    viewer.subscribe((event) => {
      events.push(event);
    });

    viewer.updateState({ status: 'running', currentTick: 1 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('state_update');
  });

  it('should support multiple subscribers', async () => {
    const events1: any[] = [];
    const events2: any[] = [];

    viewer.subscribe((event) => {
      events1.push(event);
    });

    viewer.subscribe((event) => {
      events2.push(event);
    });

    viewer.updateState({ currentTick: 5 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
  });

  it('should support unsubscription', async () => {
    const events: any[] = [];

    const unsubscribe = viewer.subscribe((event) => {
      events.push(event);
    });

    viewer.updateState({ currentTick: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(events).toHaveLength(1);

    unsubscribe();
    viewer.updateState({ currentTick: 2 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(events).toHaveLength(1); // No new event
  });

  it('should record decisions', async () => {
    const events: any[] = [];

    viewer.subscribe((event) => {
      if (event.type === 'decision') {
        events.push(event);
      }
    });

    viewer.recordDecision(mockDecision);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toHaveLength(1);
    expect(events[0].data.brainName).toBe('Brain1');
  });

  it('should track latest decisions (max 5)', () => {
    for (let i = 1; i <= 10; i++) {
      viewer.recordDecision({
        ...mockDecision,
        tick: i,
      });
    }

    const state = viewer.getState();
    expect(state.latestDecisions?.length).toBe(5);
    expect(state.latestDecisions?.[0].tick).toBe(6);
    expect(state.latestDecisions?.[4].tick).toBe(10);
  });

  it('should record milestones', async () => {
    const events: any[] = [];

    viewer.subscribe((event) => {
      if (event.type === 'milestone') {
        events.push(event);
      }
    });

    viewer.recordMilestone(100, 'First building');
    viewer.recordMilestone(200, 'War started');

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toHaveLength(2);
    expect(events[0].data.description).toBe('First building');
  });

  it('should record errors', async () => {
    const events: any[] = [];

    viewer.subscribe((event) => {
      if (event.type === 'error') {
        events.push(event);
      }
    });

    viewer.recordError('Brain timeout');
    viewer.recordError(new Error('IPC failed'));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toHaveLength(2);
    expect(events[0].data.error).toBe('Brain timeout');
  });

  it('should mark match as complete', async () => {
    const events: any[] = [];

    viewer.subscribe((event) => {
      if (event.type === 'complete') {
        events.push(event);
      }
    });

    viewer.complete({
      status: 'completed',
      totalTicks: 1000,
      winner: 'Brain1',
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events).toHaveLength(1);
    expect(events[0].data.winner).toBe('Brain1');

    const state = viewer.getState();
    expect(state.status).toBe('completed');
  });

  it('should update player stats', () => {
    viewer.updateState({
      player1Stats: { commands: 50, errors: 2 },
      player2Stats: { commands: 45, errors: 3 },
    });

    const state = viewer.getState();
    expect(state.player1Stats?.commands).toBe(50);
    expect(state.player2Stats?.errors).toBe(3);
  });

  it('should track duration', () => {
    const before = Date.now();
    const duration = viewer.getDuration();
    const after = Date.now();

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThanOrEqual(after - before + 10);
  });

  it('should handle state updates with partial data', () => {
    viewer.updateState({ currentTick: 10 });
    let state = viewer.getState();
    expect(state.currentTick).toBe(10);
    expect(state.brain1).toBe('Brain1'); // Preserved

    viewer.updateState({ totalTicks: 100 });
    state = viewer.getState();
    expect(state.currentTick).toBe(10); // Preserved
    expect(state.totalTicks).toBe(100);
  });
});

describe('Match Viewer Manager', () => {
  let manager: MatchViewerManager;

  beforeEach(() => {
    manager = new MatchViewerManager();
  });

  it('should create viewers', () => {
    const viewer = manager.createViewer('match1', 'Brain1', 'Brain2');
    expect(viewer).toBeDefined();
    expect(viewer.getState().matchId).toBe('match1');
  });

  it('should get viewers by ID', () => {
    manager.createViewer('match1', 'Brain1', 'Brain2');
    const viewer = manager.getViewer('match1');

    expect(viewer).toBeDefined();
    expect(viewer?.getState().matchId).toBe('match1');
  });

  it('should prevent duplicate match IDs', () => {
    manager.createViewer('match1', 'Brain1', 'Brain2');

    expect(() => {
      manager.createViewer('match1', 'Brain1', 'Brain2');
    }).toThrow('already exists');
  });

  it('should remove viewers', () => {
    manager.createViewer('match1', 'Brain1', 'Brain2');
    expect(manager.getViewerCount()).toBe(1);

    manager.removeViewer('match1');
    expect(manager.getViewerCount()).toBe(0);
    expect(manager.getViewer('match1')).toBeUndefined();
  });

  it('should list active viewers', () => {
    manager.createViewer('match1', 'Brain1', 'Brain2');
    manager.createViewer('match2', 'Brain3', 'Brain4');

    const viewers = manager.listViewers();
    expect(viewers).toHaveLength(2);
    expect(viewers).toContain('match1');
    expect(viewers).toContain('match2');
  });

  it('should track viewer count', () => {
    expect(manager.getViewerCount()).toBe(0);

    manager.createViewer('match1', 'Brain1', 'Brain2');
    expect(manager.getViewerCount()).toBe(1);

    manager.createViewer('match2', 'Brain3', 'Brain4');
    expect(manager.getViewerCount()).toBe(2);

    manager.removeViewer('match1');
    expect(manager.getViewerCount()).toBe(1);
  });

  it('should enforce maximum viewer limit', () => {
    const manager2 = new MatchViewerManager();
    // Manually set low limit for testing
    (manager2 as any).maxViewers = 2;

    manager2.createViewer('match1', 'Brain1', 'Brain2');
    manager2.createViewer('match2', 'Brain3', 'Brain4');

    expect(() => {
      manager2.createViewer('match3', 'Brain5', 'Brain6');
    }).toThrow('Maximum viewers');
  });

  it('should handle viewer events independently', async () => {
    const events1: any[] = [];
    const events2: any[] = [];

    const viewer1 = manager.createViewer('match1', 'Brain1', 'Brain2');
    const viewer2 = manager.createViewer('match2', 'Brain3', 'Brain4');

    viewer1.subscribe((event) => {
      events1.push(event);
    });

    viewer2.subscribe((event) => {
      events2.push(event);
    });

    viewer1.updateState({ currentTick: 10 });
    viewer2.updateState({ currentTick: 20 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0].data.currentTick).toBe(10);
    expect(events2[0].data.currentTick).toBe(20);
  });
});
