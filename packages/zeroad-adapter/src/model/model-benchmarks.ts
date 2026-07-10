/**
 * Story 48.4 — Model Benchmark Metadata
 *
 * Store historical performance data for every model.
 * Track:
 * - Response latency
 * - Token usage
 * - Cost per match
 * - Success rate
 * - Quality metrics
 */

import { Logger } from '../config/logger.js';

export interface BenchmarkMetrics {
  latency: {
    min: number; // milliseconds
    max: number;
    average: number;
    median: number;
    p95: number;
    p99: number;
  };
  tokens: {
    inputTotal: number;
    outputTotal: number;
    averageInputPerCall: number;
    averageOutputPerCall: number;
  };
  cost: {
    totalCost: number; // dollars
    averageCostPerMatch: number;
    estimatedCostPerHourPlay: number;
  };
  reliability: {
    successRate: number; // 0-1
    errorCount: number;
    timeoutCount: number;
    crashCount: number;
  };
  quality: {
    winRate: number; // 0-1 (among matches with this model)
    averageMatchDuration: number; // ticks
    averageCommandsPerTick: number;
    idlePercentage: number; // 0-1
  };
}

export interface ModelBenchmark {
  modelId: string;
  provider: string;
  firstBenchmarkedAt: string;
  lastBenchmarkedAt: string;
  matchCount: number;
  metrics: BenchmarkMetrics;
  trend?: {
    latencyTrend: 'improving' | 'degrading' | 'stable';
    qualityTrend: 'improving' | 'degrading' | 'stable';
    reliabilityTrend: 'improving' | 'degrading' | 'stable';
  };
  notes?: string;
}

export interface MatchBenchmarkData {
  matchId: string;
  modelId: string;
  timestamp: string;
  duration: number; // milliseconds
  tokensUsed: {
    input: number;
    output: number;
  };
  cost: number; // dollars
  success: boolean;
  error?: string;
  quality: {
    won: boolean;
    commandsPerTick: number;
    idlePercentage: number;
    matchDuration: number; // ticks
  };
}

export class ModelBenchmarkManager {
  private benchmarks: Map<string, ModelBenchmark> = new Map();
  private matchHistory: MatchBenchmarkData[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Record benchmark data from a match
   */
  recordMatchBenchmark(data: MatchBenchmarkData): void {
    this.matchHistory.push(data);

    // Update or create benchmark
    let benchmark = this.benchmarks.get(data.modelId);

    if (!benchmark) {
      benchmark = {
        modelId: data.modelId,
        provider: 'unknown',
        firstBenchmarkedAt: data.timestamp,
        lastBenchmarkedAt: data.timestamp,
        matchCount: 0,
        metrics: {
          latency: {
            min: data.duration,
            max: data.duration,
            average: 0,
            median: 0,
            p95: 0,
            p99: 0,
          },
          tokens: {
            inputTotal: 0,
            outputTotal: 0,
            averageInputPerCall: 0,
            averageOutputPerCall: 0,
          },
          cost: {
            totalCost: 0,
            averageCostPerMatch: 0,
            estimatedCostPerHourPlay: 0,
          },
          reliability: {
            successRate: 0,
            errorCount: 0,
            timeoutCount: 0,
            crashCount: 0,
          },
          quality: {
            winRate: 0,
            averageMatchDuration: 0,
            averageCommandsPerTick: 0,
            idlePercentage: 0,
          },
        },
      };
    }

    // Update benchmark
    benchmark.lastBenchmarkedAt = data.timestamp;
    benchmark.matchCount++;
    this._updateBenchmarkMetrics(benchmark, data);
    this._calculateTrends(benchmark);

    this.benchmarks.set(data.modelId, benchmark);

    this.logger.info('Match benchmark recorded', {
      modelId: data.modelId,
      matchId: data.matchId,
      success: data.success,
      cost: data.cost,
    });
  }

  /**
   * Get benchmark for a model
   */
  getBenchmark(modelId: string): ModelBenchmark | null {
    return this.benchmarks.get(modelId) || null;
  }

  /**
   * List all benchmarks
   */
  listBenchmarks(filter?: {
    provider?: string;
    minMatches?: number;
  }): ModelBenchmark[] {
    let benchmarks = Array.from(this.benchmarks.values());

    if (filter?.provider) {
      benchmarks = benchmarks.filter(b => b.provider === filter.provider);
    }

    if (filter?.minMatches) {
      benchmarks = benchmarks.filter(b => b.matchCount >= filter.minMatches!);
    }

    // Sort by win rate (highest first)
    return benchmarks.sort((a, b) => b.metrics.quality.winRate - a.metrics.quality.winRate);
  }

  /**
   * Get match history for a model
   */
  getMatchHistory(modelId: string): MatchBenchmarkData[] {
    return this.matchHistory.filter(m => m.modelId === modelId);
  }

  /**
   * Compare two models
   */
  compareModels(
    modelId1: string,
    modelId2: string
  ): {
    model1: ModelBenchmark | null;
    model2: ModelBenchmark | null;
    winner: string;
    differences: Array<{
      metric: string;
      model1Value: any;
      model2Value: any;
      difference: string;
    }>;
  } {
    const b1 = this.benchmarks.get(modelId1);
    const b2 = this.benchmarks.get(modelId2);

    const differences: Array<{
      metric: string;
      model1Value: any;
      model2Value: any;
      difference: string;
    }> = [];

    if (b1 && b2) {
      // Compare key metrics
      if (b1.metrics.quality.winRate !== b2.metrics.quality.winRate) {
        differences.push({
          metric: 'Win Rate',
          model1Value: (b1.metrics.quality.winRate * 100).toFixed(1) + '%',
          model2Value: (b2.metrics.quality.winRate * 100).toFixed(1) + '%',
          difference:
            b1.metrics.quality.winRate > b2.metrics.quality.winRate
              ? `${modelId1} +${((b1.metrics.quality.winRate - b2.metrics.quality.winRate) * 100).toFixed(1)}%`
              : `${modelId2} +${((b2.metrics.quality.winRate - b1.metrics.quality.winRate) * 100).toFixed(1)}%`,
        });
      }

      if (b1.metrics.latency.average !== b2.metrics.latency.average) {
        differences.push({
          metric: 'Avg Latency',
          model1Value: b1.metrics.latency.average.toFixed(0) + 'ms',
          model2Value: b2.metrics.latency.average.toFixed(0) + 'ms',
          difference:
            b1.metrics.latency.average < b2.metrics.latency.average
              ? `${modelId1} ${(b2.metrics.latency.average - b1.metrics.latency.average).toFixed(0)}ms faster`
              : `${modelId2} ${(b1.metrics.latency.average - b2.metrics.latency.average).toFixed(0)}ms faster`,
        });
      }

      if (b1.metrics.cost.averageCostPerMatch !== b2.metrics.cost.averageCostPerMatch) {
        differences.push({
          metric: 'Cost/Match',
          model1Value: '$' + b1.metrics.cost.averageCostPerMatch.toFixed(4),
          model2Value: '$' + b2.metrics.cost.averageCostPerMatch.toFixed(4),
          difference:
            b1.metrics.cost.averageCostPerMatch < b2.metrics.cost.averageCostPerMatch
              ? `${modelId1} ${((b2.metrics.cost.averageCostPerMatch - b1.metrics.cost.averageCostPerMatch) * 100).toFixed(1)}% cheaper`
              : `${modelId2} ${((b1.metrics.cost.averageCostPerMatch - b2.metrics.cost.averageCostPerMatch) * 100).toFixed(1)}% cheaper`,
        });
      }
    }

    // Determine winner
    let winner = 'tie';
    if (b1 && b2) {
      const score1 =
        b1.metrics.quality.winRate * 0.5 - // Win rate weight
        b1.metrics.latency.average / 10000 * 0.2 - // Latency weight (lower is better)
        b1.metrics.cost.averageCostPerMatch * 1000 * 0.3; // Cost weight

      const score2 =
        b2.metrics.quality.winRate * 0.5 -
        b2.metrics.latency.average / 10000 * 0.2 -
        b2.metrics.cost.averageCostPerMatch * 1000 * 0.3;

      winner = score1 > score2 ? modelId1 : score2 > score1 ? modelId2 : 'tie';
    } else if (b1) {
      winner = modelId1;
    } else if (b2) {
      winner = modelId2;
    }

    return {
      model1: b1 || null,
      model2: b2 || null,
      winner,
      differences,
    };
  }

  /**
   * Get aggregate statistics
   */
  getStatistics(): {
    totalModels: number;
    totalMatches: number;
    averageWinRate: number;
    averageLatency: number;
    averageCost: number;
    overallSuccessRate: number;
  } {
    const benchmarks = Array.from(this.benchmarks.values());

    if (benchmarks.length === 0) {
      return {
        totalModels: 0,
        totalMatches: 0,
        averageWinRate: 0,
        averageLatency: 0,
        averageCost: 0,
        overallSuccessRate: 0,
      };
    }

    const totalMatches = benchmarks.reduce((sum, b) => sum + b.matchCount, 0);
    const avgWinRate =
      benchmarks.reduce((sum, b) => sum + b.metrics.quality.winRate * b.matchCount, 0) /
      totalMatches;
    const avgLatency =
      benchmarks.reduce((sum, b) => sum + b.metrics.latency.average * b.matchCount, 0) /
      totalMatches;
    const avgCost =
      benchmarks.reduce((sum, b) => sum + b.metrics.cost.averageCostPerMatch * b.matchCount, 0) /
      totalMatches;

    const successMatches = this.matchHistory.filter(m => m.success).length;
    const successRate = this.matchHistory.length > 0 ? successMatches / this.matchHistory.length : 0;

    return {
      totalModels: benchmarks.length,
      totalMatches,
      averageWinRate: avgWinRate,
      averageLatency: avgLatency,
      averageCost: avgCost,
      overallSuccessRate: successRate,
    };
  }

  /**
   * Export benchmarks as JSON
   */
  exportBenchmarks(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      benchmarks: Array.from(this.benchmarks.values()),
      matchHistory: this.matchHistory,
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import benchmarks from JSON
   */
  importBenchmarks(json: string): boolean {
    try {
      const data = JSON.parse(json);

      if (data.version !== '1.0' || !Array.isArray(data.benchmarks)) {
        this.logger.error('Invalid benchmarks format');
        return false;
      }

      for (const benchmark of data.benchmarks) {
        this.benchmarks.set(benchmark.modelId, benchmark);
      }

      if (Array.isArray(data.matchHistory)) {
        this.matchHistory = data.matchHistory;
      }

      this.logger.info('Benchmarks imported', {
        models: data.benchmarks.length,
        matches: data.matchHistory?.length || 0,
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to import benchmarks', { error });
      return false;
    }
  }

  /**
   * Get best model by metric
   */
  getBestModel(metric: 'winRate' | 'latency' | 'cost' | 'reliability'): ModelBenchmark | null {
    const benchmarks = Array.from(this.benchmarks.values());
    if (benchmarks.length === 0) return null;

    switch (metric) {
      case 'winRate':
        return benchmarks.reduce((best, current) =>
          current.metrics.quality.winRate > best.metrics.quality.winRate ? current : best
        );
      case 'latency':
        return benchmarks.reduce((best, current) =>
          current.metrics.latency.average < best.metrics.latency.average ? current : best
        );
      case 'cost':
        return benchmarks.reduce((best, current) =>
          current.metrics.cost.averageCostPerMatch < best.metrics.cost.averageCostPerMatch
            ? current
            : best
        );
      case 'reliability':
        return benchmarks.reduce((best, current) =>
          current.metrics.reliability.successRate > best.metrics.reliability.successRate
            ? current
            : best
        );
    }
  }

  /**
   * Get percentile ranking for a model
   */
  getModelPercentile(modelId: string, metric: 'winRate' | 'latency' | 'cost'): number | null {
    const benchmark = this.benchmarks.get(modelId);
    if (!benchmark) return null;

    const benchmarks = Array.from(this.benchmarks.values());
    let rank = 0;

    switch (metric) {
      case 'winRate':
        rank = benchmarks.filter(b => b.metrics.quality.winRate < benchmark.metrics.quality.winRate)
          .length;
        break;
      case 'latency':
        rank = benchmarks.filter(b => b.metrics.latency.average > benchmark.metrics.latency.average)
          .length;
        break;
      case 'cost':
        rank = benchmarks.filter(
          b => b.metrics.cost.averageCostPerMatch > benchmark.metrics.cost.averageCostPerMatch
        ).length;
        break;
    }

    return Math.round((rank / benchmarks.length) * 100);
  }

  /**
   * Private: Update benchmark metrics
   */
  private _updateBenchmarkMetrics(benchmark: ModelBenchmark, data: MatchBenchmarkData): void {
    const m = benchmark.metrics;

    // Latency
    m.latency.min = Math.min(m.latency.min, data.duration);
    m.latency.max = Math.max(m.latency.max, data.duration);

    const allLatencies = this.matchHistory
      .filter(match => match.modelId === data.modelId)
      .map(match => match.duration)
      .sort((a, b) => a - b);

    m.latency.average = allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length;
    m.latency.median = allLatencies[Math.floor(allLatencies.length / 2)];
    m.latency.p95 = allLatencies[Math.floor(allLatencies.length * 0.95)];
    m.latency.p99 = allLatencies[Math.floor(allLatencies.length * 0.99)];

    // Tokens
    m.tokens.inputTotal += data.tokensUsed.input;
    m.tokens.outputTotal += data.tokensUsed.output;
    m.tokens.averageInputPerCall = m.tokens.inputTotal / benchmark.matchCount;
    m.tokens.averageOutputPerCall = m.tokens.outputTotal / benchmark.matchCount;

    // Cost
    m.cost.totalCost += data.cost;
    m.cost.averageCostPerMatch = m.cost.totalCost / benchmark.matchCount;
    m.cost.estimatedCostPerHourPlay = m.cost.averageCostPerMatch * 10; // Rough estimate

    // Reliability
    if (data.success) {
      const successCount =
        this.matchHistory.filter(
          match => match.modelId === data.modelId && match.success
        ).length;
      m.reliability.successRate = successCount / benchmark.matchCount;
    } else {
      m.reliability.errorCount++;
    }

    // Quality
    const qualityMatches = this.matchHistory.filter(match => match.modelId === data.modelId);
    const wins = qualityMatches.filter(m => m.quality.won).length;
    m.quality.winRate = wins / qualityMatches.length;
    m.quality.averageMatchDuration =
      qualityMatches.reduce((sum, m) => sum + m.quality.matchDuration, 0) / qualityMatches.length;
    m.quality.averageCommandsPerTick =
      qualityMatches.reduce((sum, m) => sum + m.quality.commandsPerTick, 0) / qualityMatches.length;
    m.quality.idlePercentage =
      qualityMatches.reduce((sum, m) => sum + m.quality.idlePercentage, 0) / qualityMatches.length;
  }

  /**
   * Private: Calculate trends
   */
  private _calculateTrends(benchmark: ModelBenchmark): void {
    const recent = this.matchHistory
      .filter(m => m.modelId === benchmark.modelId)
      .slice(-10);

    if (recent.length < 3) return;

    const recentFirst = recent.slice(0, 5);
    const recentLast = recent.slice(-5);

    const latencyFirst = recentFirst.reduce((a, b) => a + b.duration, 0) / recentFirst.length;
    const latencyLast = recentLast.reduce((a, b) => a + b.duration, 0) / recentLast.length;
    const latencyTrend =
      latencyLast < latencyFirst * 0.95
        ? 'improving'
        : latencyLast > latencyFirst * 1.05
          ? 'degrading'
          : 'stable';

    const winsFirst = recentFirst.filter(m => m.quality.won).length;
    const winsLast = recentLast.filter(m => m.quality.won).length;
    const qualityTrend =
      winsLast > winsFirst ? 'improving' : winsLast < winsFirst ? 'degrading' : 'stable';

    const reliabilityFirst = recentFirst.filter(m => m.success).length / recentFirst.length;
    const reliabilityLast = recentLast.filter(m => m.success).length / recentLast.length;
    const reliabilityTrend =
      reliabilityLast > reliabilityFirst
        ? 'improving'
        : reliabilityLast < reliabilityFirst
          ? 'degrading'
          : 'stable';

    benchmark.trend = {
      latencyTrend,
      qualityTrend,
      reliabilityTrend,
    };
  }
}
