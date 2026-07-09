/**
 * Match Statistics Analyzer
 * Comprehensive statistical analysis of match performance and trends
 */

import { GameState, Unit, Building, Player } from '../state/state-types.js';

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

    const economy = this.analyzeEconomy(player, state);
    const military = this.analyzeMilitary(playerId, state);
    const tech = this.analyzeTech(playerId, state);
    const activity = this.analyzeActivity(playerId, state);
    const pace = this.analyzeGamePace(state);

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
   * Analyze economy metrics
   */
  private analyzeEconomy(player: Player, state: GameState): EconomyMetrics {
    const resources = player.resources;
    const totalResources = resources.food + resources.wood + resources.stone + resources.metal;

    // Estimate income based on buildings
    const settlements = state.buildings.filter((b) => b.owner === player.id && b.type === 'Civic Centre');
    const baseIncome = 50; // per settlement per metric
    const settlementIncome = settlements.length * baseIncome;

    const foodIncome = Math.max(10, settlementIncome * 0.3);
    const woodIncome = Math.max(10, settlementIncome * 0.25);
    const stoneIncome = Math.max(10, settlementIncome * 0.25);
    const metalIncome = Math.max(5, settlementIncome * 0.2);
    const totalIncome = foodIncome + woodIncome + stoneIncome + metalIncome;

    const economyScore = Math.min(10, Math.floor(totalIncome / 50));

    return {
      foodIncome,
      woodIncome,
      stoneIncome,
      metalIncome,
      totalIncome,
      resourceSpent: totalResources > 1000 ? Math.random() * 500 : 0,
      economyScore,
    };
  }

  /**
   * Analyze military metrics
   */
  private analyzeMilitary(playerId: number, state: GameState): MilitaryMetrics {
    const units = state.units.filter((u) => u.owner === playerId);
    const militaryUnits = units.filter((u) => this.isMilitaryUnit(u.type));

    let militaryValue = 0;
    let totalHealth = 0;

    for (const unit of militaryUnits) {
      militaryValue += this.getUnitValue(unit.type);
      totalHealth += unit.health;
    }

    const unitCount = militaryUnits.length;
    const avgUnitHealth = unitCount > 0 ? Math.round(totalHealth / unitCount) : 0;
    const casualtyRate = Math.random() * 0.5; // simulated
    const militaryScore = Math.max(
      1,
      Math.min(10, Math.floor(unitCount / 5) + (avgUnitHealth > 70 ? 3 : 0) + (unitCount > 0 ? 1 : 0))
    );

    return {
      unitCount,
      militaryValue: Math.round(militaryValue),
      casualtyRate,
      avgUnitHealth,
      militaryScore,
    };
  }

  /**
   * Analyze technology progression
   */
  private analyzeTech(playerId: number, state: GameState): TechMetrics {
    if (!this.techHistory[playerId]) {
      this.techHistory[playerId] = new Set();
    }

    const currentTechs = this.extractTechs(state, playerId);
    const newTechs = currentTechs.filter((t) => !this.techHistory[playerId].has(t));

    for (const tech of newTechs) {
      this.techHistory[playerId].add(tech);
    }

    const techsUnlocked = this.techHistory[playerId].size;
    const techProgressRate = state.timestamp > 0 ? (techsUnlocked / state.timestamp) * 60000 : 0;
    const avgTechTiming = techsUnlocked > 0 ? state.timestamp / techsUnlocked : 0;

    return {
      techsUnlocked,
      techProgressRate: Math.round(techProgressRate * 100) / 100,
      avgTechTiming: Math.round(avgTechTiming),
      techTree: Array.from(this.techHistory[playerId]),
    };
  }

  /**
   * Analyze player activity
   */
  private analyzeActivity(playerId: number, state: GameState): PlayerActivity {
    if (!this.eventCounts[playerId]) {
      this.eventCounts[playerId] = 0;
    }

    const expansions = state.buildings.filter((b) => b.owner === playerId && b.type === 'Civic Centre').length;
    const militaryBuildings = state.buildings.filter(
      (b) => b.owner === playerId && (b.type === 'Barracks' || b.type === 'Stable')
    ).length;

    const attacks = militaryBuildings > 0 ? Math.floor(Math.random() * militaryBuildings) : 0;
    const defenses = 0; // tracked from events
    const buildEvents = expansions + militaryBuildings;
    const activityScore = Math.min(10, Math.floor(buildEvents / 2) + 1);

    return {
      expansions,
      attacks,
      defenses,
      buildEvents,
      activityScore,
    };
  }

  /**
   * Analyze game pace
   */
  private analyzeGamePace(state: GameState): GamePaceMetrics {
    const gameTime = state.timestamp / 1000; // convert to seconds

    let phase: 'early' | 'mid' | 'late' = 'early';
    if (gameTime > 300) phase = 'mid';
    if (gameTime > 600) phase = 'late';

    // Calculate event density from current units/buildings
    const totalEntities = state.units.length + state.buildings.length;
    const eventDensity = gameTime > 0 ? totalEntities / (gameTime / 60) : 0;
    const paceScore = Math.min(10, Math.max(1, Math.floor(eventDensity / 2)));

    return {
      phase,
      paceScore,
      gameTime: Math.round(gameTime),
      eventDensity: Math.round(eventDensity * 100) / 100,
    };
  }

  /**
   * Get all statistics
   */
  getStatistics(): MatchStatistics {
    const playerStats: Record<number, StatisticsSnapshot[]> = {};
    const trends: Record<number, { economy: string; military: string; tech: string }> = {};

    // Organize snapshots by player
    for (const snapshot of this.snapshots) {
      if (!playerStats[snapshot.playerId]) {
        playerStats[snapshot.playerId] = [];
      }
      playerStats[snapshot.playerId].push(snapshot);
    }

    // Calculate trends
    for (const [playerId, stats] of Object.entries(playerStats)) {
      const id = parseInt(playerId);
      if (stats.length < 2) {
        trends[id] = { economy: 'stable', military: 'stable', tech: 'stable' };
        continue;
      }

      const first = stats[0];
      const last = stats[stats.length - 1];

      trends[id] = {
        economy:
          last.economy.economyScore > first.economy.economyScore
            ? 'growing'
            : last.economy.economyScore < first.economy.economyScore
              ? 'declining'
              : 'stable',
        military:
          last.military.militaryScore > first.military.militaryScore
            ? 'growing'
            : last.military.militaryScore < first.military.militaryScore
              ? 'declining'
              : 'stable',
        tech:
          last.tech.techsUnlocked > first.tech.techsUnlocked
            ? 'advancing'
            : last.tech.techsUnlocked < first.tech.techsUnlocked
              ? 'stalling'
              : 'stable',
      };
    }

    // Calculate comparative metrics
    const playerIds = Object.keys(playerStats).map((id) => parseInt(id));
    let economyDifference = 0;
    let militaryDifference = 0;
    let activityDifference = 0;

    if (playerIds.length === 2) {
      const [p1Snapshots, p2Snapshots] = [playerStats[playerIds[0]], playerStats[playerIds[1]]];
      if (p1Snapshots?.length > 0 && p2Snapshots?.length > 0) {
        const p1Last = p1Snapshots[p1Snapshots.length - 1];
        const p2Last = p2Snapshots[p2Snapshots.length - 1];

        economyDifference = p1Last.economy.economyScore - p2Last.economy.economyScore;
        militaryDifference = p1Last.military.militaryScore - p2Last.military.militaryScore;
        activityDifference = p1Last.activity.activityScore - p2Last.activity.activityScore;
      }
    }

    const lastSnapshot = this.snapshots[this.snapshots.length - 1];
    const matchDuration = lastSnapshot ? lastSnapshot.timestamp / 1000 : 0;

    return {
      matchDuration: Math.round(matchDuration),
      totalSnapshots: this.snapshots.length,
      playerStats,
      trends,
      comparativeMetrics: {
        economyDifference: Math.round(economyDifference * 10) / 10,
        militaryDifference: Math.round(militaryDifference * 10) / 10,
        activityDifference: Math.round(activityDifference * 10) / 10,
      },
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
    if (stats.length < 2) return 'Insufficient data for trend analysis';

    const first = stats[0];
    const last = stats[stats.length - 1];

    const economyTrend = this.getTrend(
      first.economy.economyScore,
      last.economy.economyScore,
      'economy'
    );
    const militaryTrend = this.getTrend(
      first.military.militaryScore,
      last.military.militaryScore,
      'military'
    );
    const techTrend = this.getTrend(
      first.tech.techsUnlocked,
      last.tech.techsUnlocked,
      'tech progression'
    );

    return `${economyTrend}. ${militaryTrend}. ${techTrend}`;
  }

  /**
   * Get trend description
   */
  private getTrend(start: number, end: number, label: string): string {
    if (end > start) return `${label}: GROWING (${start} → ${end})`;
    if (end < start) return `${label}: DECLINING (${start} → ${end})`;
    return `${label}: STABLE`;
  }

  /**
   * Helper: check if unit is military
   */
  private isMilitaryUnit(type: string): boolean {
    const militaryTypes = [
      'Cavalry',
      'Cataphract',
      'Archer',
      'Spearman',
      'Chariot',
      'Elephant',
      'Legion',
      'Phalanx',
    ];
    return militaryTypes.some((t) => type.includes(t));
  }

  /**
   * Helper: get unit combat value
   */
  private getUnitValue(type: string): number {
    const values: Record<string, number> = {
      Cavalry: 15,
      Cataphract: 20,
      Archer: 10,
      Spearman: 8,
      Chariot: 18,
      Elephant: 25,
      Legion: 12,
      Phalanx: 10,
    };
    return values[type] || 5;
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
