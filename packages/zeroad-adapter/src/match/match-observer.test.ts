/**
 * Test: Match Observer
 *
 * Validates:
 * 1. Observer start/stop lifecycle
 * 2. Real-time state observation callbacks
 * 3. Timeline snapshot integration
 * 4. Latest decisions tracking
 * 5. Error handling and threshold
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchObserver, MatchObserverBuilder } from './match-observer.js';
import { MatchTimeline } from './match-timeline.js';
import { DecisionOverlay } from './decision-overlay.js';
import type { WorldState } from '@ai-commander/domain';

describe('Match Observer', () => {
  let timeline: MatchTimeline;
  let overlay: DecisionOverlay;
  let observer: MatchObserver;

  const mockGameState: WorldState = {
    time: { tick: 1, totalTime: 1000, isPaused: false },
    players: [
      {
        id: 'p1',
        name: 'Player 1',
        teamId: null,
        isHuman: false,
        customData: { resources: { gold: 500, wood: 300, stone: 200, metal: 100 } },
      },
      {
        id: 'p2',
        name: 'Player 2',
        teamId: null,
        isHuman: false,
        customData: { resources: { gold: 450, wood: 280, stone: 180, metal: 90 } },
      },
    ],
    teams: [],
    agents: [
      { id: 'a1', name: 'unit1', playerId: 'p1', position: { x: 100, y: 100 }, customData: {} },
      { id: 'a2', name: 'unit2', playerId: 'p1', position: { x: 110, y: 100 }, customData: {} },
    ],
    map: {
      width: 256,
      height: 256,
      terrain: 'grassland',
      customData: {},
    },
    customData: {},
  };

  beforeEach(() => {
    timeline = new MatchTimeline();
    overlay = new DecisionOverlay();
    observer = new MatchObserver(timeline, overlay);
  });

  it('should start and stop observing', () => {
    expect(observer.isActive()).toBe(false);

    observer.start();
    expect(observer.isActive()).toBe(true);

    observer.stop();
    expect(observer.isActive()).toBe(false);
  });

  it('should record observations when active', () => {
    observer.start();
    observer.recordObservation(1, mockGameState);

    expect(observer.getCurrentTick()).toBe(1);
    expect(timeline.getSnapshots()).toHaveLength(1);
  });

  it('should not record observations when inactive', () => {
    observer.recordObservation(1, mockGameState);

    expect(timeline.getSnapshots()).toHaveLength(0);
  });

  it('should notify observers of state changes', async () => {
    const states: any[] = [];

    observer.subscribe((state) => {
      states.push(state);
    });

    observer.start();
    observer.recordObservation(1, mockGameState);
    observer.recordObservation(2, mockGameState);

    // Give async callbacks time to process
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(states).toHaveLength(2);
    expect(states[0].tick).toBe(1);
    expect(states[1].tick).toBe(2);
  });

  it('should include timeline and decisions in observation', async () => {
    const observedStates: any[] = [];

    observer.subscribe((state) => {
      observedStates.push(state);
    });

    observer.start();

    // Add a decision
    overlay.recordDecision(1, 'player1', 'Brain1', 'test', ['cmd1'], 100);

    observer.recordObservation(1, mockGameState);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = observedStates[0];
    expect(state.timeline).toBeDefined();
    expect(state.decisions).toBeDefined();
    expect(state.decisions.length).toBeGreaterThan(0);
  });

  it('should support multiple observers', async () => {
    const observer1States: any[] = [];
    const observer2States: any[] = [];

    observer.subscribe((state) => {
      observer1States.push(state);
    });

    observer.subscribe((state) => {
      observer2States.push(state);
    });

    observer.start();
    observer.recordObservation(1, mockGameState);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(observer1States).toHaveLength(1);
    expect(observer2States).toHaveLength(1);
  });

  it('should support unsubscription', async () => {
    const states: any[] = [];

    const unsubscribe = observer.subscribe((state) => {
      states.push(state);
    });

    observer.start();
    observer.recordObservation(1, mockGameState);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(states).toHaveLength(1);

    unsubscribe();
    observer.recordObservation(2, mockGameState);

    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(states).toHaveLength(1); // No new state after unsubscribe
  });

  it('should track tick progression', () => {
    observer.start();
    expect(observer.getCurrentTick()).toBe(0);

    observer.recordObservation(1, mockGameState);
    expect(observer.getCurrentTick()).toBe(1);

    observer.recordObservation(10, mockGameState);
    expect(observer.getCurrentTick()).toBe(10);
  });

  it('should extract state from game world', () => {
    observer.start();
    observer.recordObservation(1, mockGameState);

    const snapshots = timeline.getSnapshots();
    expect(snapshots[0].gameState.playerCount).toBe(2);
    expect(snapshots[0].gameState.unitCount).toBeGreaterThan(0); // agentCount
  });

  it('should track error count', () => {
    observer.start();

    expect(observer.getErrorCount()).toBe(0);

    observer.subscribe(() => {
      throw new Error('Observer error');
    });

    observer.recordObservation(1, mockGameState);

    expect(observer.getErrorCount()).toBeGreaterThan(0);
  });

  it('should reset error count', () => {
    observer.start();

    observer.subscribe(() => {
      throw new Error('Observer error');
    });

    observer.recordObservation(1, mockGameState);
    expect(observer.getErrorCount()).toBeGreaterThan(0);

    observer.resetErrorCount();
    expect(observer.getErrorCount()).toBe(0);
  });

  it('should stop observation on excessive errors', () => {
    observer.start();

    // Add observer that always errors
    observer.subscribe(() => {
      throw new Error('Observer error');
    });

    // Trigger many observations to exceed error threshold
    for (let i = 0; i < 15; i++) {
      observer.recordObservation(i, mockGameState);
    }

    // Observer should be stopped due to error threshold
    expect(observer.isActive()).toBe(false);
  });
});

describe('Match Observer Builder', () => {
  it('should build observer with callbacks', async () => {
    const timeline = new MatchTimeline();
    const overlay = new DecisionOverlay();

    const states: any[] = [];

    const observer = new MatchObserverBuilder()
      .addObserver((state) => {
        states.push(state);
      })
      .addObserver((state) => {
        // Second observer
      })
      .build(timeline, overlay);

    observer.start();

    const mockState: WorldState = {
      time: { tick: 1, totalTime: 1000, isPaused: false },
      players: [],
      teams: [],
      agents: [],
      map: { width: 256, height: 256, terrain: 'grassland', customData: {} },
      customData: {},
    };

    observer.recordObservation(1, mockState);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(states).toHaveLength(1);
  });

  it('should chain builder calls', () => {
    const timeline = new MatchTimeline();
    const overlay = new DecisionOverlay();

    const builder = new MatchObserverBuilder();
    const result = builder
      .addObserver(() => {})
      .addObserver(() => {})
      .addObserver(() => {});

    expect(result).toBe(builder); // Chain support
  });
});
