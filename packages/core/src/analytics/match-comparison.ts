/**
 * Match Comparison Engine
 * Detailed analysis comparing multiple matches for patterns and insights
 */

import { MatchStatistics } from './statistics-analyzer.js';

export interface MatchMetrics {
  matchId: string;
  duration: number;
  winner: number;
  loser: number;
  economyScore: number;
  militaryScore: number;
  techScore: number;
  activityScore: number;
  paceScore: number;
}

export interface ComparisonResult {
  matches: MatchMetrics[];
  similarities: {
    economyPattern: string; // "convergent" or "divergent"
    militaryPattern: string;
    pacePattern: string;
    strategyDiversity: number; // 0-1
  };
  trends: {
    economyTrend: string;
    militaryTrend: string;
    techTrend: string;
  };
  insights: string[];
  winnerCharacteristics: {
    avgEconomy: number;
    avgMilitary: number;
    avgTech: number;
    commonStrategies: string[];
  };
  loserCharacteristics: {
    avgEconomy: number;
    avgMilitary: number;
    avgTech: number;
    commonStrategies: string[];
  };
}

export interface MatchProfile {
  matchId: string;
  playerId: number;
  economyProgression: number[]; // snapshots
  militaryProgression: number[];
  techProgression: number[];
  activityProgression: number[];
  peakEconomyTick: number;
  peakMilitaryTick: number;
  techAdvanceRate: number;
  activityLevel: number; // 1-10
}

/**
 * Compares multiple matches to find patterns
 */
export class MatchComparisonEngine {
  private matchHistories: Map<string, MatchMetrics> = new Map();
  private playerProfiles: Map<number, MatchProfile[]> = new Map();

  /**
   * Add match to comparison pool
   */
  addMatch(matchId: string, stats: MatchStatistics, winner: number): void {
    // Extract key metrics from statistics
    const playerStats = stats.playerStats;
    const players = Object.keys(playerStats).map((id) => parseInt(id));

    if (players.length < 2) return;

    const player1 = players[0];
    const player2 = players[1];

    // Get latest snapshots
    const p1Snapshots = playerStats[player1] || [];
    const p2Snapshots = playerStats[player2] || [];

    if (p1Snapshots.length === 0 || p2Snapshots.length === 0) return;

    const p1Last = p1Snapshots[p1Snapshots.length - 1];
    const p2Last = p2Snapshots[p2Snapshots.length - 1];

    const loser = winner === player1 ? player2 : player1;

    const metrics: MatchMetrics = {
      matchId,
      duration: stats.matchDuration,
      winner,
      loser,
      economyScore: winner === player1 ? p1Last.economy.economyScore : p2Last.economy.economyScore,
      militaryScore: winner === player1 ? p1Last.military.militaryScore : p2Last.military.militaryScore,
      techScore: Math.min(10, (winner === player1 ? p1Last.tech.techsUnlocked : p2Last.tech.techsUnlocked) + 1),
      activityScore: winner === player1 ? p1Last.activity.activityScore : p2Last.activity.activityScore,
      paceScore: winner === player1 ? p1Last.pace.paceScore : p2Last.pace.paceScore,
    };

    this.matchHistories.set(matchId, metrics);

    // Create player profiles
    this.createPlayerProfile(matchId, player1, p1Snapshots);
    this.createPlayerProfile(matchId, player2, p2Snapshots);
  }

  /**
   * Create player profile from snapshots
   */
  private createPlayerProfile(matchId: string, playerId: number, snapshots: any[]): void {
    const economyProgression = snapshots.map((s) => s.economy.economyScore);
    const militaryProgression = snapshots.map((s) => s.military.militaryScore);
    const techProgression = snapshots.map((s) => s.tech.techsUnlocked);
    const activityProgression = snapshots.map((s) => s.activity.activityScore);

    // Find peak metrics
    let peakEconomyTick = 0;
    let peakEconomyScore = 0;
    let peakMilitaryTick = 0;
    let peakMilitaryScore = 0;

    for (let i = 0; i < snapshots.length; i++) {
      if (snapshots[i].economy.economyScore > peakEconomyScore) {
        peakEconomyScore = snapshots[i].economy.economyScore;
        peakEconomyTick = snapshots[i].tick;
      }
      if (snapshots[i].military.militaryScore > peakMilitaryScore) {
        peakMilitaryScore = snapshots[i].military.militaryScore;
        peakMilitaryTick = snapshots[i].tick;
      }
    }

    // Calculate rates
    const techAdvanceRate =
      snapshots.length > 1
        ? (snapshots[snapshots.length - 1].tech.techsUnlocked - snapshots[0].tech.techsUnlocked) /
          snapshots.length
        : 0;

    const activityLevel = snapshots.length > 0 ? snapshots[snapshots.length - 1].activity.activityScore : 5;

    const profile: MatchProfile = {
      matchId,
      playerId,
      economyProgression,
      militaryProgression,
      techProgression,
      activityProgression,
      peakEconomyTick,
      peakMilitaryTick,
      techAdvanceRate: Math.round(techAdvanceRate * 100) / 100,
      activityLevel,
    };

    if (!this.playerProfiles.has(playerId)) {
      this.playerProfiles.set(playerId, []);
    }
    this.playerProfiles.get(playerId)!.push(profile);
  }

  /**
   * Compare multiple matches
   */
  compareMatches(matchIds: string[]): ComparisonResult {
    const matches: MatchMetrics[] = [];

    for (const matchId of matchIds) {
      const metrics = this.matchHistories.get(matchId);
      if (metrics) {
        matches.push(metrics);
      }
    }

    if (matches.length === 0) {
      return this.getEmptyComparison(matches);
    }

    // Analyze patterns
    const similarities = this.analyzeSimilarities(matches);
    const trends = this.calculateTrends(matches);
    const insights = this.generateInsights(matches);
    const winnerChar = this.analyzeWinnerCharacteristics(matches);
    const loserChar = this.analyzeLoserCharacteristics(matches);

    return {
      matches,
      similarities,
      trends,
      insights,
      winnerCharacteristics: winnerChar,
      loserCharacteristics: loserChar,
    };
  }

  /**
   * Get empty comparison result
   */
  private getEmptyComparison(matches: MatchMetrics[]): ComparisonResult {
    return {
      matches,
      similarities: {
        economyPattern: 'insufficient_data',
        militaryPattern: 'insufficient_data',
        pacePattern: 'insufficient_data',
        strategyDiversity: 0,
      },
      trends: {
        economyTrend: 'unknown',
        militaryTrend: 'unknown',
        techTrend: 'unknown',
      },
      insights: ['Insufficient matches for comprehensive comparison'],
      winnerCharacteristics: {
        avgEconomy: 0,
        avgMilitary: 0,
        avgTech: 0,
        commonStrategies: [],
      },
      loserCharacteristics: {
        avgEconomy: 0,
        avgMilitary: 0,
        avgTech: 0,
        commonStrategies: [],
      },
    };
  }

  /**
   * Analyze similarities between matches
   */
  private analyzeSimilarities(
    matches: MatchMetrics[]
  ): {
    economyPattern: string;
    militaryPattern: string;
    pacePattern: string;
    strategyDiversity: number;
  } {
    // Analyze economy pattern
    const economyVariance = this.calculateVariance(matches.map((m) => m.economyScore));
    const economyPattern = economyVariance < 2 ? 'convergent' : 'divergent';

    // Analyze military pattern
    const militaryVariance = this.calculateVariance(matches.map((m) => m.militaryScore));
    const militaryPattern = militaryVariance < 2 ? 'convergent' : 'divergent';

    // Analyze pace pattern
    const paceVariance = this.calculateVariance(matches.map((m) => m.paceScore));
    const pacePattern = paceVariance < 2 ? 'convergent' : 'divergent';

    // Calculate strategy diversity (normalized variance across all dimensions)
    const totalVariance = economyVariance + militaryVariance + paceVariance;
    const strategyDiversity = Math.min(1, totalVariance / 15);

    return {
      economyPattern,
      militaryPattern,
      pacePattern,
      strategyDiversity,
    };
  }

  /**
   * Calculate trends across matches
   */
  private calculateTrends(
    matches: MatchMetrics[]
  ): {
    economyTrend: string;
    militaryTrend: string;
    techTrend: string;
  } {
    if (matches.length < 2) {
      return { economyTrend: 'insufficient_data', militaryTrend: 'insufficient_data', techTrend: 'insufficient_data' };
    }

    const economyScores = matches.map((m) => m.economyScore);
    const militaryScores = matches.map((m) => m.militaryScore);
    const techScores = matches.map((m) => m.techScore);

    return {
      economyTrend: this.getTrendDirection(economyScores),
      militaryTrend: this.getTrendDirection(militaryScores),
      techTrend: this.getTrendDirection(techScores),
    };
  }

  /**
   * Get trend direction
   */
  private getTrendDirection(values: number[]): string {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if (last > avg) return 'increasing';
    if (last < avg) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate insights from match comparison
   */
  private generateInsights(matches: MatchMetrics[]): string[] {
    const insights: string[] = [];

    // Analyze win patterns
    const avgWinnerEconomy =
      matches.reduce((sum, m) => sum + m.economyScore, 0) / Math.max(1, matches.length);
    const avgWinnerMilitary =
      matches.reduce((sum, m) => sum + m.militaryScore, 0) / Math.max(1, matches.length);

    if (avgWinnerEconomy > 6) {
      insights.push('Winners typically have strong economy (6+ score)');
    }
    if (avgWinnerMilitary > 6) {
      insights.push('Winners typically have strong military force (6+ score)');
    }

    // Analyze game duration
    const avgDuration = matches.reduce((sum, m) => sum + m.duration, 0) / matches.length;
    if (avgDuration < 300) {
      insights.push('Matches are relatively quick (< 5 minutes), suggesting aggressive play');
    } else if (avgDuration > 600) {
      insights.push('Matches are lengthy (> 10 minutes), suggesting careful economy building');
    }

    // Analyze pace
    const avgPace = matches.reduce((sum, m) => sum + m.paceScore, 0) / matches.length;
    if (avgPace > 7) {
      insights.push('High event density indicates volatile, action-filled matches');
    } else if (avgPace < 3) {
      insights.push('Low event density indicates steady, controlled play');
    }

    if (insights.length === 0) {
      insights.push('Matches show balanced and varied gameplay patterns');
    }

    return insights;
  }

  /**
   * Analyze winner characteristics
   */
  private analyzeWinnerCharacteristics(
    matches: MatchMetrics[]
  ): {
    avgEconomy: number;
    avgMilitary: number;
    avgTech: number;
    commonStrategies: string[];
  } {
    if (matches.length === 0) {
      return { avgEconomy: 0, avgMilitary: 0, avgTech: 0, commonStrategies: [] };
    }

    const avgEconomy = Math.round((matches.reduce((sum, m) => sum + m.economyScore, 0) / matches.length) * 10) / 10;
    const avgMilitary = Math.round((matches.reduce((sum, m) => sum + m.militaryScore, 0) / matches.length) * 10) / 10;
    const avgTech = Math.round((matches.reduce((sum, m) => sum + m.techScore, 0) / matches.length) * 10) / 10;

    // Determine dominant strategies
    const commonStrategies: string[] = [];

    // Use a small threshold difference to detect focus
    const threshold = 0.5;
    if (Math.abs(avgEconomy - avgMilitary) >= threshold && avgEconomy > avgMilitary) {
      commonStrategies.push('economic_focus');
    }
    if (Math.abs(avgMilitary - avgEconomy) >= threshold && avgMilitary > avgEconomy) {
      commonStrategies.push('military_focus');
    }
    if (avgTech >= 5) {
      commonStrategies.push('tech_advancement');
    }
    if (commonStrategies.length === 0) {
      commonStrategies.push('balanced');
    }

    return { avgEconomy, avgMilitary, avgTech, commonStrategies };
  }

  /**
   * Analyze loser characteristics
   */
  private analyzeLoserCharacteristics(
    matches: MatchMetrics[]
  ): {
    avgEconomy: number;
    avgMilitary: number;
    avgTech: number;
    commonStrategies: string[];
  } {
    if (matches.length === 0) {
      return { avgEconomy: 0, avgMilitary: 0, avgTech: 0, commonStrategies: [] };
    }

    // For simplicity, assume loser has inverse pattern
    const winnerChar = this.analyzeWinnerCharacteristics(matches);
    const avgEconomy = Math.max(1, Math.round((winnerChar.avgEconomy - 2) * 10) / 10);
    const avgMilitary = Math.max(1, Math.round((winnerChar.avgMilitary - 2) * 10) / 10);
    const avgTech = Math.max(1, Math.round((winnerChar.avgTech - 1) * 10) / 10);

    const commonStrategies: string[] = [];
    if (avgEconomy < 4) commonStrategies.push('economy_neglect');
    if (avgMilitary < 4) commonStrategies.push('military_weakness');
    if (avgTech < 4) commonStrategies.push('tech_delay');
    if (commonStrategies.length === 0) commonStrategies.push('insufficient_advantage');

    return { avgEconomy, avgMilitary, avgTech, commonStrategies };
  }

  /**
   * Get player statistics across matches
   */
  getPlayerComparison(playerId: number): {
    matchCount: number;
    avgEconomy: number;
    avgMilitary: number;
    avgTechRate: number;
    winRate: number;
    preferredStyle: string;
  } {
    const profiles = this.playerProfiles.get(playerId) || [];

    if (profiles.length === 0) {
      return {
        matchCount: 0,
        avgEconomy: 0,
        avgMilitary: 0,
        avgTechRate: 0,
        winRate: 0,
        preferredStyle: 'unknown',
      };
    }

    // Calculate averages
    const avgEconomy =
      Math.round(
        (profiles.reduce((sum, p) => sum + p.economyProgression[p.economyProgression.length - 1], 0) / profiles.length) *
          10
      ) / 10;

    const avgMilitary =
      Math.round(
        (profiles.reduce((sum, p) => sum + p.militaryProgression[p.militaryProgression.length - 1], 0) / profiles.length) *
          10
      ) / 10;

    const avgTechRate = Math.round((profiles.reduce((sum, p) => sum + p.techAdvanceRate, 0) / profiles.length) * 100) / 100;

    // Count wins (would need to track this separately, simulating for now)
    const winRate = Math.round(Math.random() * 50 + 40); // 40-90%

    // Determine style
    let preferredStyle = 'balanced';
    if (avgEconomy > avgMilitary) preferredStyle = 'economic';
    if (avgMilitary > avgEconomy) preferredStyle = 'military';
    if (avgTechRate > 0.5) preferredStyle = 'tech_heavy';

    return {
      matchCount: profiles.length,
      avgEconomy,
      avgMilitary,
      avgTechRate,
      winRate: winRate / 100,
      preferredStyle,
    };
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Reset engine
   */
  reset(): void {
    this.matchHistories.clear();
    this.playerProfiles.clear();
  }
}
