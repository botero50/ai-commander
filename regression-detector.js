#!/usr/bin/env node

/**
 * Regression Detector
 *
 * Story 73.3: Regression Detection
 *
 * Compares new model results with baseline.
 * Detects regressions in win rate, stability, latency.
 * Reports improvements using runtime evidence only.
 *
 * Usage:
 *   node regression-detector.js <baseline-file> <current-file>
 *   node regression-detector.js baseline.json arena-statistics.json
 */

import fs from 'fs';

class RegressionDetector {
  constructor(baselineFile, currentFile) {
    this.baselineFile = baselineFile;
    this.currentFile = currentFile;
    this.baseline = null;
    this.current = null;
  }

  /**
   * Load and analyze both statistics files
   */
  analyze() {
    console.log('\n🔍 Regression Detection Report\n');

    // Load files
    if (!fs.existsSync(this.baselineFile)) {
      console.error(`❌ Baseline file not found: ${this.baselineFile}`);
      return false;
    }

    if (!fs.existsSync(this.currentFile)) {
      console.error(`❌ Current file not found: ${this.currentFile}`);
      return false;
    }

    try {
      this.baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf-8'));
      this.current = JSON.parse(fs.readFileSync(this.currentFile, 'utf-8'));
    } catch (error) {
      console.error(`❌ Error reading files: ${error.message}`);
      return false;
    }

    // Run analysis
    this.compareMetrics();
    return true;
  }

  compareMetrics() {
    console.log('Comparing Baselines:');
    console.log('─'.repeat(70));

    // Baseline info
    console.log(`\nBaseline:`);
    console.log(`  Timestamp: ${this.baseline.timestamp}`);
    console.log(`  Games: ${this.baseline.gamesPlayed}`);

    console.log(`\nCurrent:`);
    console.log(`  Timestamp: ${this.current.timestamp}`);
    console.log(`  Games: ${this.current.gamesPlayed}`);

    // Win rate comparison
    const baselineWinRate = this.calculateWinRate(this.baseline);
    const currentWinRate = this.calculateWinRate(this.current);
    const winRateDiff = currentWinRate - baselineWinRate;

    console.log(`\n📊 Win Rate:`);
    console.log(`  Baseline: ${baselineWinRate.toFixed(1)}%`);
    console.log(`  Current:  ${currentWinRate.toFixed(1)}%`);
    console.log(`  Change:   ${winRateDiff > 0 ? '+' : ''}${winRateDiff.toFixed(1)}%`);

    if (Math.abs(winRateDiff) > 2) {
      if (winRateDiff > 0) {
        console.log(`  ✅ IMPROVEMENT: Win rate increased`);
      } else {
        console.log(`  ❌ REGRESSION: Win rate decreased`);
      }
    }

    // Stability comparison
    const baselineStability = this.calculateStability(this.baseline);
    const currentStability = this.calculateStability(this.current);
    const stabilityDiff = currentStability - baselineStability;

    console.log(`\n🛡️  Stability (Crash Recovery Rate):`);
    console.log(`  Baseline: ${baselineStability.toFixed(1)}%`);
    console.log(`  Current:  ${currentStability.toFixed(1)}%`);
    console.log(`  Change:   ${stabilityDiff > 0 ? '+' : ''}${stabilityDiff.toFixed(1)}%`);

    if (Math.abs(stabilityDiff) > 1) {
      if (stabilityDiff > 0) {
        console.log(`  ✅ IMPROVEMENT: Better stability`);
      } else {
        console.log(`  ❌ REGRESSION: Lower stability`);
      }
    }

    // Latency comparison
    const baselineLatency = this.baseline.averageDecisionLatencyMs || 0;
    const currentLatency = this.current.averageDecisionLatencyMs || 0;
    const latencyDiff = currentLatency - baselineLatency;

    if (baselineLatency > 0 && currentLatency > 0) {
      console.log(`\n⏱️  Decision Latency:`);
      console.log(`  Baseline: ${baselineLatency}ms`);
      console.log(`  Current:  ${currentLatency}ms`);
      console.log(`  Change:   ${latencyDiff > 0 ? '+' : ''}${latencyDiff}ms`);

      if (Math.abs(latencyDiff) > 5) {
        if (latencyDiff < 0) {
          console.log(`  ✅ IMPROVEMENT: Faster decisions`);
        } else {
          console.log(`  ❌ REGRESSION: Slower decisions`);
        }
      }
    }

    // Illegal moves comparison
    const baselineIllegal = this.baseline.illegalMoveRetries || 0;
    const currentIllegal = this.current.illegalMoveRetries || 0;
    const illegalDiff = currentIllegal - baselineIllegal;

    if (baselineIllegal > 0 || currentIllegal > 0) {
      console.log(`\n⚖️  Illegal Move Rate:`);
      console.log(`  Baseline: ${baselineIllegal}`);
      console.log(`  Current:  ${currentIllegal}`);
      console.log(`  Change:   ${illegalDiff > 0 ? '+' : ''}${illegalDiff}`);

      if (illegalDiff !== 0) {
        if (illegalDiff < 0) {
          console.log(`  ✅ IMPROVEMENT: Fewer illegal moves`);
        } else {
          console.log(`  ❌ REGRESSION: More illegal moves`);
        }
      }
    }

    // Games per hour comparison
    const baselineRate = this.baseline.gamesPerHour || 0;
    const currentRate = this.current.gamesPerHour || 0;
    const rateDiff = currentRate - baselineRate;

    if (baselineRate > 0 && currentRate > 0) {
      console.log(`\n⚡ Games Per Hour:`);
      console.log(`  Baseline: ${baselineRate}`);
      console.log(`  Current:  ${currentRate}`);
      console.log(`  Change:   ${rateDiff > 0 ? '+' : ''}${rateDiff.toFixed(1)}`);

      if (Math.abs(rateDiff) > 1) {
        if (rateDiff > 0) {
          console.log(`  ✅ IMPROVEMENT: Faster game execution`);
        } else {
          console.log(`  ⚠️  SLOWER: Game execution slowed`);
        }
      }
    }

    // Summary
    this.generateSummary(winRateDiff, stabilityDiff, latencyDiff, illegalDiff);
  }

  calculateWinRate(stats) {
    const totalWins = stats.whiteWins + stats.blackWins;
    const totalGames = stats.gamesPlayed;
    return totalGames > 0 ? (totalWins / totalGames * 100) : 0;
  }

  calculateStability(stats) {
    const attempts = stats.totalRecoveryAttempts || 0;
    const successes = stats.recoveryCount || 0;
    return attempts > 0 ? (successes / attempts * 100) : 100;
  }

  generateSummary(winRateDiff, stabilityDiff, latencyDiff, illegalDiff) {
    console.log('\n' + '═'.repeat(70));
    console.log('Summary:\n');

    let regressions = [];
    let improvements = [];

    if (winRateDiff < -2) regressions.push(`Win rate down ${Math.abs(winRateDiff).toFixed(1)}%`);
    if (winRateDiff > 2) improvements.push(`Win rate up ${winRateDiff.toFixed(1)}%`);

    if (stabilityDiff < -1) regressions.push(`Stability down ${Math.abs(stabilityDiff).toFixed(1)}%`);
    if (stabilityDiff > 1) improvements.push(`Stability up ${stabilityDiff.toFixed(1)}%`);

    if (latencyDiff > 5) regressions.push(`Latency up ${latencyDiff}ms`);
    if (latencyDiff < -5) improvements.push(`Latency down ${Math.abs(latencyDiff)}ms`);

    if (illegalDiff > 0) regressions.push(`Illegal moves up ${illegalDiff}`);
    if (illegalDiff < 0) improvements.push(`Illegal moves down ${Math.abs(illegalDiff)}`);

    if (regressions.length === 0 && improvements.length === 0) {
      console.log('✅ No significant changes detected\n');
    } else {
      if (improvements.length > 0) {
        console.log('✅ Improvements:');
        improvements.forEach(imp => console.log(`   • ${imp}`));
      }

      if (regressions.length > 0) {
        console.log('\n❌ Regressions:');
        regressions.forEach(reg => console.log(`   • ${reg}`));
      }
    }

    console.log('\n' + '═'.repeat(70) + '\n');

    // Save report
    const reportFile = `regression_report_${Date.now()}.json`;
    const report = {
      timestamp: new Date().toISOString(),
      baseline: this.baselineFile,
      current: this.currentFile,
      improvements,
      regressions,
      metrics: {
        winRateDiff,
        stabilityDiff,
        latencyDiff,
        illegalMoveDiff: illegalDiff,
      },
    };

    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportFile}\n`);
  }
}

// Main execution
const baselineFile = process.argv[2];
const currentFile = process.argv[3];

if (!baselineFile || !currentFile) {
  console.log(`Usage: node regression-detector.js <baseline-file> <current-file>`);
  console.log(`Example: node regression-detector.js baseline.json arena-statistics.json`);
  process.exit(1);
}

const detector = new RegressionDetector(baselineFile, currentFile);
if (!detector.analyze()) {
  process.exit(1);
}

export { RegressionDetector };
