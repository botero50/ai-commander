/**
 * Replay Player — Compare two brains side-by-side on same map/seed
 *
 * Provides:
 * 1. Load replay data from MatchReplay
 * 2. Side-by-side tick navigation
 * 3. Compare decisions, commands, outcomes
 * 4. Timeline visualization
 * 5. Divergence analysis (where paths differ)
 */
/**
 * ReplayPlayer: Analyze and compare match replays
 */
export class ReplayPlayer {
    static analyze(replay) {
        const divergences = [];
        const keyMoments = new Set();
        for (const tick of replay.trace) {
            const redGoal = tick.redDecision.selectedGoal;
            const blueGoal = tick.blueDecision.selectedGoal;
            const redCmds = tick.redExecuted;
            const blueCmds = tick.blueExecuted;
            // Divergence: different goal choice
            if (redGoal !== blueGoal) {
                divergences.push({
                    tickNumber: tick.tickNumber,
                    redGoal,
                    blueGoal,
                    redCommands: redCmds,
                    blueCommands: blueCmds,
                    reasoning: `Red chose ${redGoal}, Blue chose ${blueGoal}`,
                });
                keyMoments.add(tick.tickNumber);
            }
            // Divergence: different commands despite same goal
            if (redGoal === blueGoal && !this.arraysEqual(redCmds, blueCmds)) {
                divergences.push({
                    tickNumber: tick.tickNumber,
                    redGoal,
                    blueGoal,
                    redCommands: redCmds,
                    blueCommands: blueCmds,
                    reasoning: `Both chose ${redGoal} but executed different commands`,
                });
                keyMoments.add(tick.tickNumber);
            }
            // Key moment: health change
            if (tick.tickNumber > 0) {
                const prev = replay.trace[tick.tickNumber - 1];
                if (prev.redState.agent.health !== tick.redState.agent.health ||
                    prev.blueState.agent.health !== tick.blueState.agent.health) {
                    keyMoments.add(tick.tickNumber);
                }
            }
            // Key moment: resource change
            if (tick.tickNumber > 0) {
                const prev = replay.trace[tick.tickNumber - 1];
                if (Math.abs(prev.redState.agent.resources - tick.redState.agent.resources) > 10 ||
                    Math.abs(prev.blueState.agent.resources - tick.blueState.agent.resources) > 10) {
                    keyMoments.add(tick.tickNumber);
                }
            }
        }
        return {
            replay,
            divergences,
            keyMoments: Array.from(keyMoments).sort((a, b) => a - b),
        };
    }
    static getTickFrame(replay, tickNumber) {
        return replay.trace.find((t) => t.tickNumber === tickNumber);
    }
    static compareDecisions(tick) {
        const similarGoals = tick.redDecision.selectedGoal === tick.blueDecision.selectedGoal;
        const similarCommands = this.arraysEqual(tick.redExecuted, tick.blueExecuted);
        return {
            redConfidence: tick.redDecision.confidence,
            blueConfidence: tick.blueDecision.confidence,
            similarGoals,
            similarCommands,
        };
    }
    static getTimeline(replay) {
        const divergenceSet = new Set();
        for (const tick of replay.trace) {
            if (tick.redDecision.selectedGoal !== tick.blueDecision.selectedGoal) {
                divergenceSet.add(tick.tickNumber);
            }
        }
        return replay.trace.map((tick) => ({
            tick: tick.tickNumber,
            redHealth: tick.redState.agent.health,
            blueHealth: tick.blueState.agent.health,
            redResources: tick.redState.agent.resources,
            blueResources: tick.blueState.agent.resources,
            divergence: divergenceSet.has(tick.tickNumber),
        }));
    }
    static generateHTML(comparison) {
        const timeline = this.getTimeline(comparison.replay);
        const timelineHtml = timeline
            .map((frame) => {
            const divergenceClass = frame.divergence ? 'divergence' : '';
            return `
        <div class="timeline-frame ${divergenceClass}" data-tick="${frame.tick}">
          <div class="tick-number">${frame.tick}</div>
          <div class="health">
            <span class="red">${frame.redHealth.toFixed(0)}</span>
            <span class="blue">${frame.blueHealth.toFixed(0)}</span>
          </div>
          <div class="resources">
            <span class="red">${frame.redResources.toFixed(0)}</span>
            <span class="blue">${frame.blueResources.toFixed(0)}</span>
          </div>
        </div>
      `;
        })
            .join('');
        const divergencesHtml = comparison.divergences
            .map((d) => `
      <div class="divergence-item">
        <strong>Tick ${d.tickNumber}:</strong> ${d.reasoning}
        <br/>Red: ${d.redCommands.join(', ')} | Blue: ${d.blueCommands.join(', ')}
      </div>
    `)
            .join('');
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Match Replay Comparison</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
          .container { max-width: 1400px; margin: 0 auto; }
          h1 { color: #333; }
          .match-info { background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .info-row { display: flex; gap: 30px; margin-bottom: 10px; }
          .info-col { flex: 1; }
          .info-col strong { color: #666; }
          .timeline-container { background: white; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
          .timeline-frames { display: flex; flex-wrap: wrap; gap: 5px; }
          .timeline-frame { width: 60px; padding: 8px; text-align: center; font-size: 11px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
          .timeline-frame:hover { background: #e8e8e8; }
          .timeline-frame.divergence { background: #fff3cd; border-color: #ffc107; }
          .tick-number { font-weight: bold; margin-bottom: 4px; }
          .health, .resources { display: flex; gap: 8px; }
          .health span, .resources span { flex: 1; }
          .red { color: #d32f2f; }
          .blue { color: #1976d2; }
          .divergences { background: white; padding: 15px; border-radius: 5px; }
          .divergence-item { padding: 10px; margin-bottom: 10px; background: #fff9e6; border-left: 4px solid #ffc107; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Match Replay Comparison</h1>

          <div class="match-info">
            <div class="info-row">
              <div class="info-col">
                <strong>Red:</strong> ${comparison.replay.metrics.redPlayer}
              </div>
              <div class="info-col">
                <strong>Blue:</strong> ${comparison.replay.metrics.bluePlayer}
              </div>
              <div class="info-col">
                <strong>Winner:</strong> <span class="${comparison.replay.metrics.winner === 'red' ? 'red' : comparison.replay.metrics.winner === 'blue' ? 'blue' : 'neutral'}">${comparison.replay.metrics.winner.toUpperCase()}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-col">
                <strong>Total Ticks:</strong> ${comparison.replay.metrics.totalTicks}
              </div>
              <div class="info-col">
                <strong>Duration:</strong> ${(comparison.replay.metrics.duration / 1000).toFixed(1)}s
              </div>
              <div class="info-col">
                <strong>Divergences:</strong> ${comparison.divergences.length}
              </div>
            </div>
          </div>

          <div class="timeline-container">
            <h2>Timeline (Divergences highlighted)</h2>
            <div class="timeline-frames">${timelineHtml}</div>
          </div>

          <div class="divergences">
            <h2>Decision Divergences</h2>
            ${divergencesHtml || '<p>No divergences found</p>'}
          </div>
        </div>
      </body>
      </html>
    `;
    }
    static arraysEqual(a, b) {
        if (a.length !== b.length)
            return false;
        return a.every((val, idx) => val === b[idx]);
    }
}
//# sourceMappingURL=replay-player.js.map