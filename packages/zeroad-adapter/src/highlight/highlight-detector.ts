/**
 * Highlight Detector
 * Automatically detects highlight moments during gameplay
 */

import { GameState } from '../state/state-types.js';

export type HighlightType = 'battle' | 'expansion' | 'technology' | 'economy_surge' | 'comeback' | 'victory_push' | 'legendary' | 'critical_moment';

export interface HighlightMoment {
  momentId: string;
  type: HighlightType;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  importance: number; // 1-10
  description: string;
  playerIds: number[];
  tags: string[];
  thumbnail?: {
    timestamp: number;
    position: { x: number; z: number };
  };
}

export interface HighlightSequence {
  sequenceId: string;
  moments: HighlightMoment[];
  totalDuration: number;
  importance: number;
  theme: 'action' | 'strategy' | 'drama' | 'mixed';
}

export interface DetectionMetrics {
  momentCount: number;
  averageImportance: number;
  totalHighlightDuration: number;
  battleCount: number;
  expansionCount: number;
  techCount: number;
  comebackCount: number;
}

/**
 * Detects highlight moments from game state
 */
export class HighlightDetector {
  private moments: HighlightMoment[] = [];
  private previousState: GameState | null = null;
  private lastBattleTime: number = 0;
  private playerEconomyHistory: Map<number, number[]> = new Map();
  private playerMilitaryHistory: Map<number, number[]> = new Map();
  private matchStartTime: number = Date.now();
  private minMomentInterval: number = 5000; // ms, prevent detection spam

  constructor() {}

  /**
   * Update detector with new game state
   */
  update(state: GameState): void {
    const currentTime = Date.now();

    // Initialize player histories
    for (const player of state.players) {
      if (!this.playerEconomyHistory.has(player.id)) {
        this.playerEconomyHistory.set(player.id, []);
      }
      if (!this.playerMilitaryHistory.has(player.id)) {
        this.playerMilitaryHistory.set(player.id, []);
      }
    }

    // Detect various highlight types
    this.detectBattles(state);
    this.detectExpansions(state);
    this.detectTechnology(state);
    this.detectEconomySurge(state);
    this.detectComeback(state);
    this.detectVictoryPush(state);

    this.previousState = state;
  }

  /**
   * Detect battle highlights
   */
  private detectBattles(state: GameState): void {
    const militaryUnits = state.units.filter((u) => this.isMilitaryUnit(u.type));

    // Check for large military concentrations (battles)
    if (militaryUnits.length > 10) {
      // Calculate unit positions clustering
      const clusters = this.findUnitClusters(militaryUnits);

      for (const cluster of clusters) {
        if (cluster.units.length >= 5) {
          // Significant battle detected
          this.recordMoment({
            type: 'battle',
            startTime: this.matchStartTime,
            endTime: this.matchStartTime + state.timestamp,
            description: `Major battle with ${cluster.units.length} units engaged`,
            playerIds: this.getClusterPlayers(cluster.units),
            importance: Math.min(10, Math.floor(cluster.units.length / 2)),
            tags: ['combat', 'engagement', 'military'],
            position: cluster.center,
          });
        }
      }
    }
  }

  /**
   * Detect expansion highlights
   */
  private detectExpansions(state: GameState): void {
    const expansions = state.buildings.filter((b) => b.type === 'Civic Centre');

    if (this.previousState) {
      const previousExpansions = this.previousState.buildings.filter((b) => b.type === 'Civic Centre');

      for (const player of state.players) {
        const playerExpansions = expansions.filter((e) => e.owner === player.id).length;
        const previousPlayerExpansions = previousExpansions.filter((e) => e.owner === player.id).length;

        if (playerExpansions > previousPlayerExpansions) {
          // New expansion detected
          const newExpansionCount = playerExpansions - previousPlayerExpansions;

          if (newExpansionCount >= 2) {
            // Significant expansion burst
            this.recordMoment({
              type: 'expansion',
              startTime: this.matchStartTime,
              endTime: this.matchStartTime + state.timestamp,
              description: `Rapid expansion: ${newExpansionCount} new settlements built`,
              playerIds: [player.id],
              importance: Math.min(10, 5 + newExpansionCount),
              tags: ['economy', 'expansion', 'growth'],
              position: { x: player.id * 50, z: 100 },
            });
          }
        }
      }
    }
  }

  /**
   * Detect technology highlights
   */
  private detectTechnology(state: GameState): void {
    // Tech detected via building construction (Blacksmith, University, etc.)
    const techBuildings = state.buildings.filter((b) => ['Blacksmith', 'University', 'Market'].includes(b.type));

    if (this.previousState) {
      const previousTechBuildings = this.previousState.buildings.filter((b) =>
        ['Blacksmith', 'University', 'Market'].includes(b.type)
      );

      if (techBuildings.length > previousTechBuildings.length) {
        // New tech advancement
        this.recordMoment({
          type: 'technology',
          startTime: this.matchStartTime,
          endTime: this.matchStartTime + state.timestamp,
          description: `Technology advancement detected`,
          playerIds: state.players.map((p) => p.id),
          importance: 7,
          tags: ['tech', 'advancement', 'upgrade'],
          position: { x: 100, z: 100 },
        });
      }
    }
  }

  /**
   * Detect economy surge highlights
   */
  private detectEconomySurge(state: GameState): void {
    for (const player of state.players) {
      const totalResources = player.resources.food + player.resources.wood + player.resources.stone + player.resources.metal;

      const history = this.playerEconomyHistory.get(player.id) || [];
      history.push(totalResources);
      this.playerEconomyHistory.set(player.id, history);

      // Check for rapid growth
      if (history.length >= 2) {
        const previousTotal = history[history.length - 2];
        const growth = totalResources - previousTotal;

        if (growth > 500) {
          // Significant economy surge
          this.recordMoment({
            type: 'economy_surge',
            startTime: this.matchStartTime,
            endTime: this.matchStartTime + state.timestamp,
            description: `Economy surge: +${growth} resources`,
            playerIds: [player.id],
            importance: Math.min(10, 5 + Math.floor(growth / 200)),
            tags: ['economy', 'resources', 'growth'],
            position: { x: player.id * 50, z: 100 },
          });
        }
      }
    }
  }

  /**
   * Detect comeback highlights
   */
  private detectComeback(state: GameState): void {
    if (this.previousState && state.players.length >= 2) {
      const p1Previous = this.previousState.players[0];
      const p2Previous = this.previousState.players[1];
      const p1Current = state.players[0];
      const p2Current = state.players[1];

      if (p1Previous && p2Previous && p1Current && p2Current) {
        const p1PreviousScore = this.calculatePlayerScore(p1Previous);
        const p2PreviousScore = this.calculatePlayerScore(p2Previous);
        const p1CurrentScore = this.calculatePlayerScore(p1Current);
        const p2CurrentScore = this.calculatePlayerScore(p2Current);

        // Check if trailing player suddenly gains advantage
        if (p2PreviousScore > p1PreviousScore && p1CurrentScore > p2CurrentScore) {
          // Comeback detected
          this.recordMoment({
            type: 'comeback',
            startTime: this.matchStartTime,
            endTime: this.matchStartTime + state.timestamp,
            description: `Dramatic comeback by ${p1Current.name}`,
            playerIds: [p1Current.id],
            importance: 9,
            tags: ['drama', 'comeback', 'turning-point'],
            position: { x: 100, z: 100 },
          });
        }
      }
    }
  }

  /**
   * Detect victory push highlights
   */
  private detectVictoryPush(state: GameState): void {
    if (state.players.length >= 2) {
      const scores = state.players.map((p) => ({
        id: p.id,
        score: this.calculatePlayerScore(p),
      }));

      // Sort by score descending
      scores.sort((a, b) => b.score - a.score);

      const leader = scores[0];
      const challenger = scores[1];

      // If leader has dominant advantage, it's a victory push
      if (leader && challenger && leader.score > challenger.score * 1.5) {
        this.recordMoment({
          type: 'victory_push',
          startTime: this.matchStartTime,
          endTime: this.matchStartTime + state.timestamp,
          description: `Victory push: dominant player consolidating lead`,
          playerIds: [leader.id],
          importance: 8,
          tags: ['victory', 'dominance', 'closing'],
          position: { x: leader.id * 50, z: 100 },
        });
      }
    }
  }

  /**
   * Record a highlight moment
   */
  private recordMoment(data: {
    type: HighlightType;
    startTime: number;
    endTime: number;
    description: string;
    playerIds: number[];
    importance: number;
    tags: string[];
    position: { x: number; z: number };
  }): void {
    const now = Date.now();

    // Prevent duplicate detections within interval
    const recentMoment = this.moments.find(
      (m) => m.type === data.type && now - m.endTime < this.minMomentInterval
    );

    if (recentMoment) {
      return; // Skip duplicate
    }

    const moment: HighlightMoment = {
      momentId: `highlight_${this.moments.length}_${now}`,
      type: data.type,
      startTime: data.startTime,
      endTime: data.endTime,
      duration: (data.endTime - data.startTime) / 1000,
      importance: Math.max(1, Math.min(10, data.importance)),
      description: data.description,
      playerIds: data.playerIds,
      tags: data.tags,
      thumbnail: {
        timestamp: data.endTime,
        position: data.position,
      },
    };

    this.moments.push(moment);
  }

  /**
   * Get all detected moments
   */
  getMoments(): HighlightMoment[] {
    return [...this.moments];
  }

  /**
   * Get moments of specific type
   */
  getMomentsByType(type: HighlightType): HighlightMoment[] {
    return this.moments.filter((m) => m.type === type);
  }

  /**
   * Get top moments by importance
   */
  getTopMoments(limit: number = 10): HighlightMoment[] {
    return [...this.moments].sort((a, b) => b.importance - a.importance).slice(0, limit);
  }

  /**
   * Get detection metrics
   */
  getMetrics(): DetectionMetrics {
    const totalHighlightDuration = this.moments.reduce((sum, m) => sum + m.duration, 0);

    return {
      momentCount: this.moments.length,
      averageImportance: this.moments.length > 0 ? this.moments.reduce((sum, m) => sum + m.importance, 0) / this.moments.length : 0,
      totalHighlightDuration,
      battleCount: this.moments.filter((m) => m.type === 'battle').length,
      expansionCount: this.moments.filter((m) => m.type === 'expansion').length,
      techCount: this.moments.filter((m) => m.type === 'technology').length,
      comebackCount: this.moments.filter((m) => m.type === 'comeback').length,
    };
  }

  /**
   * Helper: check if unit is military
   */
  private isMilitaryUnit(type: string): boolean {
    return ['Cavalry', 'Cataphract', 'Archer', 'Spearman', 'Elephant', 'Chariot'].includes(type);
  }

  /**
   * Helper: find unit clusters
   */
  private findUnitClusters(units: any[]): Array<{ center: { x: number; z: number }; units: any[] }> {
    if (units.length === 0) return [];

    const clusters: Array<{ center: { x: number; z: number }; units: any[] }> = [];
    const used = new Set<number>();

    for (let i = 0; i < units.length; i++) {
      if (used.has(i)) continue;

      const cluster = [units[i]];
      used.add(i);

      for (let j = i + 1; j < units.length; j++) {
        if (used.has(j)) continue;

        const dist = Math.sqrt(
          Math.pow(units[i].position.x - units[j].position.x, 2) +
          Math.pow(units[i].position.z - units[j].position.z, 2)
        );

        if (dist < 50) {
          cluster.push(units[j]);
          used.add(j);
        }
      }

      if (cluster.length > 0) {
        const centerX = cluster.reduce((sum, u) => sum + u.position.x, 0) / cluster.length;
        const centerZ = cluster.reduce((sum, u) => sum + u.position.z, 0) / cluster.length;

        clusters.push({
          center: { x: centerX, z: centerZ },
          units: cluster,
        });
      }
    }

    return clusters;
  }

  /**
   * Helper: get player IDs from cluster
   */
  private getClusterPlayers(units: any[]): number[] {
    return [...new Set(units.map((u) => u.owner))];
  }

  /**
   * Helper: calculate player score
   */
  private calculatePlayerScore(player: any): number {
    const resources = player.resources.food + player.resources.wood + player.resources.stone + player.resources.metal;
    return resources + player.populationCurrent * 10;
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.moments = [];
    this.previousState = null;
    this.playerEconomyHistory.clear();
    this.playerMilitaryHistory.clear();
    this.matchStartTime = Date.now();
  }
}
