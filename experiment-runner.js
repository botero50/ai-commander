#!/usr/bin/env node

/**
 * Experiment Runner
 *
 * Story 73.2: Experiment Runner
 *
 * Runs automated experiments of N games.
 * Collects statistics.
 * Generates experiment summaries.
 *
 * Usage:
 *   node experiment-runner.js 10    # Run 10 game experiment
 *   node experiment-runner.js 50    # Run 50 game experiment
 *   node experiment-runner.js 100   # Run 100 game experiment
 */

import fs from 'fs';

class ExperimentRunner {
  constructor(numGames) {
    this.numGames = numGames;
    this.experimentId = `exp_${Date.now()}`;
    this.startTime = Date.now();
    this.statsFile = 'arena-statistics.json';
  }

  /**
   * Run an experiment by reading initial stats and watching for completion
   */
  async runExperiment() {
    console.log('\n🧪 Experiment Runner\n');
    console.log(`Target Games: ${this.numGames}`);
    console.log(`Experiment ID: ${this.experimentId}`);
    console.log(`Arena must be running: pnpm chess`);
    console.log('\nMonitoring for game completion...\n');

    // Read initial stats
    const initialStats = this.readStats();
    const initialGames = initialStats?.gamesPlayed || 0;
    const targetGames = initialGames + this.numGames;

    console.log(`Initial Games: ${initialGames}`);
    console.log(`Target Games: ${targetGames}\n`);

    // Monitor progress
    let completed = false;
    let lastCheck = initialGames;

    while (!completed) {
      await this.delay(5000); // Check every 5 seconds

      const currentStats = this.readStats();
      if (!currentStats) {
        console.log('⏳ Waiting for arena to start...');
        continue;
      }

      const currentGames = currentStats.gamesPlayed || 0;
      const gamesThisExperiment = currentGames - initialGames;
      const progress = Math.min(100, Math.round((gamesThisExperiment / this.numGames) * 100));

      if (currentGames > lastCheck) {
        console.log(`[${new Date().toLocaleTimeString()}] Progress: ${gamesThisExperiment}/${this.numGames} games (${progress}%)`);
        lastCheck = currentGames;
      }

      if (gamesThisExperiment >= this.numGames) {
        completed = true;
      }
    }

    // Experiment complete
    this.generateSummary(initialStats);
  }

  readStats() {
    try {
      if (!fs.existsSync(this.statsFile)) {
        return null;
      }
      const data = fs.readFileSync(this.statsFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  generateSummary(initialStats) {
    const finalStats = this.readStats();
    if (!finalStats) {
      console.error('❌ Could not read final statistics');
      return;
    }

    const experimentTime = Math.round((Date.now() - this.startTime) / 1000);
    const initialGames = initialStats?.gamesPlayed || 0;
    const finalGames = finalStats.gamesPlayed;
    const gamesDiff = finalGames - initialGames;

    // Extract games from this experiment
    const experimentGames = finalStats.recentGames.filter(g => {
      const gameNum = g.gameNumber || 0;
      return gameNum > initialGames && gameNum <= finalGames;
    });

    // Calculate metrics
    const whiteWins = experimentGames.filter(g => g.result === 'white-win').length;
    const blackWins = experimentGames.filter(g => g.result === 'black-win').length;
    const draws = experimentGames.filter(g => g.result === 'draw').length;
    const totalMoves = experimentGames.reduce((sum, g) => sum + (g.moves || 0), 0);
    const avgMoves = experimentGames.length > 0 ? Math.round(totalMoves / experimentGames.length) : 0;
    const totalDuration = experimentGames.reduce((sum, g) => sum + (g.durationSec || 0), 0);
    const avgDuration = experimentGames.length > 0 ? (totalDuration / experimentGames.length).toFixed(1) : 0;

    console.log('\n\n✅ Experiment Complete\n');
    console.log('═'.repeat(60));
    console.log(`Experiment ID: ${this.experimentId}`);
    console.log(`Duration: ${experimentTime}s (${(experimentTime / 60).toFixed(1)}m)`);
    console.log(`Games Played: ${gamesDiff}`);
    console.log('═'.repeat(60));

    console.log('\n📊 Results:');
    console.log(`   White Wins: ${whiteWins} (${(whiteWins / gamesDiff * 100).toFixed(1)}%)`);
    console.log(`   Black Wins: ${blackWins} (${(blackWins / gamesDiff * 100).toFixed(1)}%)`);
    console.log(`   Draws: ${draws} (${(draws / gamesDiff * 100).toFixed(1)}%)`);
    console.log(`   Average Moves: ${avgMoves}`);
    console.log(`   Average Duration: ${avgDuration}s`);

    // Runtime metrics
    if (finalStats.averageDecisionLatencyMs) {
      console.log(`   Avg Decision Latency: ${finalStats.averageDecisionLatencyMs}ms`);
    }

    if (finalStats.illegalMoveRetries) {
      console.log(`   Illegal Moves: ${finalStats.illegalMoveRetries}`);
    }

    if (finalStats.recoveryCount !== undefined) {
      console.log(`   Successful Recoveries: ${finalStats.recoveryCount}`);
    }

    // Save experiment summary
    const summary = {
      experimentId: this.experimentId,
      timestamp: new Date().toISOString(),
      targetGames: this.numGames,
      actualGames: gamesDiff,
      durationSeconds: experimentTime,
      results: {
        whiteWins,
        blackWins,
        draws,
        avgMoves,
        avgDurationSec: parseFloat(avgDuration),
      },
      metrics: {
        decisionLatency: finalStats.averageDecisionLatencyMs,
        illegalMoves: finalStats.illegalMoveRetries,
        recoveries: finalStats.recoveryCount,
      },
    };

    const summaryFile = `experiment_${this.experimentId}.json`;
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    console.log(`\n📁 Summary saved to ${summaryFile}\n`);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
const numGames = parseInt(process.argv[2]);

if (!numGames || isNaN(numGames) || numGames < 1) {
  console.log(`Usage: node experiment-runner.js <num-games>`);
  console.log(`Examples:`);
  console.log(`   node experiment-runner.js 10   # Run 10 game experiment`);
  console.log(`   node experiment-runner.js 50   # Run 50 game experiment`);
  console.log(`   node experiment-runner.js 100  # Run 100 game experiment`);
  process.exit(1);
}

const runner = new ExperimentRunner(numGames);
runner.runExperiment().catch(error => {
  console.error(`❌ Experiment error: ${error.message}`);
  process.exit(1);
});

export { ExperimentRunner };
