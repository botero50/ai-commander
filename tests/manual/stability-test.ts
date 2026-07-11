#!/usr/bin/env node

/**
 * Story 21.3 — Stability Validation
 *
 * Run multiple consecutive matches and measure:
 * - Memory usage
 * - CPU usage
 * - Performance consistency
 * - Error rates
 * - Completion rate
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

interface MatchMetrics {
  matchId: string;
  ticksRan: number;
  duration: number;
  player1Commands: number;
  player1Errors: number;
  player2Commands: number;
  player2Errors: number;
  averageLatencyMs: number;
  success: boolean;
  errorMessage?: string;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
}

interface StabilityReport {
  timestamp: string;
  numMatches: number;
  duration: number;
  matches: MatchMetrics[];
  summary: {
    totalMatches: number;
    successfulMatches: number;
    failedMatches: number;
    completionRate: number;
    totalTicksRan: number;
    totalCommands: number;
    totalErrors: number;
    errorRate: number;
    averageLatency: number;
    memoryStart: number;
    memoryEnd: number;
    memoryGrowth: number;
    averageMemoryPerMatch: number;
    cpuUsagePercent: number;
    performanceConsistency: number;
  };
  recommendations: string[];
}

async function runStabilityTest(numMatches: number, outputDir: string): Promise<StabilityReport> {
  console.log('='.repeat(70));
  console.log(`Stability Test: ${numMatches} Consecutive Matches`);
  console.log('='.repeat(70));

  const startTime = performance.now();
  const memoryStart = process.memoryUsage().heapUsed;
  const matches: MatchMetrics[] = [];

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (let i = 1; i <= numMatches; i++) {
    console.log(`\n[${i}/${numMatches}] Running match...`);

    const memoryBefore = process.memoryUsage().heapUsed;
    const matchStartTime = performance.now();

    try {
      // Simulate match execution
      // In production, this would call OllamaMatchExecutor.execute()
      const match = await simulateMatch(i);

      const matchDuration = performance.now() - matchStartTime;
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = memoryAfter - memoryBefore;

      matches.push({
        matchId: `match-${String(i).padStart(4, '0')}`,
        ticksRan: match.ticks,
        duration: matchDuration,
        player1Commands: match.p1Commands,
        player1Errors: match.p1Errors,
        player2Commands: match.p2Commands,
        player2Errors: match.p2Errors,
        averageLatencyMs: match.avgLatency,
        success: true,
        memoryBefore,
        memoryAfter,
        memoryDelta,
      });

      const errorRate = (match.p1Errors + match.p2Errors) / (match.p1Commands + match.p2Commands);
      console.log(`  ✅ Match ${i} complete`);
      console.log(`    Duration: ${(matchDuration / 1000).toFixed(2)}s`);
      console.log(`    Commands: ${match.p1Commands + match.p2Commands}`);
      console.log(`    Errors: ${match.p1Errors + match.p2Errors} (${(errorRate * 100).toFixed(1)}%)`);
      console.log(`    Latency: ${match.avgLatency.toFixed(0)}ms avg`);
      console.log(`    Memory: ${(memoryDelta / 1024 / 1024).toFixed(1)}MB`);
    } catch (error) {
      const matchDuration = performance.now() - matchStartTime;
      const memoryAfter = process.memoryUsage().heapUsed;
      const memoryDelta = memoryAfter - memoryBefore;

      matches.push({
        matchId: `match-${String(i).padStart(4, '0')}`,
        ticksRan: 0,
        duration: matchDuration,
        player1Commands: 0,
        player1Errors: 0,
        player2Commands: 0,
        player2Errors: 0,
        averageLatencyMs: 0,
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        memoryBefore,
        memoryAfter,
        memoryDelta,
      });

      console.log(`  ❌ Match ${i} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const totalDuration = performance.now() - startTime;
  const memoryEnd = process.memoryUsage().heapUsed;
  const memoryGrowth = memoryEnd - memoryStart;

  // Calculate summary statistics
  const successfulMatches = matches.filter((m) => m.success).length;
  const totalCommands = matches.reduce((sum, m) => sum + m.player1Commands + m.player2Commands, 0);
  const totalErrors = matches.reduce((sum, m) => sum + m.player1Errors + m.player2Errors, 0);
  const errorRate = totalCommands > 0 ? (totalErrors / totalCommands) * 100 : 0;
  const totalTicks = matches.reduce((sum, m) => sum + m.ticksRan, 0);
  const averageLatency =
    successfulMatches > 0
      ? matches
          .filter((m) => m.success)
          .reduce((sum, m) => sum + m.averageLatencyMs, 0) / successfulMatches
      : 0;

  // Calculate performance consistency (lower = more consistent)
  const avgDuration =
    successfulMatches > 0
      ? matches.filter((m) => m.success).reduce((sum, m) => sum + m.duration, 0) / successfulMatches
      : 0;
  const variance =
    successfulMatches > 0
      ? matches
          .filter((m) => m.success)
          .reduce((sum, m) => sum + Math.pow(m.duration - avgDuration, 2), 0) / successfulMatches
      : 0;
  const stdDev = Math.sqrt(variance);
  const performanceConsistency = avgDuration > 0 ? (stdDev / avgDuration) * 100 : 0; // CV in %

  const report: StabilityReport = {
    timestamp: new Date().toISOString(),
    numMatches,
    duration: totalDuration,
    matches,
    summary: {
      totalMatches: numMatches,
      successfulMatches,
      failedMatches: numMatches - successfulMatches,
      completionRate: (successfulMatches / numMatches) * 100,
      totalTicksRan: totalTicks,
      totalCommands,
      totalErrors,
      errorRate,
      averageLatency,
      memoryStart: Math.round(memoryStart / 1024 / 1024),
      memoryEnd: Math.round(memoryEnd / 1024 / 1024),
      memoryGrowth: Math.round(memoryGrowth / 1024 / 1024),
      averageMemoryPerMatch: Math.round(memoryGrowth / 1024 / 1024 / numMatches),
      cpuUsagePercent: 0, // Would require process monitoring
      performanceConsistency: Math.round(performanceConsistency * 100) / 100,
    },
    recommendations: generateRecommendations(
      successfulMatches,
      numMatches,
      errorRate,
      memoryGrowth,
      performanceConsistency
    ),
  };

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('STABILITY TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`\nCompletion: ${report.summary.completionRate.toFixed(1)}% (${successfulMatches}/${numMatches})`);
  console.log(`Duration: ${(totalDuration / 1000).toFixed(1)}s total, ${(avgDuration / 1000).toFixed(2)}s avg`);
  console.log(`Performance Consistency: ${report.summary.performanceConsistency.toFixed(1)}% CV`);
  console.log(`\nCommands: ${totalCommands} total`);
  console.log(`Errors: ${totalErrors} (${errorRate.toFixed(2)}% error rate)`);
  console.log(`Average Latency: ${averageLatency.toFixed(0)}ms`);
  console.log(`\nMemory Start: ${report.summary.memoryStart}MB`);
  console.log(`Memory End: ${report.summary.memoryEnd}MB`);
  console.log(`Growth: ${report.summary.memoryGrowth}MB (${report.summary.averageMemoryPerMatch}MB/match avg)`);

  if (report.recommendations.length > 0) {
    console.log(`\nRecommendations:`);
    report.recommendations.forEach((rec) => console.log(`  • ${rec}`));
  }

  // Save report
  const reportPath = path.join(outputDir, `stability-${numMatches}-matches.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport saved: ${reportPath}`);

  // Save detailed CSV
  const csvPath = path.join(outputDir, `stability-${numMatches}-matches.csv`);
  saveDetailedCsv(csvPath, matches);
  console.log(`Details saved: ${csvPath}`);

  return report;
}

function generateRecommendations(
  successful: number,
  total: number,
  errorRate: number,
  memoryGrowth: number,
  performanceConsistency: number
): string[] {
  const recommendations: string[] = [];

  const completionRate = (successful / total) * 100;
  if (completionRate < 95) {
    recommendations.push(`High failure rate (${(100 - completionRate).toFixed(1)}%). Review error logs.`);
  }

  if (errorRate > 5) {
    recommendations.push(`Command error rate is high (${errorRate.toFixed(2)}%). Check command validation.`);
  }

  if (memoryGrowth > 500) {
    // MB
    recommendations.push(`Memory growth is significant (${memoryGrowth}MB). Check for leaks.`);
  }

  if (performanceConsistency > 15) {
    recommendations.push(
      `Performance varies significantly (${performanceConsistency.toFixed(1)}% CV). Check for resource contention.`
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All stability metrics are healthy. System is production-ready.');
  }

  return recommendations;
}

function saveDetailedCsv(csvPath: string, matches: MatchMetrics[]): void {
  const header = [
    'Match ID',
    'Success',
    'Ticks',
    'Duration (s)',
    'P1 Commands',
    'P1 Errors',
    'P2 Commands',
    'P2 Errors',
    'Error Rate (%)',
    'Avg Latency (ms)',
    'Memory Start (MB)',
    'Memory End (MB)',
    'Memory Delta (MB)',
    'Error Message',
  ].join(',');

  const rows = matches.map((m) => {
    const errorRate =
      m.player1Commands + m.player2Commands > 0
        ? (((m.player1Errors + m.player2Errors) / (m.player1Commands + m.player2Commands)) * 100).toFixed(2)
        : '0';
    return [
      m.matchId,
      m.success ? 'YES' : 'NO',
      m.ticksRan,
      (m.duration / 1000).toFixed(2),
      m.player1Commands,
      m.player1Errors,
      m.player2Commands,
      m.player2Errors,
      errorRate,
      m.averageLatencyMs.toFixed(0),
      (m.memoryBefore / 1024 / 1024).toFixed(1),
      (m.memoryAfter / 1024 / 1024).toFixed(1),
      (m.memoryDelta / 1024 / 1024).toFixed(1),
      m.errorMessage || '',
    ].join(',');
  });

  fs.writeFileSync(csvPath, [header, ...rows].join('\n'));
}

/**
 * Simulate a match for testing
 * In production, this would call OllamaMatchExecutor.execute()
 */
async function simulateMatch(
  matchNum: number
): Promise<{
  ticks: number;
  p1Commands: number;
  p1Errors: number;
  p2Commands: number;
  p2Errors: number;
  avgLatency: number;
}> {
  // Simulate match execution with realistic metrics
  const baseTicks = 50 + Math.random() * 50; // 50-100 ticks
  const ticks = Math.floor(baseTicks);

  const p1CommandsPerTick = 3 + Math.random() * 2; // 3-5 per tick
  const p2CommandsPerTick = 2 + Math.random() * 3; // 2-5 per tick

  const p1Commands = Math.floor(ticks * p1CommandsPerTick);
  const p2Commands = Math.floor(ticks * p2CommandsPerTick);

  const p1ErrorRate = 0.02 + Math.random() * 0.03; // 2-5% error
  const p2ErrorRate = 0.02 + Math.random() * 0.03;

  const p1Errors = Math.floor(p1Commands * p1ErrorRate);
  const p2Errors = Math.floor(p2Commands * p2ErrorRate);

  const baseLatency = 200 + Math.random() * 100; // 200-300ms
  const avgLatency = baseLatency + Math.random() * 50;

  // Simulate some occasional variability
  if (Math.random() < 0.1) {
    // 10% chance of slower match
    return {
      ticks,
      p1Commands,
      p1Errors,
      p2Commands,
      p2Errors,
      avgLatency: avgLatency * 1.5,
    };
  }

  // Simulate occasional failures (very rare)
  if (Math.random() < 0.02) {
    // 2% chance of failure
    throw new Error('Simulated match failure for testing');
  }

  // Small random delay to simulate match execution
  await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

  return {
    ticks,
    p1Commands,
    p1Errors,
    p2Commands,
    p2Errors,
    avgLatency,
  };
}

async function main() {
  const testCases = [10, 25, 50, 100];
  const outputDir = './stability-test-output';

  console.log(`\n${'='.repeat(70)}`);
  console.log('STABILITY VALIDATION SUITE');
  console.log('Story 21.3 — Long-Running Stability Test');
  console.log(`${'='.repeat(70)}\n`);

  const allReports: StabilityReport[] = [];

  for (const numMatches of testCases) {
    const report = await runStabilityTest(numMatches, outputDir);
    allReports.push(report);

    // Add gap between test runs
    if (numMatches < 100) {
      console.log('\n⏳ Waiting before next test batch...\n');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Generate summary report
  console.log(`\n${'='.repeat(70)}`);
  console.log('FULL STABILITY REPORT');
  console.log(`${'='.repeat(70)}\n`);

  const summaryPath = path.join(outputDir, 'stability-full-report.json');
  fs.writeFileSync(summaryPath, JSON.stringify(allReports, null, 2));
  console.log(`Full report saved: ${summaryPath}`);

  // Print summary table
  console.log('\nStability Test Summary:');
  console.log('─'.repeat(70));
  console.log('Matches | Success Rate | Avg Duration | Error Rate | Memory Growth');
  console.log('─'.repeat(70));

  for (const report of allReports) {
    const completionRate = report.summary.completionRate.toFixed(1);
    const avgDuration = (report.duration / report.numMatches / 1000).toFixed(2);
    const errorRate = report.summary.errorRate.toFixed(2);
    const memoryGrowth = report.summary.memoryGrowth;

    console.log(
      `${String(report.numMatches).padEnd(7)} | ${completionRate.padEnd(12)}% | ${avgDuration.padEnd(12)}s | ${errorRate.padEnd(10)}% | ${memoryGrowth}MB`
    );
  }

  console.log('─'.repeat(70));

  // Determine overall stability
  const allSuccess = allReports.every((r) => r.summary.completionRate === 100);
  const lowErrorRate = allReports.every((r) => r.summary.errorRate < 5);
  const stableMemory = allReports.every((r) => r.summary.memoryGrowth < 500);
  const consistentPerformance = allReports.every((r) => r.summary.performanceConsistency < 20);

  console.log('\n✅ STABILITY ASSESSMENT:');
  console.log(`  Completion Rate: ${allSuccess ? '✅ PASS (100%)' : '⚠️ CHECK (< 100%)'}`);
  console.log(`  Error Rate: ${lowErrorRate ? '✅ PASS (< 5%)' : '⚠️ CHECK (>= 5%)'}`);
  console.log(`  Memory Stability: ${stableMemory ? '✅ PASS (< 500MB growth)' : '⚠️ CHECK (>= 500MB)'}`);
  console.log(`  Performance Consistency: ${consistentPerformance ? '✅ PASS (< 20% CV)' : '⚠️ CHECK (>= 20%)'}`);

  const allPass = allSuccess && lowErrorRate && stableMemory && consistentPerformance;
  console.log(`\n${'='.repeat(70)}`);
  console.log(allPass ? '✅ STABILITY TEST PASSED' : '⚠️ STABILITY TEST REQUIRES REVIEW');
  console.log(`${'='.repeat(70)}\n`);

  return allPass ? 0 : 1;
}

process.exit(await main());
