/**
 * Match Statistics Analyzer
 * Orchestrates statistical analysis via specialized metric and trend analyzers
 */

import { GameState, Unit, Building, Player } from '../state/state-types.js';
import { MetricsCalculator } from './metrics-calculator.js';
import { TrendAnalyzer } from './trend-analyzer.js';

export interface EconomyMetrics {
  foodIncome: number;
  woodIncome: number;
  stoneIncome: number;
  metalIncome: number;
  totalIncome: number;
  resourceSpent: number;
  economyScore: number; // 1-10
}

export interface MilitaryMetrics {
  unitCount: number;
  militaryValue: number; // aggregate combat power
  casualtyRate: number; // units lost per minute
  avgUnitHealth: number; // 0-100
  militaryScore: number; // 1-10
}

export interface TechMetrics {
  techsUnlocked: number;
  techProgressRate: number; // techs per minute
  avgTechTiming: number; // seconds between techs
  techTree: string[]; // ordered tech names
}

export interface PlayerActivity {
  expansions: number;
  attacks: number;
  defenses: number;
  buildEvents: number;
  activityScore: number; // 1-10
}

export interface GamePaceMetrics {
  phase: 'early' | 'mid' | 'late';
  paceScore: number; // 1-10 (fast=10, slow=1)
  gameTime: number;
  eventDensity: number; // events per minute
}

export interface StatisticsSnapshot {
  tick: number;
  timestamp: number;
  playerId: number;
  economy: EconomyMetrics;
  military: MilitaryMetrics;
  tech: TechMetrics;
  activity: PlayerActivity;
  pace: GamePaceMetrics;
}

export interface MatchStatistics {
  matchDuration: number;
  totalSnapshots: number;
  playerStats: Record<number, StatisticsSnapshot[]>;
  trends: Record<number, { economy: string; military: string; tech: string }>;
  comparativeMetrics: {
    economyDifference: number;
    militaryDifference: number;
    activityDifference: number;
  };
}

/**
 * Analyzes match statistics and trends
 */
export class StatisticsAnalyzer {
  private snapshots: StatisticsSnapshot[] = [];
  private previousState: GameState | null = null;
  private unitCounts: Record<number, number> = {};
  private techHistory: Record<number, Set<string>> = {};
  private eventCounts: Record<number, number> = {};
  private metricsCalculator: MetricsCalculator;
  private trendAnalyzer: TrendAnalyzer;
  private unitValueMap: Record<string, number> = {
    Cavalry: 15,
    Cataphract: 20,
    Archer: 10,
    Spearman: 8,
    Chariot: 18,
    Elephant: 25,
    Legion: 12,
    Phalanx: 10,
  };

  constructor() {
    this.metricsCalculator = new MetricsCalculator();
    this.trendAnalyzer = new TrendAnalyzer();
  }

  /**
   * Update statistics with new game state
   */
  update(state: GameState): void {
    // Create snapshots every 10 ticks (skip tick 0)
    if (state.tick % 10 !== 0 || state.tick === 0) {
      this.previousState = state;
      return;
    }

    for (const player of state.players) {
      const snapshot = this.createSnapshot(state, player.id);
      this.snapshots.push(snapshot);
    }

    this.previousState = state;
  }

  /**
   * Create statistics snapshot for a player
   */
  private createSnapshot(state: GameState, playerId: number): StatisticsSnapshot {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error(`Player ${playerId} not found`);
    }

    // Use metric calculator for all metrics
    const economy = this.metricsCalculator.calculateEconomy(player, state);
    const military = this.metricsCalculator.calculateMilitary(playerId, state, this.unitValueMap);

    // Handle tech tracking
    if (!this.techHistory[playerId]) {
      this.techHistory[playerId] = new Set();
    }
    const currentTechs = this.extractTechs(state, playerId);
    const newTechs = currentTechs.filter((t) => !this.techHistory[playerId].has(t));
    for (const tech of newTechs) {
      this.techHistory[playerId].add(tech);
    }

    const tech = this.metricsCalculator.calculateTech(this.techHistory[playerId].size, state.timestamp);
    tech.techTree = Array.from(this.techHistory[playerId]);

    const activity = this.metricsCalculator.calculateActivity(playerId, state);
    const gameTime = state.timestamp / 1000;
    const pace = this.metricsCalculator.calculateGamePace(gameTime, state.units.length, state.buildings.length);

    return {
      tick: state.tick,
      timestamp: state.timestamp,
      playerId,
      economy,
      military,
      tech,
      activity,
      pace,
    };
  }


  /**
   * Get all statistics
   */
  getStatistics(): MatchStatistics {
    const playerStats: Record<number, StatisticsSnapshot[]> = {};

    // Organize snapshots by player
    for (const snapshot of this.snapshots) {
      if (!playerStats[snapshot.playerId]) {
        playerStats[snapshot.playerId] = [];
      }
      playerStats[snapshot.playerId].push(snapshot);
    }

    // Use trend analyzer for trends and comparatives
    const trends = this.trendAnalyzer.analyzeTrends(playerStats);
    const comparativeMetrics = this.trendAnalyzer.calculateComparativeMetrics(playerStats);

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const matchDuration = lastSnapshot ? lastSnapshot.timestamp / 1000 : 0;

    return {
      matchDuration: Math.round(matchDuration),
      totalSnapshots: this.snapshots.length,
      playerStats,
      trends,
      comparativeMetrics,
    };
  }

  /**
   * Get player statistics
   */
  getPlayerStatistics(playerId: number): StatisticsSnapshot[] {
    return this.snapshots.filter((s) => s.playerId === playerId);
  }

  /**
   * Get trend analysis
   */
  getTrendAnalysis(playerId: number): string {
    const stats = this.getPlayerStatistics(playerId);
    return this.trendAnalyzer.generateTrendReport(stats);
  }

  /**
   * Helper: extract tech names from buildings
   */
  private extractTechs(state: GameState, playerId: number): string[] {
    const techs: string[] = [];
    const buildings = state.buildings.filter((b) => b.owner === playerId);

    const techBuildings: Record<string, string> = {
      'Blacksmith': 'Iron Working',
      'University': 'Philosophy',
      'Market': 'Trade',
      'Temple': 'Religion',
      'Siege Workshop': 'Siege Engineering',
    };

    for (const building of buildings) {
      if (techBuildings[building.type]) {
        techs.push(techBuildings[building.type]);
      }
    }

    return techs;
  }

  /**
   * Reset analyzer
   */
  reset(): void {
    this.snapshots = [];
    this.previousState = null;
    this.unitCounts = {};
    this.techHistory = {};
    this.eventCounts = {};
  }
}
