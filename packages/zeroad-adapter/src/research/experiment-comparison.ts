/**
 * Story 51.4 — Experiment Comparison
 *
 * Compare results across multiple experiments.
 * Enable:
 * - Meta-analysis across experiments
 * - Ranking and winner determination
 * - Synergy identification
 * - Best practices discovery
 */

import { Logger } from '../config/logger.js';
import { ExperimentResults, VariantResult } from './experiment-results.js';

export interface ExperimentComparison {
  experiment1Id: string;
  experiment2Id: string;
  experiment1Name: string;
  experiment2Name: string;
  bestPerformer: string;
  improvement: {
    winRate: number; // percentage points
    latency: number; // percentage
    cost: number; // percentage
    composite: number;
  };
  statisticallySignificant: boolean;
  recommendation: string;
}

export interface VariantRanking {
  variantId: string;
  experimentId: string;
  winRate: number;
  consistency: number;
  cost: number;
  compositeScore: number;
  rank: number;
}

export interface MetaAnalysis {
  experimentIds: string[];
  totalExperiments: number;
  totalMatches: number;
  bestVariant: VariantRanking;
  commonThemes: Array<{
    characteristic: string;
    frequency: number;
    impact: number;
  }>;
  averageWinRate: number;
  averageLatency: number;
  averageCost: number;
  trendDirection: 'improving' | 'degrading' | 'stable';
}

export class ExperimentComparator {
  private experiments: Map<string, ExperimentResults> = new Map();
  private experimentNames: Map<string, string> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register an experiment for comparison
   */
  registerExperiment(result: ExperimentResults, name: string): void {
    this.experiments.set(result.experimentId, result);
    this.experimentNames.set(result.experimentId, name);

    this.logger.info('Experiment registered for comparison', {
      experimentId: result.experimentId,
      name,
    });
  }

  /**
   * Compare two experiments
   */
  compareExperiments(exp1Id: string, exp2Id: string): ExperimentComparison | null {
    const exp1 = this.experiments.get(exp1Id);
    const exp2 = this.experiments.get(exp2Id);

    if (!exp1 || !exp2 || exp1.variants.length === 0 || exp2.variants.length === 0) {
      return null;
    }

    const best1 = exp1.variants[0];
    const best2 = exp2.variants[0];

    const winRateDiff = (best2.winRate - best1.winRate) * 100;
    const latencyDiff = ((best1.avgLatency - best2.avgLatency) / best1.avgLatency) * 100;
    const costDiff = ((best1.avgCost - best2.avgCost) / best1.avgCost) * 100;
    const compositeDiff = (best2.winRate * 0.5 - best1.winRate * 0.5 +
      (best1.avgLatency / 10000 - best2.avgLatency / 10000) * 0.25 +
      (best2.avgCost - best1.avgCost) * 1000 * 0.25) * 100;

    const bestPerformer =
      compositeDiff > 0 ? exp2Id : exp1Id;

    let recommendation = '';
    if (Math.abs(compositeDiff) > 10) {
      recommendation = `${bestPerformer} clearly outperforms. Strong evidence to adopt.`;
    } else if (Math.abs(compositeDiff) > 5) {
      recommendation = `${bestPerformer} shows improvement. Consider adopting with further testing.`;
    } else {
      recommendation = 'Results are similar. Choose based on other factors.';
    }

    return {
      experiment1Id: exp1Id,
      experiment2Id: exp2Id,
      experiment1Name: this.experimentNames.get(exp1Id) || exp1Id,
      experiment2Name: this.experimentNames.get(exp2Id) || exp2Id,
      bestPerformer,
      improvement: {
        winRate: winRateDiff,
        latency: latencyDiff,
        cost: costDiff,
        composite: compositeDiff,
      },
      statisticallySignificant: exp1.statisticallySignificant && exp2.statisticallySignificant,
      recommendation,
    };
  }

  /**
   * Rank all variants across all experiments
   */
  rankVariants(): VariantRanking[] {
    const rankings: VariantRanking[] = [];

    for (const [expId, exp] of this.experiments) {
      for (const variant of exp.variants) {
        const compositeScore =
          variant.winRate * 0.5 -
          (variant.avgLatency / 10000) * 0.25 -
          variant.avgCost * 1000 * 0.25;

        rankings.push({
          variantId: variant.variantId,
          experimentId: expId,
          winRate: variant.winRate,
          consistency: variant.consistency,
          cost: variant.avgCost,
          compositeScore,
          rank: 0,
        });
      }
    }

    // Sort and assign ranks
    rankings.sort((a, b) => b.compositeScore - a.compositeScore);
    for (let i = 0; i < rankings.length; i++) {
      rankings[i].rank = i + 1;
    }

    return rankings;
  }

  /**
   * Perform meta-analysis across multiple experiments
   */
  performMetaAnalysis(experimentIds: string[]): MetaAnalysis | null {
    const experiments = experimentIds
      .map(id => this.experiments.get(id))
      .filter(Boolean) as ExperimentResults[];

    if (experiments.length === 0) return null;

    const allVariants = experiments.flatMap(e =>
      e.variants.map(v => ({ variant: v, expId: e.experimentId }))
    );

    let totalMatches = 0;
    let totalWinRate = 0;
    let totalLatency = 0;
    let totalCost = 0;

    for (const exp of experiments) {
      totalMatches += exp.totalMatches;
      totalWinRate += exp.variants.reduce((sum, v) => sum + v.winRate, 0) / exp.variants.length;
      totalLatency += exp.variants.reduce((sum, v) => sum + v.avgLatency, 0) / exp.variants.length;
      totalCost += exp.variants.reduce((sum, v) => sum + v.avgCost, 0) / exp.variants.length;
    }

    const rankings = this.rankVariants().filter(
      r => experimentIds.includes(r.experimentId)
    );
    const bestVariant = rankings[0] || null;

    // Analyze common characteristics
    const characteristics: Record<string, number> = {};
    for (const variant of allVariants) {
      if (variant.variant.winRate > 0.7) {
        characteristics['high-win-rate'] = (characteristics['high-win-rate'] || 0) + 1;
      }
      if (variant.variant.avgLatency < 1000) {
        characteristics['low-latency'] = (characteristics['low-latency'] || 0) + 1;
      }
      if (variant.variant.avgCost < 0.004) {
        characteristics['low-cost'] = (characteristics['low-cost'] || 0) + 1;
      }
    }

    // Determine trend
    const winRates = allVariants.map(v => v.variant.winRate).sort();
    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    if (winRates[winRates.length - 1] - winRates[0] > 0.15) {
      trend = 'improving';
    } else if (winRates[0] - winRates[winRates.length - 1] > 0.15) {
      trend = 'degrading';
    }

    return {
      experimentIds,
      totalExperiments: experiments.length,
      totalMatches,
      bestVariant: bestVariant!,
      commonThemes: Object.entries(characteristics)
        .map(([char, freq]) => ({
          characteristic: char,
          frequency: freq,
          impact: freq / allVariants.length,
        }))
        .sort((a, b) => b.frequency - a.frequency),
      averageWinRate: totalWinRate / experiments.length,
      averageLatency: totalLatency / experiments.length,
      averageCost: totalCost / experiments.length,
      trendDirection: trend,
    };
  }

  /**
   * Find synergies between variants
   */
  findSynergies(): Array<{
    variant1: string;
    variant2: string;
    experiment1: string;
    experiment2: string;
    synergySavings: number;
  }> {
    const synergies: Array<{
      variant1: string;
      variant2: string;
      experiment1: string;
      experiment2: string;
      synergySavings: number;
    }> = [];

    const experiments = Array.from(this.experiments.values());

    for (let i = 0; i < experiments.length; i++) {
      for (let j = i + 1; j < experiments.length; j++) {
        const exp1 = experiments[i];
        const exp2 = experiments[j];

        const best1 = exp1.variants[0];
        const best2 = exp2.variants[0];

        // Calculate potential savings if combining approaches
        const combinedWinRate = (best1.winRate + best2.winRate) / 2;
        const combinedLatency = (best1.avgLatency + best2.avgLatency) / 2;
        const combinedCost = (best1.avgCost + best2.avgCost) / 2;

        const synergySavings =
          combinedWinRate * 0.5 -
          (combinedLatency / 10000) * 0.25 -
          combinedCost * 1000 * 0.25;

        if (synergySavings > 0.05) {
          synergies.push({
            variant1: best1.variantId,
            variant2: best2.variantId,
            experiment1: exp1.experimentId,
            experiment2: exp2.experimentId,
            synergySavings,
          });
        }
      }
    }

    return synergies.sort((a, b) => b.synergySavings - a.synergySavings);
  }

  /**
   * Get summary report
   */
  getSummaryReport(experimentIds: string[]): string {
    const experiments = experimentIds
      .map(id => this.experiments.get(id))
      .filter(Boolean) as ExperimentResults[];

    if (experiments.length === 0) return 'No experiments to report';

    let report = `# Experiment Comparison Report\n\n`;
    report += `**Experiments Analyzed:** ${experiments.length}\n`;
    report += `**Total Matches:** ${experiments.reduce((sum, e) => sum + e.totalMatches, 0)}\n\n`;

    // Best variant
    const rankings = this.rankVariants().filter(r =>
      experimentIds.includes(r.experimentId)
    );
    if (rankings.length > 0) {
      const best = rankings[0];
      report += `## Best Performer\n`;
      report += `**Variant:** ${best.variantId} from ${this.experimentNames.get(best.experimentId)}\n`;
      report += `**Win Rate:** ${(best.winRate * 100).toFixed(1)}%\n`;
      report += `**Consistency:** ${(best.consistency * 100).toFixed(1)}%\n\n`;
    }

    // Meta-analysis
    const meta = this.performMetaAnalysis(experimentIds);
    if (meta) {
      report += `## Meta-Analysis\n`;
      report += `**Average Win Rate:** ${(meta.averageWinRate * 100).toFixed(1)}%\n`;
      report += `**Trend:** ${meta.trendDirection}\n\n`;

      if (meta.commonThemes.length > 0) {
        report += `## Common Themes in High Performers\n`;
        for (const theme of meta.commonThemes.slice(0, 3)) {
          report += `- ${theme.characteristic}: ${(theme.impact * 100).toFixed(0)}% of variants\n`;
        }
      }
    }

    return report;
  }

  /**
   * Clear all registered experiments
   */
  clear(): void {
    this.experiments.clear();
    this.experimentNames.clear();
  }
}
