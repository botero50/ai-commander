/**
 * Highlight Generator
 * Automatically identifies and generates highlight clips from matches
 */

export type HighlightType =
  | 'biggest_battle'
  | 'largest_army'
  | 'fastest_expansion'
  | 'largest_economy'
  | 'decisive_attack'
  | 'victory_push';

export interface HighlightMarker {
  id: string;
  type: HighlightType;
  tick: number;
  timestamp: number;
  title: string;
  description: string;
  startTick: number;
  endTick: number;
  duration: number; // milliseconds
  value: number; // quantitative measure (army size, resources, etc.)
  relatedPlayer: 'player1' | 'player2' | 'both';
  metadata: Record<string, unknown>;
}

export interface HighlightReel {
  id: string;
  matchId: string;
  duration: number; // milliseconds, target ~180000 (3 minutes)
  totalDuration: number; // actual calculated duration
  highlights: HighlightMarker[];
  sequenceOrder: HighlightMarker[];
  matchDuration: number;
  winner: 'player1' | 'player2';
}

export interface HighlightGeneratorState {
  tick: number;
  timestamp: number;
  isComplete: boolean;
  totalHighlights: number;
  estimatedReelDuration: number;
  highlightsByType: Record<HighlightType, number>;
}

type HighlightGeneratorSubscriber = (state: HighlightGeneratorState) => void;

/**
 * Highlight Generator
 * Analyzes match and generates automatic highlight clips
 */
export class HighlightGenerator {
  private highlights: HighlightMarker[] = [];
  private highlightIdCounter = 0;
  private subscribers: Set<HighlightGeneratorSubscriber> = new Set();
  private isComplete = false;
  private matchId = '';
  private targetReelDuration = 180000; // 3 minutes in milliseconds

  constructor(matchId: string = '') {
    this.matchId = matchId;
  }

  /**
   * Record biggest battle
   */
  recordBiggestBattle(
    tick: number,
    timestamp: number,
    unitCount: number,
    player1Units: number,
    player2Units: number,
    durationTicks: number = 300
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'biggest_battle',
      tick,
      timestamp,
      title: `Biggest Battle — ${unitCount} Units`,
      description: `${player1Units}v${player2Units} engagement with ${unitCount} total units involved`,
      startTick: Math.max(0, tick - 50),
      endTick: tick + 250,
      duration: durationTicks * 33, // Convert ticks to ms
      value: unitCount,
      relatedPlayer: 'both',
      metadata: {
        player1Units,
        player2Units,
        totalUnits: unitCount,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Record largest army
   */
  recordLargestArmy(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    armyValue: number,
    unitCount: number,
    durationTicks: number = 200
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'largest_army',
      tick,
      timestamp,
      title: `Largest Army — ${player === 'player1' ? 'Player 1' : 'Player 2'}`,
      description: `Peak army value of ${armyValue} with ${unitCount} units`,
      startTick: Math.max(0, tick - 100),
      endTick: tick + 100,
      duration: durationTicks * 33,
      value: armyValue,
      relatedPlayer: player,
      metadata: {
        armyValue,
        unitCount,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Record fastest expansion
   */
  recordFastestExpansion(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    resourcesGathered: number,
    buildingCount: number,
    expansionRate: number, // resources/sec
    durationTicks: number = 250
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'fastest_expansion',
      tick,
      timestamp,
      title: `Fastest Expansion — ${player === 'player1' ? 'Player 1' : 'Player 2'}`,
      description: `Rapid expansion: ${resourcesGathered} resources gathered, ${buildingCount} buildings`,
      startTick: Math.max(0, tick - 150),
      endTick: tick + 100,
      duration: durationTicks * 33,
      value: expansionRate,
      relatedPlayer: player,
      metadata: {
        resourcesGathered,
        buildingCount,
        expansionRate,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Record largest economy
   */
  recordLargestEconomy(
    tick: number,
    timestamp: number,
    player: 'player1' | 'player2',
    totalResources: number,
    resourceBreakdown: Record<string, number>,
    durationTicks: number = 200
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'largest_economy',
      tick,
      timestamp,
      title: `Largest Economy — ${player === 'player1' ? 'Player 1' : 'Player 2'}`,
      description: `Peak resources: ${totalResources} total`,
      startTick: Math.max(0, tick - 100),
      endTick: tick + 100,
      duration: durationTicks * 33,
      value: totalResources,
      relatedPlayer: player,
      metadata: {
        totalResources,
        resourceBreakdown,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Record decisive attack
   */
  recordDecisiveAttack(
    tick: number,
    timestamp: number,
    attacker: 'player1' | 'player2',
    targetType: string,
    unitsLost: number,
    targetDestroyed: boolean,
    durationTicks: number = 250
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'decisive_attack',
      tick,
      timestamp,
      title: `Decisive Attack — ${attacker === 'player1' ? 'Player 1' : 'Player 2'}`,
      description: `${targetDestroyed ? 'Destroyed' : 'Damaged'} ${targetType}, ${unitsLost} units lost in exchange`,
      startTick: Math.max(0, tick - 50),
      endTick: tick + 200,
      duration: durationTicks * 33,
      value: unitsLost,
      relatedPlayer: attacker,
      metadata: {
        targetType,
        unitsLost,
        targetDestroyed,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Record victory push
   */
  recordVictoryPush(
    tick: number,
    timestamp: number,
    winner: 'player1' | 'player2',
    unitsInvolved: number,
    finalObjective: string,
    durationTicks: number = 400
  ): HighlightMarker {
    const marker: HighlightMarker = {
      id: `highlight-${this.highlightIdCounter++}`,
      type: 'victory_push',
      tick,
      timestamp,
      title: `Victory Push — ${winner === 'player1' ? 'Player 1' : 'Player 2'}`,
      description: `Final assault with ${unitsInvolved} units, objective: ${finalObjective}`,
      startTick: Math.max(0, tick - 150),
      endTick: tick + 250,
      duration: durationTicks * 33,
      value: unitsInvolved,
      relatedPlayer: winner,
      metadata: {
        unitsInvolved,
        finalObjective,
      },
    };

    this.highlights.push(marker);
    this.emitUpdate(tick, timestamp);
    return marker;
  }

  /**
   * Finalize highlight reel
   */
  finalizeReel(
    matchDuration: number,
    winner: 'player1' | 'player2',
    tick: number,
    timestamp: number
  ): HighlightReel {
    this.isComplete = true;

    // Sort highlights by importance and type variety
    const sequenceOrder = this.getOptimalSequence();

    // Calculate total reel duration
    let totalDuration = 0;
    for (const highlight of sequenceOrder) {
      totalDuration += highlight.duration;
    }

    const reel: HighlightReel = {
      id: `reel-${Date.now()}`,
      matchId: this.matchId,
      duration: this.targetReelDuration,
      totalDuration,
      highlights: [...this.highlights],
      sequenceOrder,
      matchDuration,
      winner,
    };

    this.emitUpdate(tick, timestamp);
    return reel;
  }

  /**
   * Get optimal highlight sequence for reel
   */
  private getOptimalSequence(): HighlightMarker[] {
    if (this.highlights.length === 0) return [];

    // Sort by importance: victory_push > decisive_attack > others
    const typeImportance: Record<HighlightType, number> = {
      victory_push: 1000,
      decisive_attack: 800,
      biggest_battle: 600,
      largest_army: 500,
      largest_economy: 400,
      fastest_expansion: 300,
    };

    return [...this.highlights].sort((a, b) => {
      const aImportance = typeImportance[a.type];
      const bImportance = typeImportance[b.type];

      if (aImportance !== bImportance) {
        return bImportance - aImportance;
      }

      // If same importance, sort by value (larger is better)
      return b.value - a.value;
    });
  }

  /**
   * Subscribe to highlight generator updates
   */
  subscribe(callback: HighlightGeneratorSubscriber): () => void {
    this.subscribers.add(callback);
    this.emitUpdate(0, 0);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get highlights by type
   */
  getHighlightsByType(type: HighlightType): HighlightMarker[] {
    return this.highlights.filter((h) => h.type === type);
  }

  /**
   * Get highlights for a player
   */
  getHighlightsForPlayer(player: 'player1' | 'player2'): HighlightMarker[] {
    return this.highlights.filter((h) => h.relatedPlayer === player || h.relatedPlayer === 'both');
  }

  /**
   * Get estimated reel duration
   */
  getEstimatedReelDuration(): number {
    return this.highlights.reduce((sum, h) => sum + h.duration, 0);
  }

  /**
   * Get highlight type counts
   */
  getHighlightCounts(): Record<HighlightType, number> {
    const counts: Record<HighlightType, number> = {
      biggest_battle: 0,
      largest_army: 0,
      fastest_expansion: 0,
      largest_economy: 0,
      decisive_attack: 0,
      victory_push: 0,
    };

    for (const highlight of this.highlights) {
      counts[highlight.type]++;
    }

    return counts;
  }

  /**
   * Emit state update
   */
  private emitUpdate(tick: number, timestamp: number): void {
    const state: HighlightGeneratorState = {
      tick,
      timestamp,
      isComplete: this.isComplete,
      totalHighlights: this.highlights.length,
      estimatedReelDuration: this.getEstimatedReelDuration(),
      highlightsByType: this.getHighlightCounts(),
    };

    for (const subscriber of this.subscribers) {
      try {
        subscriber(state);
      } catch (err) {
        console.error('Error in highlight generator subscriber:', err);
      }
    }
  }

  /**
   * Get all highlights
   */
  getAllHighlights(): HighlightMarker[] {
    return [...this.highlights];
  }

  /**
   * Reset generator
   */
  reset(): void {
    this.highlights = [];
    this.highlightIdCounter = 0;
    this.isComplete = false;
    this.subscribers.clear();
  }

  /**
   * Destroy generator
   */
  destroy(): void {
    this.reset();
  }
}
