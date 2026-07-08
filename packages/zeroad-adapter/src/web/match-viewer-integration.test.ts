/**
 * Test: Match Viewer Integration
 *
 * Validates:
 * 1. Viewer callbacks for decisions and observations
 * 2. Match result binding to viewer
 * 3. Result-to-viewer state conversion
 */

import { describe, it, expect } from 'vitest';
import {
  createViewerIntegration,
  bindMatchResultToViewer,
  matchResultToViewerState,
} from './match-viewer-integration.js';
import { MatchViewer } from './match-viewer.js';
import type { LiveMatchResult } from '../match/live-match-runner.js';
import type { DecisionEvent } from '../match/decision-overlay.js';

describe('Match Viewer Integration', () => {
  const mockDecision: DecisionEvent = {
    tick: 1,
    timestamp: Date.now(),
    player: 'player1',
    brainName: 'Brain1',
    reasoning: 'test',
    commands: ['move'],
    commandCount: 1,
    durationMs: 100,
  };

  it('should create viewer integration callbacks', () => {
    const viewer = new MatchViewer('match1', 'Brain1', 'Brain2');
    const integration = createViewerIntegration(viewer);

    expect(integration.onDecision).toBeDefined();
    expect(integration.onObserve).toBeDefined();
  });

  it('should record decisions through integration', async () => {
    const viewer = new MatchViewer('match1', 'Brain1', 'Brain2');
    const integration = createViewerIntegration(viewer);

    const events: any[] = [];
    viewer.subscribe((event) => {
      events.push(event);
    });

    integration.onDecision(mockDecision);

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(events.length).toBeGreaterThan(0);
    const decisionEvent = events.find((e) => e.type === 'decision');
    expect(decisionEvent).toBeDefined();
  });

  it('should update tick on decision', async () => {
    const viewer = new MatchViewer('match1', 'Brain1', 'Brain2');
    const integration = createViewerIntegration(viewer);

    integration.onDecision(mockDecision);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = viewer.getState();
    expect(state.currentTick).toBe(1);
  });

  it('should handle observations and update timeline', async () => {
    const viewer = new MatchViewer('match1', 'Brain1', 'Brain2');
    const integration = createViewerIntegration(viewer);

    // Mock observation state
    const mockObservationState = {
      tick: 5,
      gameState: {
        time: { tick: 5, totalTime: 5000, isPaused: false },
        players: [],
        teams: [],
        agents: [],
        map: { width: 256, height: 256, terrain: 'grassland', customData: {} },
        customData: {},
      },
      timeline: {
        getSnapshots: () => [{ tick: 5 }],
        analyzeProgression: () => ({
          unitCountTrend: 'increasing' as const,
          buildingCountTrend: 'stable' as const,
          totalSnapshots: 5,
          unitCountChange: 3,
          buildingCountChange: 0,
          totalTicks: 5,
          firstSnapshot: null,
          lastSnapshot: null,
        }),
      },
      decisions: [],
      isActive: true,
    };

    await integration.onObserve(mockObservationState as any);

    const state = viewer.getState();
    expect(state.currentTick).toBe(5);
    expect(state.timeline?.unitCountTrend).toBe('increasing');
  });

  it('should bind match result to viewer', async () => {
    const viewer = new MatchViewer('match1', 'Brain1', 'Brain2');

    const mockResult: LiveMatchResult = {
      success: true,
      winner: 'Brain1',
      ticksRan: 100,
      duration: 10000,
      player1: { name: 'Brain1', commandsExecuted: 50, errors: 2 },
      player2: { name: 'Brain2', commandsExecuted: 45, errors: 3 },
      overlay: {
        getStats: () => ({
          totalDecisions: 95,
          player1Decisions: 50,
          player2Decisions: 45,
          averageCommandsPerDecision: 1.0,
          latestTick: 100,
        }),
        getDecisions: () => [],
      } as any,
      timeline: {
        analyzeProgression: () => ({
          totalTicks: 100,
          totalSnapshots: 100,
          totalEvents: 200,
          unitCountTrend: 'increasing' as const,
          buildingCountTrend: 'increasing' as const,
          firstSnapshot: null,
          lastSnapshot: null,
          unitCountChange: 10,
          buildingCountChange: 5,
        }),
      } as any,
      observer: {} as any,
    };

    const events: any[] = [];
    viewer.subscribe((event) => {
      events.push(event);
    });

    bindMatchResultToViewer(viewer, mockResult);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = viewer.getState();
    expect(state.status).toBe('completed');
    expect(state.winner).toBe('Brain1');
    expect(state.totalTicks).toBe(100);

    const completeEvent = events.find((e) => e.type === 'complete');
    expect(completeEvent).toBeDefined();
  });

  it('should convert match result to viewer state', () => {
    const mockResult: LiveMatchResult = {
      success: true,
      winner: 'Brain1',
      ticksRan: 50,
      duration: 5000,
      player1: { name: 'Brain1', commandsExecuted: 25, errors: 1 },
      player2: { name: 'Brain2', commandsExecuted: 20, errors: 2 },
      overlay: {
        getStats: () => ({
          totalDecisions: 45,
          player1Decisions: 25,
          player2Decisions: 20,
          averageCommandsPerDecision: 0.9,
          latestTick: 50,
        }),
      } as any,
      timeline: {
        analyzeProgression: () => ({
          totalTicks: 50,
          totalSnapshots: 50,
          totalEvents: 100,
          unitCountTrend: 'stable' as const,
          buildingCountTrend: 'stable' as const,
          firstSnapshot: null,
          lastSnapshot: null,
          unitCountChange: 0,
          buildingCountChange: 0,
        }),
      } as any,
      observer: {} as any,
    };

    const state = matchResultToViewerState('match1', mockResult);

    expect(state.matchId).toBe('match1');
    expect(state.status).toBe('completed');
    expect(state.winner).toBe('Brain1');
    expect(state.brain1).toBe('Brain1');
    expect(state.brain2).toBe('Brain2');
    expect(state.player1Stats.commands).toBe(25);
    expect(state.player2Stats.errors).toBe(2);
    expect(state.decisionCount).toBe(45);
    expect(state.snapshotCount).toBe(50);
    expect(state.unitCountTrend).toBe('stable');
  });

  it('should handle missing player2 in result', () => {
    const mockResult: LiveMatchResult = {
      success: true,
      winner: 'Brain1',
      ticksRan: 50,
      duration: 5000,
      player1: { name: 'Brain1', commandsExecuted: 25, errors: 1 },
      overlay: {
        getStats: () => ({
          totalDecisions: 25,
          player1Decisions: 25,
          player2Decisions: 0,
          averageCommandsPerDecision: 1.0,
          latestTick: 50,
        }),
      } as any,
      timeline: {
        analyzeProgression: () => ({
          totalTicks: 50,
          totalSnapshots: 50,
          totalEvents: 50,
          unitCountTrend: 'increasing' as const,
          buildingCountTrend: 'increasing' as const,
          firstSnapshot: null,
          lastSnapshot: null,
          unitCountChange: 5,
          buildingCountChange: 2,
        }),
      } as any,
      observer: {} as any,
    };

    const state = matchResultToViewerState('match1', mockResult);

    expect(state.brain2).toBe('Unknown');
    expect(state.player2Stats.commands).toBe(0);
    expect(state.player2Stats.errors).toBe(0);
  });
});
