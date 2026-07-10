/**
 * Story 50.3 — Statistics API
 *
 * Provide aggregated statistics and metrics API.
 * Enable:
 * - Time-series performance tracking
 * - Win rate trends over time
 * - Model and prompt performance benchmarks
 * - Comparative metrics across dimensions
 */

import { Logger } from '../config/logger.js';
import { MatchIndex, type MatchIndexEntry } from './match-index.js';

export interface DailyStats {
  date: string;
  matchCount: number;
  averageLatency: number;
  p95Latency: number;
  averageWinRate: number;
  averageDuration: number;
  totalCommands: number;
}

export interface ModelBenchmark {
  model: string;
  matchCount: number;
  winRate: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  p95Latency: number;
  averageDuration: number;
  consistency: number; // inverse of std dev
}

export interface PromptBenchmark {
  prompt: string;
  matchCount: number;
  winRate: number;
  averageLatency: number;
  averageCommands: number;
  improvementOverBaseline: number;
}

export interface MapPerformance {
  map: string;
  matchCount: number;
  averageDuration: number;
  averageLatency: number;
  avgWinRate: number;
  modelVariability: number;
}

export interface OverallStatistics {
  totalMatches: number;
  uniqueMaps: number;
  uniqueModels: number;
  uniquePrompts: number;
  averageMatchDuration: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  globalWinRate: number;
  oldestMatch: string;
  newestMatch: string;
}

export class StatisticsAPI {
  private index: MatchIndex;
  private logger: Logger;

  constructor(index: MatchIndex, logger: Logger) {
    this.index = index;
    this.logger = logger;
  }

  /**
   * Get overall statistics
   */
  getOverallStatistics(): OverallStatistics {
    const matches = this.index.search({}, 100000, 0);
    if (matches.length === 0) {
      return {
        totalMatches: 0,
        uniqueMaps: 0,
        uniqueModels: 0,
        uniquePrompts: 0,
        averageMatchDuration: 0,
        averageLatency: 0,
        p95Latency: 0,
        p99Latency: 0,
        globalWinRate: 0,
        oldestMatch: '',
        newestMatch: '',
      };
    }

    const maps = new Set<string>();
    const models = new Set<string>();
    const prompts = new Set<string>();

    let totalDuration = 0;
    let totalLatency = 0;
    let totalWins = 0;
    let totalPlayers = 0;

    const latencies: number[] = [];
    const timestamps: string[] = [];

    for (const match of matches) {
      maps.add(match.map);
      totalDuration += match.duration.gameTicksCompleted;
      totalLatency += match.stats.averageLatency;
      latencies.push(match.stats.averageLatency);
      timestamps.push(match.timestamp);

      for (const player of match.players) {
        totalPlayers++;
        if (player.won) totalWins++;
        if (player.aiModel) models.add(player.aiModel);
        if (player.aiPrompt) prompts.add(player.aiPrompt);
      }
    }

    // Calculate percentiles
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    timestamps.sort();

    return {
      totalMatches: matches.length,
      uniqueMaps: maps.size,
      uniqueModels: models.size,
      uniquePrompts: prompts.size,
      averageMatchDuration: totalDuration / matches.length,
      averageLatency: totalLatency / matches.length,
      p95Latency: latencies[p95Index],
      p99Latency: latencies[p99Index],
      globalWinRate: totalWins / totalPlayers,
      oldestMatch: timestamps[0],
      newestMatch: timestamps[timestamps.length - 1],
    };
  }

  /**
   * Get daily statistics
   */
  getDailyStatistics(): DailyStats[] {
    const matches = this.index.search({}, 100000, 0);
    const dailyData: Map<string, MatchIndexEntry[]> = new Map();

    // Group by date
    for (const match of matches) {
      const date = new Date(match.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(match);
    }

    // Calculate stats for each day
    const stats: DailyStats[] = [];
    for (const [date, dayMatches] of Array.from(dailyData.entries()).sort()) {
      let totalLatency = 0;
      let totalDuration = 0;
      let totalCommands = 0;
      let totalWins = 0;
      let totalPlayers = 0;
      const latencies: number[] = [];

      for (const match of dayMatches) {
        totalLatency += match.stats.averageLatency;
        latencies.push(match.stats.averageLatency);
        totalDuration += match.duration.gameTicksCompleted;
        totalCommands += match.stats.totalCommands;

        for (const player of match.players) {
          totalPlayers++;
          if (player.won) totalWins++;
        }
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);

      stats.push({
        date,
        matchCount: dayMatches.length,
        averageLatency: totalLatency / dayMatches.length,
        p95Latency: latencies[p95Index],
        averageWinRate: totalWins / totalPlayers,
        averageDuration: totalDuration / dayMatches.length,
        totalCommands,
      });
    }

    return stats;
  }

  /**
   * Get model benchmarks
   */
  getModelBenchmarks(): ModelBenchmark[] {
    const indexStats = this.index.getStatistics();
    const benchmarks: ModelBenchmark[] = [];

    const matches = this.index.search({}, 100000, 0);

    for (const model of Object.keys(indexStats.aiModelCount)) {
      const modelMatches = matches.filter(m =>
        m.players.some(p => p.aiModel === model)
      );

      if (modelMatches.length === 0) continue;

      let wins = 0;
      let totalLatency = 0;
      let minLatency = Infinity;
      let maxLatency = 0;
      const latencies: number[] = [];
      let totalDuration = 0;

      for (const match of modelMatches) {
        const player = match.players.find(p => p.aiModel === model);
        if (player && player.won) wins++;

        totalLatency += match.stats.averageLatency;
        latencies.push(match.stats.averageLatency);
        minLatency = Math.min(minLatency, match.stats.averageLatency);
        maxLatency = Math.max(maxLatency, match.stats.averageLatency);
        totalDuration += match.duration.gameTicksCompleted;
      }

      latencies.sort((a, b) => a - b);
      const p95Index = Math.floor(latencies.length * 0.95);

      // Calculate consistency (inverse of std dev)
      const avg = totalLatency / modelMatches.length;
      const variance = latencies.reduce((sum, lat) => sum + Math.pow(lat - avg, 2), 0) / latencies.length;
      const stdDev = Math.sqrt(variance);
      const consistency = Math.max(0, 1 - stdDev / avg);

      benchmarks.push({
        model,
        matchCount: modelMatches.length,
        winRate: wins / modelMatches.length,
        averageLatency: avg,
        minLatency,
        maxLatency,
        p95Latency: latencies[p95Index],
        averageDuration: totalDuration / modelMatches.length,
        consistency,
      });
    }

    return benchmarks.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get prompt benchmarks
   */
  getPromptBenchmarks(): PromptBenchmark[] {
    const matches = this.index.search({}, 100000, 0);
    const promptStats: Map<string, { wins: number; total: number; latencies: number[] }> = new Map();

    for (const match of matches) {
      for (const player of match.players) {
        if (player.aiPrompt) {
          if (!promptStats.has(player.aiPrompt)) {
            promptStats.set(player.aiPrompt, { wins: 0, total: 0, latencies: [] });
          }

          const stats = promptStats.get(player.aiPrompt)!;
          stats.total++;
          stats.latencies.push(match.stats.averageLatency);
          if (player.won) stats.wins++;
        }
      }
    }

    const benchmarks: PromptBenchmark[] = [];

    for (const [prompt, stats] of promptStats.entries()) {
      const avgLatency = stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;

      benchmarks.push({
        prompt,
        matchCount: stats.total,
        winRate: stats.wins / stats.total,
        averageLatency: avgLatency,
        averageCommands: 0, // Would need additional tracking
        improvementOverBaseline: 0, // Would need baseline comparison
      });
    }

    return benchmarks.sort((a, b) => b.winRate - a.winRate);
  }

  /**
   * Get map performance
   */
  getMapPerformance(): MapPerformance[] {
    const indexStats = this.index.getStatistics();
    const performance: MapPerformance[] = [];

    const matches = this.index.search({}, 100000, 0);

    for (const map of Object.keys(indexStats.mapCount)) {
      const mapMatches = matches.filter(m => m.map === map);

      if (mapMatches.length === 0) continue;

      let totalDuration = 0;
      let totalLatency = 0;
      let totalWins = 0;
      let totalPlayers = 0;
      const modelWinRates: Record<string, { wins: number; total: number }> = {};

      for (const match of mapMatches) {
        totalDuration += match.duration.gameTicksCompleted;
        totalLatency += match.stats.averageLatency;

        for (const player of match.players) {
          totalPlayers++;
          if (player.won) totalWins++;

          if (player.aiModel) {
            if (!modelWinRates[player.aiModel]) {
              modelWinRates[player.aiModel] = { wins: 0, total: 0 };
            }
            modelWinRates[player.aiModel].total++;
            if (player.won) modelWinRates[player.aiModel].wins++;
          }
        }
      }

      // Calculate model variability (std dev of win rates)
      const modelRates = Object.values(modelWinRates)
        .map(m => m.wins / m.total);
      const avgRate = modelRates.reduce((a, b) => a + b, 0) / modelRates.length;
      const variance = modelRates.reduce((sum, rate) => sum + Math.pow(rate - avgRate, 2), 0) / modelRates.length;
      const variability = Math.sqrt(variance);

      performance.push({
        map,
        matchCount: mapMatches.length,
        averageDuration: totalDuration / mapMatches.length,
        averageLatency: totalLatency / mapMatches.length,
        avgWinRate: totalWins / totalPlayers,
        modelVariability: variability,
      });
    }

    return performance;
  }

  /**
   * Calculate win rate trend over time
   */
  getWinRateTrend(days: number = 30): Array<{
    date: string;
    winRate: number;
    matchCount: number;
  }> {
    const daily = this.getDailyStatistics();
    return daily.slice(-days).map(d => ({
      date: d.date,
      winRate: d.averageWinRate,
      matchCount: d.matchCount,
    }));
  }

  /**
   * Get model performance trend
   */
  getModelTrend(model: string, days: number = 30): Array<{
    date: string;
    winRate: number;
    matchCount: number;
    averageLatency: number;
  }> {
    const matches = this.index.getMatchesByAiModel(model);
    const dailyData: Map<string, MatchIndexEntry[]> = new Map();

    for (const match of matches) {
      const date = new Date(match.timestamp).toISOString().split('T')[0];
      if (!dailyData.has(date)) {
        dailyData.set(date, []);
      }
      dailyData.get(date)!.push(match);
    }

    const trend: Array<{
      date: string;
      winRate: number;
      matchCount: number;
      averageLatency: number;
    }> = [];

    for (const [date, dayMatches] of Array.from(dailyData.entries()).sort().slice(-days)) {
      let wins = 0;
      let totalLatency = 0;

      for (const match of dayMatches) {
        const player = match.players.find(p => p.aiModel === model);
        if (player) {
          if (player.won) wins++;
          totalLatency += match.stats.averageLatency;
        }
      }

      trend.push({
        date,
        winRate: wins / dayMatches.length,
        matchCount: dayMatches.length,
        averageLatency: totalLatency / dayMatches.length,
      });
    }

    return trend;
  }

  /**
   * Compare two models
   */
  compareModels(model1: string, model2: string): {
    model1: ModelBenchmark | null;
    model2: ModelBenchmark | null;
    better: string;
    improvement: number; // percentage
  } {
    const benchmarks = this.getModelBenchmarks();
    const b1 = benchmarks.find(b => b.model === model1) || null;
    const b2 = benchmarks.find(b => b.model === model2) || null;

    const winRateImprovement = b2 ? ((b2.winRate - (b1?.winRate || 0)) * 100) : 0;

    return {
      model1: b1,
      model2: b2,
      better: !b1 || (b2 && b2.winRate > b1.winRate) ? model2 : model1,
      improvement: Math.abs(winRateImprovement),
    };
  }
}

