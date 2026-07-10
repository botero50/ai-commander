/**
 * Story 49.3 — Prompt Comparison
 *
 * Compare prompt versions across matches.
 * Enable analysis of:
 * - How different prompts affect outcomes
 * - Which prompt version performs best
 * - Prompt evolution impact on AI performance
 */

import { Logger } from '../config/logger.js';

export interface PromptPerformanceMetric {
  promptVersion: string;
  matchCount: number;
  winRate: number;
  averageCommandsPerTick: number;
  averageLatency: number;
  averageCost: number;
}

export interface PromptComparison {
  prompt1Version: string;
  prompt2Version: string;
  prompt1Metrics: PromptPerformanceMetric;
  prompt2Metrics: PromptPerformanceMetric;
  winner: string;
  winnerConfidence: number; // 0-1
  differences: string[];
  recommendation: string;
}

export interface PromptMatchRecord {
  matchId: string;
  promptVersion: string;
  outcome: {
    won: boolean;
    duration: number; // ticks
    commandsPerTick: number;
    latency: number; // ms
    cost: number; // dollars
  };
}

export interface PromptAnalysis {
  promptVersion: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgCommandsPerTick: number;
  avgLatency: number;
  avgCost: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  consistency: number; // 0-1, std dev based
  trend: 'improving' | 'degrading' | 'stable';
}

export class PromptComparator {
  private matchRecords: PromptMatchRecord[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Record a match with prompt version
   */
  recordMatch(
    matchId: string,
    promptVersion: string,
    outcome: {
      won: boolean;
      duration: number;
      commandsPerTick: number;
      latency: number;
      cost: number;
    }
  ): void {
    this.matchRecords.push({
      matchId,
      promptVersion,
      outcome,
    });

    this.logger.info('Match recorded for prompt', {
      matchId,
      promptVersion,
      won: outcome.won,
    });
  }

  /**
   * Get all matches for a prompt version
   */
  getMatchesForPrompt(promptVersion: string): PromptMatchRecord[] {
    return this.matchRecords.filter(m => m.promptVersion === promptVersion);
  }

  /**
   * Analyze performance of a prompt version
   */
  analyzePrompt(promptVersion: string): PromptAnalysis | null {
    const matches = this.getMatchesForPrompt(promptVersion);
    if (matches.length === 0) return null;

    const wins = matches.filter(m => m.outcome.won).length;
    const winRate = wins / matches.length;

    const latencies = matches.map(m => m.outcome.latency).sort((a, b) => a - b);
    const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

    // Calculate consistency (inverse of std dev)
    const variance =
      latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) /
      latencies.length;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - stdDev / avgLatency); // Normalized to 0-1

    const avgCommandsPerTick =
      matches.reduce((sum, m) => sum + m.outcome.commandsPerTick, 0) / matches.length;
    const avgCost = matches.reduce((sum, m) => sum + m.outcome.cost, 0) / matches.length;

    return {
      promptVersion,
      totalMatches: matches.length,
      wins,
      losses: matches.length - wins,
      winRate,
      avgCommandsPerTick,
      avgLatency,
      avgCost,
      minLatency: latencies[0],
      maxLatency: latencies[latencies.length - 1],
      p95Latency,
      consistency,
      trend: 'stable', // Would need historical data to calculate
    };
  }

  /**
   * Compare two prompt versions
   */
  comparePrompts(version1: string, version2: string): PromptComparison | null {
    const metrics1 = this.analyzePrompt(version1);
    const metrics2 = this.analyzePrompt(version2);

    if (!metrics1 || !metrics2) {
      this.logger.warn('Cannot compare - insufficient data', { version1, version2 });
      return null;
    }

    const differences: string[] = [];

    if (metrics1.winRate !== metrics2.winRate) {
      differences.push(
        `Win rate: ${(metrics1.winRate * 100).toFixed(1)}% vs ${(metrics2.winRate * 100).toFixed(1)}%`
      );
    }

    if (metrics1.avgLatency !== metrics2.avgLatency) {
      differences.push(
        `Avg latency: ${metrics1.avgLatency.toFixed(0)}ms vs ${metrics2.avgLatency.toFixed(0)}ms`
      );
    }

    if (metrics1.avgCommandsPerTick !== metrics2.avgCommandsPerTick) {
      differences.push(
        `Commands/tick: ${metrics1.avgCommandsPerTick.toFixed(2)} vs ${metrics2.avgCommandsPerTick.toFixed(2)}`
      );
    }

    if (metrics1.avgCost !== metrics2.avgCost) {
      differences.push(
        `Cost: $${metrics1.avgCost.toFixed(4)} vs $${metrics2.avgCost.toFixed(4)}`
      );
    }

    // Scoring: 50% win rate, 25% latency, 25% cost
    const score1 =
      metrics1.winRate * 0.5 -
      (metrics1.avgLatency / 10000) * 0.25 -
      metrics1.avgCost * 1000 * 0.25;
    const score2 =
      metrics2.winRate * 0.5 -
      (metrics2.avgLatency / 10000) * 0.25 -
      metrics2.avgCost * 1000 * 0.25;

    const winner = score1 > score2 ? version1 : version2;
    const scoreMargin = Math.abs(score1 - score2);
    const winnerConfidence = Math.min(1, scoreMargin * 2); // Scale to 0-1

    let recommendation = '';
    if (winnerConfidence > 0.7) {
      recommendation = `${winner} is clearly better. Recommend switching.`;
    } else if (winnerConfidence > 0.3) {
      recommendation = `${winner} shows improvement. Consider A/B testing further.`;
    } else {
      recommendation = 'Results are too close. Recommend more data collection.';
    }

    return {
      prompt1Version: version1,
      prompt2Version: version2,
      prompt1Metrics: {
        promptVersion: version1,
        matchCount: metrics1.totalMatches,
        winRate: metrics1.winRate,
        averageCommandsPerTick: metrics1.avgCommandsPerTick,
        averageLatency: metrics1.avgLatency,
        averageCost: metrics1.avgCost,
      },
      prompt2Metrics: {
        promptVersion: version2,
        matchCount: metrics2.totalMatches,
        winRate: metrics2.winRate,
        averageCommandsPerTick: metrics2.avgCommandsPerTick,
        averageLatency: metrics2.avgLatency,
        averageCost: metrics2.avgCost,
      },
      winner,
      winnerConfidence,
      differences,
      recommendation,
    };
  }

  /**
   * Get top performing prompts
   */
  getRankedPrompts(): PromptAnalysis[] {
    const promptVersions = new Set(this.matchRecords.map(m => m.promptVersion));
    const analyses = Array.from(promptVersions)
      .map(v => this.analyzePrompt(v))
      .filter(Boolean) as PromptAnalysis[];

    // Rank by composite score
    return analyses.sort((a, b) => {
      const scoreA = a.winRate * 0.5 - (a.avgLatency / 10000) * 0.25 - a.avgCost * 1000 * 0.25;
      const scoreB = b.winRate * 0.5 - (b.avgLatency / 10000) * 0.25 - b.avgCost * 1000 * 0.25;
      return scoreB - scoreA;
    });
  }

  /**
   * Get win rate by prompt version
   */
  getWinRateComparison(): Array<{
    promptVersion: string;
    winRate: number;
    matchCount: number;
  }> {
    const versions = new Set(this.matchRecords.map(m => m.promptVersion));

    return Array.from(versions)
      .map(v => {
        const matches = this.getMatchesForPrompt(v);
        const wins = matches.filter(m => m.outcome.won).length;
        return {
          promptVersion: v,
          winRate: wins / matches.length,
          matchCount: matches.length,
        };
      })
      .sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get efficiency comparison (cost per win)
   */
  getEfficiencyComparison(): Array<{
    promptVersion: string;
    costPerWin: number;
    matchCount: number;
  }> {
    const versions = new Set(this.matchRecords.map(m => m.promptVersion));

    return Array.from(versions)
      .map(v => {
        const matches = this.getMatchesForPrompt(v);
        const wins = matches.filter(m => m.outcome.won).length;
        const totalCost = matches.reduce((sum, m) => sum + m.outcome.cost, 0);

        return {
          promptVersion: v,
          costPerWin: wins > 0 ? totalCost / wins : Infinity,
          matchCount: matches.length,
        };
      })
      .sort((a, b) => a.costPerWin - b.costPerWin);
  }

  /**
   * Get latency comparison
   */
  getLatencyComparison(): Array<{
    promptVersion: string;
    avgLatency: number;
    p95Latency: number;
    matchCount: number;
  }> {
    const versions = new Set(this.matchRecords.map(m => m.promptVersion));

    return Array.from(versions)
      .map(v => {
        const analysis = this.analyzePrompt(v);
        if (!analysis) return null;

        return {
          promptVersion: v,
          avgLatency: analysis.avgLatency,
          p95Latency: analysis.p95Latency,
          matchCount: analysis.totalMatches,
        };
      })
      .filter(Boolean) as Array<{
      promptVersion: string;
      avgLatency: number;
      p95Latency: number;
      matchCount: number;
    }>;
  }

  /**
   * Get command efficiency comparison
   */
  getCommandEfficiencyComparison(): Array<{
    promptVersion: string;
    avgCommandsPerTick: number;
    winRate: number;
    matchCount: number;
  }> {
    const versions = new Set(this.matchRecords.map(m => m.promptVersion));

    return Array.from(versions)
      .map(v => {
        const analysis = this.analyzePrompt(v);
        if (!analysis) return null;

        return {
          promptVersion: v,
          avgCommandsPerTick: analysis.avgCommandsPerTick,
          winRate: analysis.winRate,
          matchCount: analysis.totalMatches,
        };
      })
      .filter(Boolean) as Array<{
      promptVersion: string;
      avgCommandsPerTick: number;
      winRate: number;
      matchCount: number;
    }>;
  }

  /**
   * Export comparison data as JSON
   */
  exportComparison(): string {
    const ranked = this.getRankedPrompts();
    const winRates = this.getWinRateComparison();
    const efficiency = this.getEfficiencyComparison();
    const latency = this.getLatencyComparison();

    const data = {
      timestamp: new Date().toISOString(),
      matchCount: this.matchRecords.length,
      promptCount: new Set(this.matchRecords.map(m => m.promptVersion)).size,
      ranked,
      winRates,
      efficiency,
      latency,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Get match history for a prompt
   */
  getMatchHistory(promptVersion: string): PromptMatchRecord[] {
    return this.getMatchesForPrompt(promptVersion);
  }

  /**
   * Clear all records (for testing)
   */
  clearRecords(): void {
    this.matchRecords = [];
  }
}
