/**
 * Multi-Match Runner — Run multiple matches between two providers
 *
 * Orchestrates:
 * 1. Run N matches between same two providers
 * 2. Aggregate wins, stats, variance
 * 3. Detect consistency (variance < threshold)
 * 4. Rank providers by win rate
 */

import { SingleMatchRunner } from "./single-match-runner";
import type { SingleMatchConfig, SingleMatchResult } from "./single-match-runner";

export interface MultiMatchConfig extends SingleMatchConfig {
  readonly matches: number;
  readonly swapAfterMatch?: boolean; // Swap player1/player2 to control for first-player advantage
}

export interface MultiMatchAggregateStats {
  readonly provider1Wins: number;
  readonly provider2Wins: number;
  readonly draws: number;
  readonly totalMatches: number;
  readonly provider1WinRate: number;
  readonly provider2WinRate: number;
  readonly avgTicks: number;
  readonly avgDurationMs: number;
  readonly avgResources1: number;
  readonly avgResources2: number;
  readonly avgUnits1: number;
  readonly avgUnits2: number;
  readonly avgBuildings1: number;
  readonly avgBuildings2: number;
  readonly varianceResources1: number;
  readonly varianceResources2: number;
  readonly allMatchesValid: boolean;
}

export interface MultiMatchResult {
  readonly matches: SingleMatchResult[];
  readonly stats: MultiMatchAggregateStats;
}

/**
 * MultiMatchRunner: Run multiple matches between two providers
 *
 * Example:
 * ```
 * const result = await MultiMatchRunner.runMatches({
 *   provider1: { ... },
 *   provider2: { ... },
 *   matches: 5,
 *   swapAfterMatch: true, // Alternate which goes first
 * });
 * ```
 */
export class MultiMatchRunner {
  /**
   * Run multiple matches and aggregate results.
   */
  static async runMatches(config: MultiMatchConfig): Promise<MultiMatchResult> {
    const matches: SingleMatchResult[] = [];
    const swapPlayers = config.swapAfterMatch || false;

    for (let i = 0; i < config.matches; i++) {
      let matchConfig = { ...config };

      // Swap player order every other match to control for first-player advantage
      if (swapPlayers && i % 2 === 1) {
        matchConfig = {
          ...matchConfig,
          provider1: config.provider2,
          provider2: config.provider1,
          player1Name: config.player2Name,
          player2Name: config.player1Name,
        };
      }

      const result = await SingleMatchRunner.runMatch(matchConfig);
      matches.push(result);
    }

    // Aggregate stats
    const stats = this.aggregateStats(matches);

    return { matches, stats };
  }

  /**
   * Aggregate statistics from multiple matches.
   */
  private static aggregateStats(matches: SingleMatchResult[]): MultiMatchAggregateStats {
    const provider1Wins = matches.filter((m) => m.winner === "provider1").length;
    const provider2Wins = matches.filter((m) => m.winner === "provider2").length;
    const draws = matches.filter((m) => m.winner === "draw").length;
    const totalMatches = matches.length;

    const avgTicks = matches.reduce((sum, m) => sum + m.ticks, 0) / totalMatches;
    const avgDurationMs = matches.reduce((sum, m) => sum + m.durationMs, 0) / totalMatches;

    const avgResources1 =
      matches.reduce((sum, m) => sum + m.stats.provider1Resources, 0) / totalMatches;
    const avgResources2 =
      matches.reduce((sum, m) => sum + m.stats.provider2Resources, 0) / totalMatches;

    const avgUnits1 = matches.reduce((sum, m) => sum + m.stats.provider1Units, 0) / totalMatches;
    const avgUnits2 = matches.reduce((sum, m) => sum + m.stats.provider2Units, 0) / totalMatches;

    const avgBuildings1 =
      matches.reduce((sum, m) => sum + m.stats.provider1Buildings, 0) / totalMatches;
    const avgBuildings2 =
      matches.reduce((sum, m) => sum + m.stats.provider2Buildings, 0) / totalMatches;

    // Variance
    const varianceResources1 =
      matches.reduce((sum, m) => sum + Math.pow(m.stats.provider1Resources - avgResources1, 2), 0) /
      totalMatches;
    const varianceResources2 =
      matches.reduce((sum, m) => sum + Math.pow(m.stats.provider2Resources - avgResources2, 2), 0) /
      totalMatches;

    const allMatchesValid = matches.every((m) => m.validationPassed);

    return {
      provider1Wins,
      provider2Wins,
      draws,
      totalMatches,
      provider1WinRate: provider1Wins / totalMatches,
      provider2WinRate: provider2Wins / totalMatches,
      avgTicks,
      avgDurationMs,
      avgResources1,
      avgResources2,
      avgUnits1,
      avgUnits2,
      avgBuildings1,
      avgBuildings2,
      varianceResources1,
      varianceResources2,
      allMatchesValid,
    };
  }

  /**
   * Generate human-readable report.
   */
  static generateReport(result: MultiMatchResult): string {
    const s = result.stats;
    const lines = [
      "=== Multi-Match Results ===",
      `Total matches: ${s.totalMatches}`,
      "",
      "Win Record:",
      `  Provider 1: ${s.provider1Wins}W (${(s.provider1WinRate * 100).toFixed(1)}%)`,
      `  Provider 2: ${s.provider2Wins}W (${(s.provider2WinRate * 100).toFixed(1)}%)`,
      `  Draws: ${s.draws}`,
      "",
      "Averages:",
      `  Ticks: ${s.avgTicks.toFixed(0)}`,
      `  Duration: ${(s.avgDurationMs / 1000).toFixed(1)}s`,
      `  Resources: P1=${s.avgResources1.toFixed(0)}, P2=${s.avgResources2.toFixed(0)}`,
      `  Units: P1=${s.avgUnits1.toFixed(0)}, P2=${s.avgUnits2.toFixed(0)}`,
      `  Buildings: P1=${s.avgBuildings1.toFixed(0)}, P2=${s.avgBuildings2.toFixed(0)}`,
      "",
      "Variance (stability):",
      `  Resources: P1=${Math.sqrt(s.varianceResources1).toFixed(0)}, P2=${Math.sqrt(s.varianceResources2).toFixed(0)}`,
      "",
      `Fair play: ${s.allMatchesValid ? "✓ ALL VALID" : "✗ SOME INVALID"}`,
    ];

    return lines.join("\n");
  }
}
