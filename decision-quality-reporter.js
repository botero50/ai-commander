#!/usr/bin/env node

/**
 * Decision Quality Reporter
 *
 * Story 73.4: Decision Quality
 *
 * Analyzes decision quality from game records.
 * Reduces illegal moves, hallucinations, repeated positions.
 * Reports on move legality, decision accuracy.
 *
 * Usage:
 *   node decision-quality-reporter.js
 */

import fs from 'fs';

class DecisionQualityReporter {
  constructor(statsFile = 'arena-statistics.json') {
    this.statsFile = statsFile;
  }

  /**
   * Generate decision quality report
   */
  generateReport() {
    console.log('\n📈 Decision Quality Report\n');

    if (!fs.existsSync(this.statsFile)) {
      console.error(`❌ Statistics file not found: ${this.statsFile}`);
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
      this.analyzeQuality(data);
    } catch (error) {
      console.error(`Error reading file: ${error.message}`);
    }
  }

  analyzeQuality(stats) {
    console.log('Decision Quality Metrics:');
    console.log('─'.repeat(70));

    // Legal move compliance
    const totalGames = stats.gamesPlayed || 0;
    const illegalMoveRetries = stats.illegalMoveRetries || 0;
    const illegalMoveRate = totalGames > 0 ? (illegalMoveRetries / (totalGames * 25) * 100).toFixed(2) : 0;

    console.log(`\n✅ Move Legality:`);
    console.log(`   Games: ${totalGames}`);
    console.log(`   Illegal Move Attempts: ${illegalMoveRetries}`);
    console.log(`   Illegal Move Rate: ${illegalMoveRate}%`);

    if (illegalMoveRate == 0) {
      console.log(`   ✅ EXCELLENT: 100% legal moves`);
    } else if (illegalMoveRate < 1) {
      console.log(`   ✅ GOOD: < 1% illegal moves`);
    } else {
      console.log(`   ⚠️  POOR: > 1% illegal moves (needs improvement)`);
    }

    // Decision latency
    const avgLatency = stats.averageDecisionLatencyMs || 0;
    console.log(`\n⏱️  Decision Latency:`);
    console.log(`   Average: ${avgLatency}ms`);

    if (avgLatency < 1000) {
      console.log(`   ✅ FAST: < 1s per move`);
    } else if (avgLatency < 3000) {
      console.log(`   ✅ GOOD: 1-3s per move`);
    } else if (avgLatency < 5000) {
      console.log(`   ⚠️  SLOW: 3-5s per move`);
    } else {
      console.log(`   ❌ VERY SLOW: > 5s per move (optimize needed)`);
    }

    // Game completion rate
    const avgMoves = stats.averageMoves || 0;
    const avgDuration = stats.averageDurationSec || 0;

    console.log(`\n🎮 Game Completion:`);
    console.log(`   Average Moves: ${avgMoves}`);
    console.log(`   Average Duration: ${avgDuration}s`);
    console.log(`   Average Moves/Min: ${avgMoves > 0 ? (avgMoves / (avgDuration / 60)).toFixed(1) : 'N/A'}`);

    if (avgMoves > 10) {
      console.log(`   ✅ GOOD: Games reach mid-game`);
    } else if (avgMoves < 5) {
      console.log(`   ❌ POOR: Games end too early (check for bugs)`);
    }

    // Timeout analysis
    const timeouts = stats.timeoutCount || 0;
    console.log(`\n⏰ Reliability:`);
    console.log(`   Timeouts: ${timeouts}`);
    console.log(`   Recovery Successes: ${stats.recoveryCount || 0}`);

    if (timeouts === 0) {
      console.log(`   ✅ EXCELLENT: No timeouts`);
    } else {
      console.log(`   ⚠️  UNSTABLE: ${timeouts} timeout(s) detected`);
    }

    // Score overall decision quality
    let qualityScore = 100;
    if (illegalMoveRate > 0) qualityScore -= Math.min(20, illegalMoveRate * 10);
    if (avgLatency > 5000) qualityScore -= 10;
    if (avgMoves < 5) qualityScore -= 10;
    if (timeouts > 0) qualityScore -= Math.min(15, timeouts * 5);

    console.log('\n' + '═'.repeat(70));
    console.log(`\n📊 Overall Quality Score: ${qualityScore.toFixed(0)}/100\n`);

    if (qualityScore >= 90) {
      console.log('✅ EXCELLENT: Ready for production\n');
    } else if (qualityScore >= 75) {
      console.log('🟡 GOOD: Most metrics acceptable\n');
    } else if (qualityScore >= 50) {
      console.log('⚠️  FAIR: Several improvements needed\n');
    } else {
      console.log('❌ POOR: Significant improvements needed\n');
    }

    // Recommendations
    this.generateRecommendations(stats, qualityScore);
  }

  generateRecommendations(stats, score) {
    console.log('Recommendations:');
    console.log('─'.repeat(70));

    const recommendations = [];

    if ((stats.illegalMoveRetries || 0) > 0) {
      recommendations.push('• Reduce illegal move generation (check prompt clarity)');
    }

    if ((stats.averageDecisionLatencyMs || 0) > 5000) {
      recommendations.push('• Optimize decision latency (reduce move timeout or prompt complexity)');
    }

    if ((stats.averageMoves || 0) < 5) {
      recommendations.push('• Investigate early game termination (check endgame detection)');
    }

    if ((stats.timeoutCount || 0) > 0) {
      recommendations.push('• Address timeout issues (increase timeout or optimize Ollama config)');
    }

    if ((stats.gamesPerHour || 0) < 20) {
      recommendations.push('• Performance optimization may help throughput');
    }

    if (recommendations.length === 0) {
      console.log('✅ No immediate improvements needed\n');
    } else {
      recommendations.forEach(rec => console.log(rec));
      console.log('');
    }

    // Save report
    const reportFile = `decision_quality_${Date.now()}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      qualityScore,
      metrics: {
        illegalMoveRate: (stats.illegalMoveRetries || 0),
        decisionLatency: stats.averageDecisionLatencyMs,
        averageMoves: stats.averageMoves,
        timeouts: stats.timeoutCount,
        recoveries: stats.recoveryCount,
      },
      recommendations,
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportFile}\n`);
  }
}

// Main execution
const reporter = new DecisionQualityReporter();
reporter.generateReport();

export { DecisionQualityReporter };
