/**
 * Match Viewer Integration
 *
 * Connects live match execution to web viewer for real-time visualization.
 * - Routes decisions to viewer
 * - Routes state observations to viewer
 * - Synchronizes timeline data
 * - Handles match completion
 */
/**
 * Create viewer callbacks for live match integration
 */
export function createViewerIntegration(viewer) {
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
export function bindMatchResultToViewer(viewer, result) {
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
    viewer.recordMilestone(result.ticksRan, `Match complete: ${result.winner} won in ${result.duration}ms`);
}
/**
 * Create a view-ready snapshot from match result
 */
export function matchResultToViewerState(matchId, result) {
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
//# sourceMappingURL=match-viewer-integration.js.map