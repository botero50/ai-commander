/**
 * Match Viewer Integration
 *
 * Connects live match execution to web viewer for real-time visualization.
 * - Routes decisions to viewer
 * - Routes state observations to viewer
 * - Synchronizes timeline data
 * - Handles match completion
 */

import { MatchViewer } from './match-viewer.js';
import type { LiveMatchResult } from '../match/live-match-runner.js';
import type { DecisionSubscriber } from '../match/decision-overlay.js';
import type { ObserverCallback } from '../match/match-observer.js';

/**
 * Create viewer callbacks for live match integration
 */
export function createViewerIntegration(viewer: MatchViewer): {
  readonly onDecision: DecisionSubscriber;
  readonly onObserve: ObserverCallback;
} {
  return {
    onDecision: (decision) => {
      viewer.recordDecision(decision);

      // Update latest player stats in viewer
      const overlay = decision.tick; // Approximate
      viewer.updateState({
        currentTick: decision.tick,
      });
    },

    onObserve: async (state) => {
      // Extract timeline analysis
      const analysis = state.timeline.analyzeProgression();

      // Update viewer state with game progress
      viewer.updateState({
        currentTick: state.tick,
        timeline: {
          unitCountTrend: analysis.unitCountTrend,
          buildingCountTrend: analysis.buildingCountTrend,
          totalSnapshots: analysis.totalSnapshots,
        },
      });
    },
  };
}

/**
 * Bind match result to viewer for completion
 */
export function bindMatchResultToViewer(viewer: MatchViewer, result: LiveMatchResult): void {
  const stats = result.overlay.getStats();

  viewer.complete({
    status: 'completed',
    totalTicks: result.ticksRan,
    duration: result.duration,
    winner: result.winner,
    player1Stats: {
      commands: result.player1.commandsExecuted,
      errors: result.player1.errors,
    },
    player2Stats: {
      commands: result.player2?.commandsExecuted ?? 0,
      errors: result.player2?.errors ?? 0,
    },
  });

  // Record final milestone
  viewer.recordMilestone(
    result.ticksRan,
    `Match complete: ${result.winner} won in ${result.duration}ms`
  );
}

/**
 * Create a view-ready snapshot from match result
 */
export function matchResultToViewerState(
  matchId: string,
  result: LiveMatchResult
): {
  matchId: string;
  status: 'completed';
  currentTick: number;
  totalTicks: number;
  duration: number;
  winner: string | undefined;
  brain1: string;
  brain2: string;
  player1Stats: { commands: number; errors: number };
  player2Stats: { commands: number; errors: number };
  decisionCount: number;
  snapshotCount: number;
  unitCountTrend: 'increasing' | 'decreasing' | 'stable';
  buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
} {
  const overlayStats = result.overlay.getStats();
  const timelineAnalysis = result.timeline.analyzeProgression();

  return {
    matchId,
    status: 'completed',
    currentTick: result.ticksRan,
    totalTicks: result.ticksRan,
    duration: result.duration,
    winner: result.winner,
    brain1: result.player1.name,
    brain2: result.player2?.name ?? 'Unknown',
    player1Stats: {
      commands: result.player1.commandsExecuted,
      errors: result.player1.errors,
    },
    player2Stats: {
      commands: result.player2?.commandsExecuted ?? 0,
      errors: result.player2?.errors ?? 0,
    },
    decisionCount: overlayStats.totalDecisions,
    snapshotCount: timelineAnalysis.totalSnapshots,
    unitCountTrend: timelineAnalysis.unitCountTrend,
    buildingCountTrend: timelineAnalysis.buildingCountTrend,
  };
}
