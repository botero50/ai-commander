/**
 * Test: Match View State Management
 *
 * Validates:
 * 1. State initialization
 * 2. State updates
 * 3. WebSocket message handling
 * 4. Listener subscriptions
 * 5. Reconnection logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchViewStateManager } from './match-view-state.js';
import type { DecisionEvent } from '../match/decision-overlay.js';

describe('Match View State Manager', () => {
  let manager: MatchViewStateManager;

  beforeEach(() => {
    manager = new MatchViewStateManager('match1', 'Brain1', 'Brain2');
  });

  it('should initialize with defaults', () => {
    const state = manager.getState();

    expect(state.matchId).toBe('match1');
    expect(state.brain1).toBe('Brain1');
    expect(state.brain2).toBe('Brain2');
    expect(state.status).toBe('starting');
    expect(state.isConnected).toBe(false);
    expect(state.currentTick).toBe(0);
  });

  it('should subscribe to state changes', async () => {
    const states: any[] = [];

    manager.subscribe((state) => {
      states.push(state);
    });

    const state = manager.getState();
    // Initial state is not sent on subscribe
    expect(states).toHaveLength(0);
  });

  it('should handle initial state message', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    // Simulate initial state message
    const initialState = {
      status: 'running' as const,
      currentTick: 0,
      totalTicks: 1000,
    };

    (manager as any).handleInitialState(initialState);

    expect(updates).toHaveLength(1);
    expect(updates[0].status).toBe('running');
    expect(updates[0].totalTicks).toBe(1000);
  });

  it('should handle state updates', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    (manager as any).handleStateUpdate({ currentTick: 50 });
    (manager as any).handleStateUpdate({ currentTick: 100 });

    expect(updates).toHaveLength(2);
    expect(updates[1].currentTick).toBe(100);
  });

  it('should handle decision events', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    const decision: DecisionEvent = {
      tick: 1,
      timestamp: Date.now(),
      player: 'player1',
      brainName: 'Brain1',
      reasoning: 'test',
      commands: ['move'],
      commandCount: 1,
      durationMs: 100,
    };

    (manager as any).handleDecision(decision);

    expect(updates).toHaveLength(1);
    expect(updates[0].latestDecisions).toHaveLength(1);
    expect(updates[0].latestDecisions[0].brainName).toBe('Brain1');
  });

  it('should keep only last 5 decisions', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    for (let i = 1; i <= 10; i++) {
      const decision: DecisionEvent = {
        tick: i,
        timestamp: Date.now(),
        player: 'player1',
        brainName: 'Brain1',
        reasoning: 'test',
        commands: [],
        commandCount: 0,
        durationMs: 100,
      };

      (manager as any).handleDecision(decision);
    }

    const finalState = updates[updates.length - 1];
    expect(finalState.latestDecisions).toHaveLength(5);
    expect(finalState.latestDecisions[0].tick).toBe(6);
    expect(finalState.latestDecisions[4].tick).toBe(10);
  });

  it('should handle completion', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    (manager as any).handleComplete({
      status: 'completed',
      winner: 'Brain1',
      totalTicks: 500,
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].status).toBe('completed');
    expect(updates[0].winner).toBe('Brain1');
  });

  it('should support multiple subscribers', async () => {
    const updates1: any[] = [];
    const updates2: any[] = [];

    manager.subscribe((state) => {
      updates1.push(state);
    });

    manager.subscribe((state) => {
      updates2.push(state);
    });

    (manager as any).handleStateUpdate({ currentTick: 10 });

    expect(updates1).toHaveLength(1);
    expect(updates2).toHaveLength(1);
  });

  it('should support unsubscription', async () => {
    const updates: any[] = [];

    const unsubscribe = manager.subscribe((state) => {
      updates.push(state);
    });

    (manager as any).handleStateUpdate({ currentTick: 10 });
    expect(updates).toHaveLength(1);

    unsubscribe();
    (manager as any).handleStateUpdate({ currentTick: 20 });
    expect(updates).toHaveLength(1); // No new update
  });

  it('should preserve previous state values on partial update', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    (manager as any).handleStateUpdate({
      currentTick: 10,
      brain1: 'UpdatedBrain1',
    });

    const state = updates[0];
    expect(state.currentTick).toBe(10);
    expect(state.brain1).toBe('UpdatedBrain1');
    expect(state.brain2).toBe('Brain2'); // Preserved
  });

  it('should get current state', () => {
    (manager as any).updateState({ currentTick: 50 });

    const state = manager.getState();
    expect(state.currentTick).toBe(50);
    expect(state.matchId).toBe('match1');
  });

  it('should return immutable state', () => {
    const state = manager.getState();

    // Try to modify (should not affect internal state in strict environments)
    (state as any).currentTick = 999;

    const state2 = manager.getState();
    expect(state2.currentTick).not.toBe(999);
  });

  it('should initialize as not connected', () => {
    expect(manager.isConnected()).toBe(false);
  });

  it('should handle errors gracefully', async () => {
    const updates: any[] = [];

    manager.subscribe((state) => {
      updates.push(state);
    });

    (manager as any).handleError({ error: 'Test error' });

    expect(updates).toHaveLength(1);
    expect(updates[0].status).toBe('error');
    expect(updates[0].error).toBe('Test error');
  });
});
