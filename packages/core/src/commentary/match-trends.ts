/**
 * Story 50.4 — Historical Trends
 *
 * Track and analyze performance trends over time.
 * Enable:
 * - Model performance evolution
 * - Prompt effectiveness changes
 * - Seasonal patterns and anomalies
 * - Predictive trend analysis
 */

import { Logger } from '../config/logger.js';
import { StatisticsAPI } from './match-statistics.js';

export interface TrendPoint {
  date: string;
  value: number;
  matchCount: number;
}

export interface TrendAnalysis {
  name: string;
  trend: 'improving' | 'degrading' | 'stable';
  slope: number; // rate of change
  startValue: number;
  endValue: number;
  change: number; // percentage
  volatility: number; // standard deviation of changes
  anomalies: Array<{ date: string; value: number; deviation: number }>;
}

export interface PerformanceComparison {
  period1: {
    label: string;
    startDate: string;
    endDate: string;
    winRate: number;
    avgLatency: number;
    matchCount: number;
  };
  period2: {
    label: string;
    startDate: string;
    endDate: string;
    winRate: number;
    avgLatency: number;
    matchCount: number;
  };
  improvement: {
    winRateChange: number;
    latencyChange: number;
    recommendation: string;
  };
}

export interface SeasonalPattern {
  dayOfWeek: number;
  label: string;
  avgWinRate: number;
  avgLatency: number;
  matchCount: number;
}

export class TrendAnalyzer {
  private stats: StatisticsAPI;
  private logger: Logger;

  constructor(stats: StatisticsAPI, logger: Logger) {
    this.stats = stats;
    this.logger = logger;
  }

  /**
   * Analyze trend for a metric
   */
  analyzeTrend(dataPoints: TrendPoint[]): TrendAnalysis | null {
    if (dataPoints.length < 2) return null;

    const values = dataPoints.map(p => p.value);
    const n = values.length;

    // Calculate linear regression (slope)
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumX2 += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Determine trend direction
    let trend: 'improving' | 'degrading' | 'stable';
    if (Math.abs(slope) < 0.001) {
      trend = 'stable';
    } else if (slope > 0) {
      trend = 'improving';
    } else {
      trend = 'degrading';
    }

    // Calculate volatility
    const avgValue = values.reduce((a, b) => a + b) / n;
    let variance = 0;
    for (const v of values) {
      variance += Math.pow(v - avgValue, 2);
    }
    const volatility = Math.sqrt(variance / n);

    // Detect anomalies (values > 2 std devs from mean)
    const stdDev = volatility;
    const anomalies: Array<{ date: string; value: number; deviation: number }> = [];

    for (let i = 0; i < n; i++) {
      const deviation = Math.abs(values[i] - avgValue) / stdDev;
      if (deviation > 2) {
        anomalies.push({
          date: dataPoints[i].date,
          value: values[i],
          deviation,
        });
      }
    }

    const change = ((values[n - 1] - values[0]) / values[0]) * 100;

    return {
      name: '',
      trend,
      slope,
      startValue: values[0],
      endValue: values[n - 1],
      change,
      volatility,
      anomalies,
    };
  }

  /**
   * Get model performance trend with analysis
   */
  getModelTrendAnalysis(model: string): TrendAnalysis | null {
    const trend = this.stats.getModelTrend(model, 90);
    if (trend.length === 0) return null;

    const dataPoints: TrendPoint[] = trend.map(t => ({
      date: t.date,
      value: t.winRate,
      matchCount: t.matchCount,
    }));

    const analysis = this.analyzeTrend(dataPoints);
    if (analysis) {
      analysis.name = model;
    }

    return analysis;
  }

  /**
   * Compare performance across two time periods
   */
  comparePeriods(
    stats: Array<{ date: string; winRate: number; avgLatency: number; matchCount: number }>,
    splitIndex: number
  ): PerformanceComparison | null {
    if (stats.length < 2 || splitIndex < 1 || splitIndex >= stats.length) {
      return null;
    }

    const period1 = stats.slice(0, splitIndex);
    const period2 = stats.slice(splitIndex);

    const avgPeriod1WinRate = period1.reduce((sum, s) => sum + s.winRate, 0) / period1.length;
    const avgPeriod1Latency =
      period1.reduce((sum, s) => sum + s.avgLatency, 0) / period1.length;

    const avgPeriod2WinRate = period2.reduce((sum, s) => sum + s.winRate, 0) / period2.length;
    const avgPeriod2Latency =
      period2.reduce((sum, s) => sum + s.avgLatency, 0) / period2.length;

    const winRateChange = (avgPeriod2WinRate - avgPeriod1WinRate) * 100;
    const latencyChange = ((avgPeriod2Latency - avgPeriod1Latency) / avgPeriod1Latency) * 100;

    let recommendation = '';
    if (winRateChange > 5) {
      recommendation = 'Significant improvement in win rate. Continue current strategy.';
    } else if (winRateChange < -5) {
      recommendation = 'Significant decline in win rate. Review and adjust strategy.';
    } else if (latencyChange < -10) {
      recommendation = 'Latency improved. Good optimization results.';
    } else {
      recommendation = 'Performance relatively stable. Monitor closely.';
    }

    return {
      period1: {
        label: `Period 1 (${period1[0].date} to ${period1[period1.length - 1].date})`,
        startDate: period1[0].date,
        endDate: period1[period1.length - 1].date,
        winRate: avgPeriod1WinRate,
        avgLatency: avgPeriod1Latency,
        matchCount: period1.length,
      },
      period2: {
        label: `Period 2 (${period2[0].date} to ${period2[period2.length - 1].date})`,
        startDate: period2[0].date,
        endDate: period2[period2.length - 1].date,
        winRate: avgPeriod2WinRate,
        avgLatency: avgPeriod2Latency,
        matchCount: period2.length,
      },
      improvement: {
        winRateChange,
        latencyChange,
        recommendation,
      },
    };
  }

  /**
   * Detect seasonality patterns (by day of week)
   */
  getSeasonalPatterns(
    stats: Array<{ date: string; winRate: number; avgLatency: number; matchCount: number }>
  ): SeasonalPattern[] {
    const dayPatterns: Record<
      number,
      { wins: number; latencies: number[]; matchCounts: number[] }
    > = {};

    for (let i = 0; i < 7; i++) {
      dayPatterns[i] = { wins: 0, latencies: [], matchCounts: [] };
    }

    for (const stat of stats) {
      const date = new Date(stat.date);
      const dayOfWeek = date.getDay();

      dayPatterns[dayOfWeek].wins += stat.winRate * stat.matchCount;
      dayPatterns[dayOfWeek].latencies.push(stat.avgLatency);
      dayPatterns[dayOfWeek].matchCounts.push(stat.matchCount);
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const patterns: SeasonalPattern[] = [];

    for (let i = 0; i < 7; i++) {
      const pattern = dayPatterns[i];

      if (pattern.matchCounts.length === 0) continue;

      const totalMatches = pattern.matchCounts.reduce((a, b) => a + b, 0);
      const avgWinRate = totalMatches > 0 ? pattern.wins / totalMatches : 0;
      const avgLatency =
        pattern.latencies.length > 0
          ? pattern.latencies.reduce((a, b) => a + b) / pattern.latencies.length
          : 0;

      patterns.push({
        dayOfWeek: i,
        label: dayNames[i],
        avgWinRate,
        avgLatency,
        matchCount: totalMatches,
      });
    }

    return patterns;
  }

  /**
   * Identify periods of improvement
   */
  findImprovementPeriods(
    trend: TrendPoint[],
    windowSize: number = 3
  ): Array<{
    startDate: string;
    endDate: string;
    avgImprovement: number;
    startValue: number;
    endValue: number;
  }> {
    if (trend.length < windowSize) return [];

    const improvements: Array<{
      startDate: string;
      endDate: string;
      avgImprovement: number;
      startValue: number;
      endValue: number;
    }> = [];

    for (let i = 0; i <= trend.length - windowSize; i++) {
      const window = trend.slice(i, i + windowSize);
      const values = window.map(p => p.value);
      const startValue = values[0];
      const endValue = values[values.length - 1];
      const improvement = ((endValue - startValue) / startValue) * 100;

      if (improvement > 5) {
        // At least 5% improvement
        improvements.push({
          startDate: window[0].date,
          endDate: window[window.length - 1].date,
          avgImprovement: improvement,
          startValue,
          endValue,
        });
      }
    }

    return improvements;
  }

  /**
   * Calculate moving average
   */
  calculateMovingAverage(trend: TrendPoint[], windowSize: number): TrendPoint[] {
    if (trend.length < windowSize) return trend;

    const result: TrendPoint[] = [];

    for (let i = 0; i <= trend.length - windowSize; i++) {
      const window = trend.slice(i, i + windowSize);
      const avgValue = window.reduce((sum, p) => sum + p.value, 0) / windowSize;
      const totalMatches = window.reduce((sum, p) => sum + p.matchCount, 0);

      result.push({
        date: window[Math.floor(windowSize / 2)].date,
        value: avgValue,
        matchCount: totalMatches,
      });
    }

    return result;
  }

  /**
   * Forecast next value using linear trend
   */
  forecast(trend: TrendPoint[], daysAhead: number = 7): { date: string; predictedValue: number }[] {
    const analysis = this.analyzeTrend(trend);
    if (!analysis) return [];

    const n = trend.length;
    const forecasts: { date: string; predictedValue: number }[] = [];

    for (let i = 1; i <= daysAhead; i++) {
      const predictedValue = analysis.startValue + analysis.slope * (n + i - 1);

      // Simple date increment (assumes daily data)
      const lastDate = new Date(trend[n - 1].date);
      const forecastDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);

      forecasts.push({
        date: forecastDate.toISOString().split('T')[0],
        predictedValue,
      });
    }

    return forecasts;
  }
}
