/**
 * Story 51.3 — Experiment Results
 *
 * Track and aggregate experiment outcomes.
 * Enable:
 * - Match recording with experiment context
 * - Aggregated performance metrics
 * - Hypothesis validation
 * - Result persistence and export
 */

import { Logger } from '../config/logger.js';

export interface ExperimentMatchRecord {
  matchId: string;
  experimentId: string;
  variantId: string;
  timestamp: string;
  outcome: {
    won: boolean;
    duration: number; // ticks
    commandsPerTick: number;
    latency: number;
    cost: number;
  };
  metadata?: Record<string, any>;
}

export interface VariantResult {
  variantId: string;
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  avgCost: number;
  avgDuration: number;
  avgCommandsPerTick: number;
  consistency: number;
}

export interface ExperimentResults {
  experimentId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  totalMatches: number;
  variants: VariantResult[];
  hypothesis: string;
  conclusion?: string;
  statisticallySignificant: boolean;
  confidenceLevel: number;
}

export interface SuccessCriteriaResult {
  metric: string;
  threshold: number;
  operator: string;
  actualValue: number;
  passed: boolean;
  evidence: string;
}

export class ExperimentResultsManager {
  private matchRecords: Map<string, ExperimentMatchRecord[]> = new Map();
  private results: Map<string, ExperimentResults> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Record a match for an experiment
   */
  recordMatch(record: ExperimentMatchRecord): void {
    if (!this.matchRecords.has(record.experimentId)) {
      this.matchRecords.set(record.experimentId, []);
    }

    this.matchRecords.get(record.experimentId)!.push(record);

    this.logger.debug('Match recorded for experiment', {
      experimentId: record.experimentId,
      variantId: record.variantId,
      won: record.outcome.won,
    });
  }

  /**
   * Calculate results for an experiment
   */
  calculateResults(experimentId: string, hypothesis: string): ExperimentResults | null {
    const matches = this.matchRecords.get(experimentId);
    if (!matches || matches.length === 0) return null;

    const variantMap: Record<string, ExperimentMatchRecord[]> = {};

    for (const match of matches) {
      if (!variantMap[match.variantId]) {
        variantMap[match.variantId] = [];
      }
      variantMap[match.variantId].push(match);
    }

    const variants: VariantResult[] = [];

    for (const [variantId, variantMatches] of Object.entries(variantMap)) {
      const wins = variantMatches.filter(m => m.outcome.won).length;
      const latencies = variantMatches.map(m => m.outcome.latency).sort((a, b) => a - b);
      const costs = variantMatches.map(m => m.outcome.cost);
      const durations = variantMatches.map(m => m.outcome.duration);
      const commands = variantMatches.map(m => m.outcome.commandsPerTick);

      const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
      const p95Index = Math.floor(latencies.length * 0.95);

      // Calculate consistency (inverse of std dev)
      const variance =
        latencies.reduce((sum, lat) => sum + Math.pow(lat - avgLatency, 2), 0) /
        latencies.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 1 - stdDev / avgLatency);

      variants.push({
        variantId,
        matchCount: variantMatches.length,
        wins,
        losses: variantMatches.length - wins,
        winRate: wins / variantMatches.length,
        avgLatency,
        minLatency: latencies[0],
        maxLatency: latencies[latencies.length - 1],
        p95Latency: latencies[p95Index],
        avgCost: costs.reduce((a, b) => a + b) / costs.length,
        avgDuration: durations.reduce((a, b) => a + b) / durations.length,
        avgCommandsPerTick: commands.reduce((a, b) => a + b) / commands.length,
        consistency,
      });
    }

    // Statistical significance test (chi-square)
    let statisticallySignificant = false;
    let confidenceLevel = 0;

    if (variants.length >= 2) {
      const v1 = variants[0];
      const v2 = variants[1];

      const chi2 = this.calculateChiSquare(
        v1.wins,
        v1.losses,
        v2.wins,
        v2.losses
      );

      statisticallySignificant = chi2 > 3.841; // p < 0.05
      confidenceLevel = Math.min(1, chi2 / 6.635); // Normalize
    }

    const result: ExperimentResults = {
      experimentId,
      status: 'completed',
      startTime: matches[0].timestamp,
      endTime: matches[matches.length - 1].timestamp,
      totalMatches: matches.length,
      variants: variants.sort((a, b) => b.winRate - a.winRate),
      hypothesis,
      statisticallySignificant,
      confidenceLevel,
    };

    this.results.set(experimentId, result);

    this.logger.info('Experiment results calculated', {
      experimentId,
      totalMatches: matches.length,
      significant: statisticallySignificant,
    });

    return result;
  }

  /**
   * Chi-square statistic for independence test
   */
  private calculateChiSquare(
    wins1: number,
    losses1: number,
    wins2: number,
    losses2: number
  ): number {
    const n = wins1 + losses1 + wins2 + losses2;
    const total1 = wins1 + losses1;
    const total2 = wins2 + losses2;
    const winsTotal = wins1 + wins2;
    const lossesTotal = losses1 + losses2;

    const expectedWins1 = (total1 * winsTotal) / n;
    const expectedWins2 = (total2 * winsTotal) / n;
    const expectedLosses1 = (total1 * lossesTotal) / n;
    const expectedLosses2 = (total2 * lossesTotal) / n;

    const chi2 =
      Math.pow(wins1 - expectedWins1, 2) / expectedWins1 +
      Math.pow(wins2 - expectedWins2, 2) / expectedWins2 +
      Math.pow(losses1 - expectedLosses1, 2) / expectedLosses1 +
      Math.pow(losses2 - expectedLosses2, 2) / expectedLosses2;

    return chi2;
  }

  /**
   * Validate success criteria
   */
  validateSuccessCriteria(
    experimentId: string,
    criteria: Array<{
      metric: string;
      threshold: number;
      operator: string;
    }>
  ): SuccessCriteriaResult[] {
    const result = this.results.get(experimentId);
    if (!result) return [];

    const results: SuccessCriteriaResult[] = [];

    for (const criterion of criteria) {
      let actualValue = 0;
      let evidence = '';

      if (criterion.metric === 'winRate' && result.variants.length > 0) {
        actualValue = result.variants[0].winRate;
        evidence = `Best variant win rate: ${(actualValue * 100).toFixed(1)}%`;
      } else if (criterion.metric === 'latency' && result.variants.length > 0) {
        actualValue = result.variants[0].avgLatency;
        evidence = `Best variant avg latency: ${actualValue.toFixed(0)}ms`;
      } else if (criterion.metric === 'consistency' && result.variants.length > 0) {
        actualValue = result.variants[0].consistency;
        evidence = `Best variant consistency: ${(actualValue * 100).toFixed(1)}%`;
      }

      let passed = false;
      if (criterion.operator === '>') {
        passed = actualValue > criterion.threshold;
      } else if (criterion.operator === '<') {
        passed = actualValue < criterion.threshold;
      } else if (criterion.operator === '>=') {
        passed = actualValue >= criterion.threshold;
      } else if (criterion.operator === '<=') {
        passed = actualValue <= criterion.threshold;
      }

      results.push({
        metric: criterion.metric,
        threshold: criterion.threshold,
        operator: criterion.operator,
        actualValue,
        passed,
        evidence,
      });
    }

    return results;
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): ExperimentResults | null {
    return this.results.get(experimentId) || null;
  }

  /**
   * Get all matches for an experiment
   */
  getMatches(experimentId: string): ExperimentMatchRecord[] {
    return this.matchRecords.get(experimentId) || [];
  }

  /**
   * Get variant performance summary
   */
  getVariantSummary(experimentId: string, variantId: string): VariantResult | null {
    const result = this.results.get(experimentId);
    if (!result) return null;

    return result.variants.find(v => v.variantId === variantId) || null;
  }

  /**
   * Generate conclusion
   */
  generateConclusion(experimentId: string): string {
    const result = this.results.get(experimentId);
    if (!result) return 'No results available';

    if (result.variants.length === 0) {
      return 'No variant data collected';
    }

    const best = result.variants[0];
    const rest = result.variants.slice(1);

    let conclusion = `${best.variantId} performed best with ${(best.winRate * 100).toFixed(1)}% win rate across ${best.matchCount} matches.`;

    if (result.statisticallySignificant) {
      conclusion += ` This is statistically significant (p < 0.05) with confidence level ${(result.confidenceLevel * 100).toFixed(0)}%.`;
    } else {
      conclusion += ` However, the difference is not statistically significant (confidence: ${(result.confidenceLevel * 100).toFixed(0)}%).`;
    }

    if (rest.length > 0) {
      const improvement = ((best.winRate - rest[0].winRate) * 100).toFixed(1);
      conclusion += ` Improvement over next best: ${improvement} percentage points.`;
    }

    return conclusion;
  }

  /**
   * Export results
   */
  exportResults(experimentId: string): string | null {
    const result = this.results.get(experimentId);
    const matches = this.matchRecords.get(experimentId);

    if (!result) return null;

    return JSON.stringify(
      {
        result,
        matchCount: matches?.length || 0,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }

  /**
   * Get statistics across all experiments
   */
  getStatistics(): {
    totalExperiments: number;
    totalMatches: number;
    completedExperiments: number;
    avgMatchesPerExperiment: number;
  } {
    const experiments = Array.from(this.results.values());
    const totalMatches = experiments.reduce((sum, e) => sum + e.totalMatches, 0);
    const completed = experiments.filter(e => e.status === 'completed').length;

    return {
      totalExperiments: experiments.length,
      totalMatches,
      completedExperiments: completed,
      avgMatchesPerExperiment:
        experiments.length > 0 ? totalMatches / experiments.length : 0,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.matchRecords.clear();
    this.results.clear();
  }
}
