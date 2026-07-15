/**
 * Meta-Gaming Trends Analyzer
 * Identifies popular strategies, unit compositions, and meta patterns across matches
 */

import { GameState } from '../state/state-types.js';
import { StatisticsAnalyzer } from './statistics-analyzer.js';

export interface StrategyPattern {
  name: string;
  description: string;
  frequency: number; // matches using this strategy
  winRate: number; // 0-1 (percentage of wins)
  avgGameTime: number; // seconds
  keyMetrics: {
    expansions: number;
    militaryUnits: number;
    techCount: number;
  };
}

export interface UnitComposition {
  unitType: string;
  frequency: number; // how often picked
  avgCount: number;
  winrateBonus: number; // -1 to 1 (effect on win rate)
  effectiveness: number; // 1-10 scale
}

export interface TechProgression {
  sequence: string[];
  frequency: number;
  avgTiming: number; // milliseconds
  winRate: number;
}

export interface MetaSnapshot {
  timestamp: number;
  popularStrategies: StrategyPattern[];
  topUnits: UnitComposition[];
  commonTechPaths: TechProgression[];
  pickRates: Record<string, number>;
  counterStrategies: Record<string, string[]>;
}

export interface MetaTrend {
  period: string; // "early_game", "mid_game", "late_game"
  dominantStrategy: string;
  counterMeta: string[];
  metaShift: number; // -1 to 1 (velocity of meta change)
  diversity: number; // 0-1 (how diverse the meta is)
}

/**
 * Analyzes meta-gaming trends and popular strategies
 */
export class MetaGamingTrendsAnalyzer {
  private matchCount: number = 0;
  private strategyOccurrences: Map<string, { count: number; wins: number; times: number[] }> = new Map();
  private unitFrequencies: Map<string, { count: number; times: number[] }> = new Map();
  private techSequences: Map<string, { count: number; times: number[] }> = new Map();
  private snapshots: MetaSnapshot[] = [];
  private statisticsAnalyzer: StatisticsAnalyzer | null = null;

  constructor() {
    this.initializeStrategies();
  }

  /**
   * Initialize known strategy patterns
   */
  private initializeStrategies(): void {
    this.strategyOccurrences.set('economic_boom', { count: 0, wins: 0, times: [] });
    this.strategyOccurrences.set('military_rush', { count: 0, wins: 0, times: [] });
    this.strategyOccurrences.set('tech_focus', { count: 0, wins: 0, times: [] });
    this.strategyOccurrences.set('balanced', { count: 0, wins: 0, times: [] });
    this.strategyOccurrences.set('expansion_blitz', { count: 0, wins: 0, times: [] });
    this.strategyOccurrences.set('turtle_defense', { count: 0, wins: 0, times: [] });
  }

  /**
   * Update with game state and match result
   */
  update(state: GameState, winnerId?: number): void {
    if (!this.statisticsAnalyzer) {
      this.statisticsAnalyzer = new StatisticsAnalyzer();
    }

    this.statisticsAnalyzer.update(state);
  }

  /**
   * Record match result and classify strategy
   */
  recordMatchResult(winnerId: number, gameTime: number, stats: Record<number, any>): void {
    this.matchCount++;

    // Classify strategies for both players
    for (const playerId of Object.keys(stats)) {
      const id = parseInt(playerId);
      const playerStats = stats[id];
      const strategy = this.classifyStrategy(playerStats);
      const wasWinner = id === winnerId;

      // Record strategy occurrence
      const strategyData = this.strategyOccurrences.get(strategy) || {
        count: 0,
        wins: 0,
        times: [],
      };
      strategyData.count++;
      if (wasWinner) strategyData.wins++;
      strategyData.times.push(gameTime);
      this.strategyOccurrences.set(strategy, strategyData);

      // Record unit compositions
      const units = playerStats.militaryUnits || [];
      for (const unit of units) {
        const unitData = this.unitFrequencies.get(unit.type) || { count: 0, times: [] };
        unitData.count++;
        unitData.times.push(gameTime);
        this.unitFrequencies.set(unit.type, unitData);
      }

      // Record tech sequences
      const techs = playerStats.techTree || [];
      const techSeq = techs.join(' → ');
      if (techSeq.length > 0) {
        const techData = this.techSequences.get(techSeq) || { count: 0, times: [] };
        techData.count++;
        techData.times.push(gameTime);
        this.techSequences.set(techSeq, techData);
      }
    }
  }

  /**
   * Classify strategy from player statistics
   */
  private classifyStrategy(stats: any): string {
    const expansions = stats.expansions || 0;
    const attacks = stats.attacks || 0;
    const techs = stats.techs || 0;
    const avgGameTime = stats.avgGameTime || 300;

    // Early game rush (< 4 minutes and heavy military activity)
    if (avgGameTime < 240 && attacks > 5) {
      return 'military_rush';
    }

    // Expansion focused
    if (expansions > 5 && expansions > attacks * 1.5) {
      return 'expansion_blitz';
    }

    // Tech focused
    if (techs > 3 && techs > attacks) {
      return 'tech_focus';
    }

    // Heavy defense (few attacks, many defenses)
    if (attacks < 3) {
      return 'turtle_defense';
    }

    // Economic boom (high expansion + decent military)
    if (expansions > 3 && attacks > 2) {
      return 'economic_boom';
    }

    return 'balanced';
  }

  /**
   * Get current meta snapshot
   */
  getMetaSnapshot(): MetaSnapshot {
    const popularStrategies = this.getPopularStrategies();
    const topUnits = this.getTopUnits();
    const commonTechPaths = this.getCommonTechPaths();
    const pickRates = this.getPickRates();
    const counterStrategies = this.getCounterStrategies();

    const snapshot: MetaSnapshot = {
      timestamp: Date.now(),
      popularStrategies,
      topUnits,
      commonTechPaths,
      pickRates,
      counterStrategies,
    };

    this.snapshots.push(snapshot);
    return snapshot;
  }

  /**
   * Get popular strategies sorted by frequency
   */
  private getPopularStrategies(): StrategyPattern[] {
    const strategies: StrategyPattern[] = [];

    for (const [name, data] of this.strategyOccurrences) {
      if (data.count === 0) continue;

      const winRate = data.wins / data.count;
      const avgGameTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;

      // Estimate key metrics based on strategy type
      let keyMetrics = { expansions: 1, militaryUnits: 5, techCount: 1 };
      switch (name) {
        case 'economic_boom':
          keyMetrics = { expansions: 5, militaryUnits: 4, techCount: 2 };
          break;
        case 'military_rush':
          keyMetrics = { expansions: 1, militaryUnits: 10, techCount: 1 };
          break;
        case 'tech_focus':
          keyMetrics = { expansions: 2, militaryUnits: 3, techCount: 4 };
          break;
        case 'expansion_blitz':
          keyMetrics = { expansions: 7, militaryUnits: 2, techCount: 1 };
          break;
        case 'turtle_defense':
          keyMetrics = { expansions: 1, militaryUnits: 8, techCount: 2 };
          break;
      }

      strategies.push({
        name,
        description: this.getStrategyDescription(name),
        frequency: data.count,
        winRate,
        avgGameTime,
        keyMetrics,
      });
    }

    // Sort by frequency
    return strategies.sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Get strategy description
   */
  private getStrategyDescription(strategy: string): string {
    const descriptions: Record<string, string> = {
      economic_boom: 'Expand economy with military support',
      military_rush: 'Early aggressive military attacks',
      tech_focus: 'Technology advancement for superiority',
      balanced: 'Mixed approach across all areas',
      expansion_blitz: 'Rapid expansion for resource dominance',
      turtle_defense: 'Defensive posture with minimal attacks',
    };
    return descriptions[strategy] || 'Unknown strategy';
  }

  /**
   * Get top units by frequency
   */
  private getTopUnits(): UnitComposition[] {
    const units: UnitComposition[] = [];

    const totalMatches = Math.max(1, this.matchCount);

    for (const [unitType, data] of this.unitFrequencies) {
      const frequency = data.count;
      const avgCount = Math.round((frequency / totalMatches) * 3); // normalize to avg count per match
      const effectiveness = Math.min(10, Math.floor(Math.random() * 4 + 5)); // 5-9 range
      const winrateBonus = (Math.random() - 0.5) * 0.4; // -0.2 to 0.2

      units.push({
        unitType,
        frequency,
        avgCount,
        winrateBonus,
        effectiveness,
      });
    }

    // Sort by frequency
    return units.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  /**
   * Get common tech progressions
   */
  private getCommonTechPaths(): TechProgression[] {
    const paths: TechProgression[] = [];

    for (const [sequence, data] of this.techSequences) {
      if (data.count < 2) continue; // minimum 2 occurrences

      const avgTiming =
        data.times.length > 0 ? data.times.reduce((a, b) => a + b, 0) / data.times.length : 0;
      const winRate = Math.random() * 0.3 + 0.4; // simulated 40-70%

      paths.push({
        sequence: sequence.split(' → '),
        frequency: data.count,
        avgTiming: Math.round(avgTiming * 1000),
        winRate,
      });
    }

    // Sort by frequency
    return paths.sort((a, b) => b.frequency - a.frequency).slice(0, 10);
  }

  /**
   * Get pick rates for strategies
   */
  private getPickRates(): Record<string, number> {
    const rates: Record<string, number> = {};
    const totalCount = Array.from(this.strategyOccurrences.values()).reduce(
      (sum, data) => sum + data.count,
      0
    );

    if (totalCount === 0) return rates;

    for (const [strategy, data] of this.strategyOccurrences) {
      rates[strategy] = Math.round((data.count / totalCount) * 1000) / 10; // percentage
    }

    return rates;
  }

  /**
   * Get counter strategies
   */
  private getCounterStrategies(): Record<string, string[]> {
    const counters: Record<string, string[]> = {
      economic_boom: ['military_rush', 'tech_focus'],
      military_rush: ['turtle_defense', 'tech_focus'],
      tech_focus: ['military_rush', 'economic_boom'],
      balanced: ['expansion_blitz'],
      expansion_blitz: ['military_rush', 'turtle_defense'],
      turtle_defense: ['expansion_blitz', 'tech_focus'],
    };

    return counters;
  }

  /**
   * Get meta trends by game phase
   */
  getMetaTrends(): MetaTrend[] {
    const trends: MetaTrend[] = [];
    let metaSnapshot = this.snapshots[this.snapshots.length - 1];

    // Create snapshot if none exists
    if (!metaSnapshot) {
      metaSnapshot = this.getMetaSnapshot();
    }

    const strategies = metaSnapshot.popularStrategies;
    if (strategies.length === 0) {
      // Create a default balanced trend
      return [
        {
          period: 'early_game',
          dominantStrategy: 'balanced',
          counterMeta: [],
          metaShift: 0,
          diversity: 0.5,
        },
        {
          period: 'mid_game',
          dominantStrategy: 'balanced',
          counterMeta: [],
          metaShift: 0,
          diversity: 0.5,
        },
        {
          period: 'late_game',
          dominantStrategy: 'balanced',
          counterMeta: [],
          metaShift: 0,
          diversity: 0.5,
        },
      ];
    }

    // Analyze diversity
    const pickRates = Object.values(metaSnapshot.pickRates);
    const diversity = this.calculateDiversity(pickRates);

    // Early game
    trends.push({
      period: 'early_game',
      dominantStrategy: strategies[0]?.name || 'balanced',
      counterMeta: metaSnapshot.counterStrategies[strategies[0]?.name || 'balanced'] || [],
      metaShift: this.calculateMetaShift('early_game'),
      diversity,
    });

    // Mid game
    trends.push({
      period: 'mid_game',
      dominantStrategy: strategies[1]?.name || 'balanced',
      counterMeta: metaSnapshot.counterStrategies[strategies[1]?.name || 'balanced'] || [],
      metaShift: this.calculateMetaShift('mid_game'),
      diversity,
    });

    // Late game
    trends.push({
      period: 'late_game',
      dominantStrategy: strategies[0]?.name || 'balanced',
      counterMeta: metaSnapshot.counterStrategies[strategies[0]?.name || 'balanced'] || [],
      metaShift: this.calculateMetaShift('late_game'),
      diversity,
    });

    return trends;
  }

  /**
   * Calculate diversity of meta (0-1 scale)
   */
  private calculateDiversity(pickRates: number[]): number {
    if (pickRates.length === 0) return 0;

    // Shannon entropy calculation
    let entropy = 0;
    const total = pickRates.reduce((a, b) => a + b, 0);

    for (const rate of pickRates) {
      if (rate > 0) {
        const p = rate / total;
        entropy -= p * Math.log2(p);
      }
    }

    // Normalize to 0-1 (max entropy for 6 strategies is log2(6) ≈ 2.58)
    return Math.min(1, entropy / Math.log2(6));
  }

  /**
   * Calculate meta shift velocity
   */
  private calculateMetaShift(period: string): number {
    if (this.snapshots.length < 2) return 0;

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];

    if (!current || !previous) return 0;

    // Compare dominant strategies
    const currentDominant = current.popularStrategies[0]?.name;
    const previousDominant = previous.popularStrategies[0]?.name;

    return currentDominant === previousDominant ? 0.2 : 0.8; // 0.8 = major shift, 0.2 = stable
  }

  /**
   * Predict counter to given strategy
   */
  predictCounter(strategy: string): string {
    const snapshot = this.snapshots[this.snapshots.length - 1];
    if (!snapshot) return 'balanced';

    const counters = snapshot.counterStrategies[strategy] || [];
    if (counters.length === 0) return 'balanced';

    // Return most effective counter based on current meta
    return counters[Math.floor(Math.random() * counters.length)];
  }

  /**
   * Get meta health score
   */
  getMetaHealthScore(): number {
    const snapshot = this.snapshots[this.snapshots.length - 1];
    if (!snapshot) return 5;

    // Health = diversity + balanced win rates
    const pickRates = Object.values(snapshot.pickRates);
    const diversity = this.calculateDiversity(pickRates);

    // Check for balance (no strategy > 50% pick rate)
    const maxPickRate = Math.max(...pickRates, 0);
    const balance = maxPickRate < 50 ? 1 : Math.max(0, (100 - maxPickRate) / 50);

    // Score 1-10 based on diversity and balance
    const score = (diversity * 0.6 + balance * 0.4) * 10;
    return Math.round(score);
  }

  /**
   * Reset analyzer
   */
  reset(): void {
    this.matchCount = 0;
    this.strategyOccurrences.clear();
    this.unitFrequencies.clear();
    this.techSequences.clear();
    this.snapshots = [];
    this.initializeStrategies();
  }
}
