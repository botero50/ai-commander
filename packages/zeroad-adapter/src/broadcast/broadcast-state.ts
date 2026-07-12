/**
 * EPIC 61.2 — Unified Broadcast State
 *
 * Creates a single, real-time data contract for broadcast overlay.
 * Reads from multiple sources and exposes unified interface:
 * - Arena: match metadata, player info, map, civilization
 * - Match persistence: match history, results
 * - Brain: AI objectives, confidence levels
 * - Commentary: trash talk, decision timeline
 * - SessionEventBus: real-time game state
 *
 * Data Flow:
 *   Arena + Match Persistence + Brain + Commentary + SessionEventBus
 *     ↓
 *   BroadcastState (unified contract)
 *     ↓
 *   Broadcast Overlay (single source of truth)
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';
import type { SessionEventBus } from '../session/session-events.js';

// === BROADCAST STATE TYPES ===

export interface BroadcastPlayer {
  id: number;
  name: string;
  civilization: string;
  faction?: string;

  // Real-time stats from game state
  resources: {
    wood: number;
    stone: number;
    food: number;
    metal: number;
  };
  units: number;
  buildings: number;
  population: number;
  militaryValue: number;

  // AI metadata from Brain
  objective?: string;
  confidence?: number;
  provider?: string;
  model?: string;
  latency?: number;

  // Trash talk from Commentary
  currentTrashTalk?: {
    message: string;
    tick: number;
  };
}

export interface BroadcastMatch {
  matchId: string;
  map: {
    name: string;
    displayName: string;
    players: number;
  };
  players: BroadcastPlayer[];

  // Match lifecycle state
  state: 'intro' | 'running' | 'conclusion' | 'ended';
  startTick: number;
  currentTick: number;
  estimatedDuration?: number; // seconds

  // Match result (post-game)
  result?: {
    winner: {
      id: number;
      name: string;
      civilization: string;
    };
    losers: Array<{
      id: number;
      name: string;
      civilization: string;
    }>;
    duration: number; // seconds
    reason: string;
  };

  // Match history reference
  history?: {
    matchNumber: number;
    previousResults?: Array<{
      winner: string;
      loser: string;
      duration: number;
      date: string;
    }>;
  };
}

export interface BroadcastStreamState {
  match: BroadcastMatch;
  timestamp: string;

  // Recent events for commentary
  recentEvents?: Array<{
    type: string;
    playerId?: number;
    tick: number;
    description: string;
  }>;
}

// === BROADCAST STATE SERVICE ===

export class BroadcastState extends EventEmitter {
  private logger: Logger;
  private eventBus: SessionEventBus | null = null;

  // Data sources (injected)
  private arena: any = null;
  private matchPersistence: any = null;
  private brain: any = null;
  private commentary: any = null;

  // Current state cache
  private currentState: BroadcastStreamState | null = null;
  private playerStats: Map<number, BroadcastPlayer> = new Map();
  private lastEventTick = 0;
  private recentEventBuffer: Array<{
    type: string;
    playerId?: number;
    tick: number;
    description: string;
  }> = [];

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'BroadcastState');
  }

  /**
   * Initialize broadcast state with all required data sources
   */
  async initialize(config: {
    arena: any;
    matchPersistence: any;
    brain: any;
    commentary: any;
    eventBus: SessionEventBus;
  }): Promise<void> {
    this.arena = config.arena;
    this.matchPersistence = config.matchPersistence;
    this.brain = config.brain;
    this.commentary = config.commentary;
    this.eventBus = config.eventBus;

    this.logger.info('Broadcast state initialized with data sources', {
      hasArena: !!this.arena,
      hasMatchPersistence: !!this.matchPersistence,
      hasBrain: !!this.brain,
      hasCommentary: !!this.commentary,
      hasEventBus: !!this.eventBus,
    });

    this.connectEventBus();
  }

  /**
   * Connect to event bus for real-time updates
   */
  private connectEventBus(): void {
    if (!this.eventBus) return;

    // Listen to observations for real-time player stats
    this.eventBus.on('observation:received', (event: any) => {
      this.handleObservation(event);
    });

    // Listen to decisions for AI metadata
    this.eventBus.on('decision:completed', (event: any) => {
      this.handleDecision(event);
    });

    // Listen to match events
    this.eventBus.on('match:started', (event: any) => {
      this.handleMatchStart(event);
    });

    this.eventBus.on('match:ended', (event: any) => {
      this.handleMatchEnd(event);
    });
  }

  /**
   * Build complete broadcast state from all sources
   * Called periodically or after significant events
   */
  async buildState(matchId: string): Promise<BroadcastStreamState> {
    try {
      // 1. Get match metadata from Arena
      const matchInfo = await this.getMatchInfo(matchId);
      if (!matchInfo) {
        throw new Error(`Match ${matchId} not found in arena`);
      }

      // 2. Get player info
      const players = await this.buildPlayers(matchInfo);

      // 3. Create match object
      const match: BroadcastMatch = {
        matchId,
        map: {
          name: matchInfo.map.name,
          displayName: matchInfo.map.displayName,
          players: matchInfo.map.players,
        },
        players,
        state: this.getCurrentMatchState(matchInfo),
        startTick: matchInfo.startTick || 0,
        currentTick: matchInfo.currentTick || 0,
        estimatedDuration: matchInfo.estimatedDuration,
        history: await this.getMatchHistory(matchId),
      };

      // 4. Add result if match ended
      const matchResult = await this.getMatchResult(matchId);
      if (matchResult) {
        match.result = matchResult;
      }

      // 5. Create state object
      const state: BroadcastStreamState = {
        match,
        timestamp: new Date().toISOString(),
        recentEvents: this.getRecentEvents(),
      };

      this.currentState = state;
      this.emit('state:updated', state);

      return state;
    } catch (error) {
      this.logger.error('Failed to build broadcast state', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get match info from Arena
   */
  private async getMatchInfo(
    matchId: string
  ): Promise<any> {
    if (!this.arena) {
      return {
        matchId,
        map: { name: 'unknown', displayName: 'Unknown Map', players: 2 },
        players: [],
        startTick: 0,
        currentTick: 0,
      };
    }

    try {
      const match = await this.arena.getMatch(matchId);
      return match || {
        matchId,
        map: { name: 'unknown', displayName: 'Unknown Map', players: 2 },
        players: [],
        startTick: 0,
        currentTick: 0,
      };
    } catch (error) {
      this.logger.warn('Failed to get match info from arena', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        matchId,
        map: { name: 'unknown', displayName: 'Unknown Map', players: 2 },
        players: [],
        startTick: 0,
        currentTick: 0,
      };
    }
  }

  /**
   * Build complete player objects with all metadata
   */
  private async buildPlayers(matchInfo: any): Promise<BroadcastPlayer[]> {
    const players: BroadcastPlayer[] = [];

    for (const playerInfo of matchInfo.players || []) {
      const player: BroadcastPlayer = {
        id: playerInfo.id || 1,
        name: playerInfo.name || `Player ${playerInfo.id}`,
        civilization: playerInfo.civilization || 'Unknown',
        faction: this.getFactionForCivilization(playerInfo.civilization),

        // Default stats (will be updated by observations)
        resources: {
          wood: 300,
          stone: 200,
          food: 250,
          metal: 0,
        },
        units: 0,
        buildings: 0,
        population: 0,
        militaryValue: 0,

        // Will be populated by Brain and Commentary
      };

      // Add cached player stats if available
      if (this.playerStats.has(playerInfo.id)) {
        const cached = this.playerStats.get(playerInfo.id)!;
        Object.assign(player, cached);
      }

      // Get AI metadata from Brain
      const brainstats = await this.getAIMetadata(playerInfo.id, matchInfo.matchId);
      if (brainstats) {
        player.objective = brainstats.objective;
        player.confidence = brainstats.confidence;
        player.provider = brainstats.provider;
        player.model = brainstats.model;
        player.latency = brainstats.latency;
      }

      // Get latest trash talk from Commentary
      const trashTalk = await this.getLatestTrashTalk(playerInfo.id, matchInfo.matchId);
      if (trashTalk) {
        player.currentTrashTalk = trashTalk;
      }

      players.push(player);
    }

    return players;
  }

  /**
   * Get AI metadata from Brain (objective, confidence, provider, model, latency)
   */
  private async getAIMetadata(
    playerId: number,
    matchId: string
  ): Promise<any> {
    if (!this.brain) return null;

    try {
      const metadata = await this.brain.getPlayerMetadata(playerId, matchId);
      return metadata;
    } catch (error) {
      this.logger.debug('Failed to get AI metadata from brain', {
        playerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get latest trash talk from Commentary
   */
  private async getLatestTrashTalk(
    playerId: number,
    matchId: string
  ): Promise<{ message: string; tick: number } | null> {
    if (!this.commentary) return null;

    try {
      const trashTalk = await this.commentary.getLatestTrashTalk(
        playerId,
        matchId
      );
      return trashTalk;
    } catch (error) {
      this.logger.debug('Failed to get trash talk from commentary', {
        playerId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get match result from Match Persistence
   */
  private async getMatchResult(matchId: string): Promise<any> {
    if (!this.matchPersistence) return null;

    try {
      const result = await this.matchPersistence.getMatchResult(matchId);
      return result;
    } catch (error) {
      this.logger.debug('Failed to get match result from persistence', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get match history for context (previous results between same players)
   */
  private async getMatchHistory(matchId: string): Promise<any> {
    if (!this.matchPersistence) return null;

    try {
      const history = await this.matchPersistence.getMatchHistory(matchId);
      return history;
    } catch (error) {
      this.logger.debug('Failed to get match history from persistence', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Handle real-time observation (game state update)
   */
  private handleObservation(event: any): void {
    const playerId = event.playerId || 1;
    const obs = event.observation || {};

    // Update player stats cache
    const existing = this.playerStats.get(playerId) || {
      id: playerId,
      name: event.playerName || `Player ${playerId}`,
      civilization: 'Unknown',
    };

    const updated: BroadcastPlayer = {
      ...existing,
      resources: {
        wood: obs.resources?.wood || 300,
        stone: obs.resources?.stone || 200,
        food: obs.resources?.food || 250,
        metal: obs.resources?.metal || 0,
      },
      units: obs.units || 0,
      buildings: obs.buildings || 0,
      population: obs.population || 0,
      militaryValue: this.calculateMilitaryValue(obs),
    };

    this.playerStats.set(playerId, updated);
    this.lastEventTick = event.tick || 0;

    // Record event
    this.addRecentEvent({
      type: 'observation',
      playerId,
      tick: event.tick || 0,
      description: `Resources: W:${updated.resources.wood} S:${updated.resources.stone} F:${updated.resources.food}`,
    });
  }

  /**
   * Handle decision event (AI action)
   */
  private handleDecision(event: any): void {
    const playerId = event.playerId || 1;
    const decision = event.decision || {};

    // Update player AI metadata
    const existing = this.playerStats.get(playerId);
    if (existing) {
      existing.objective = decision.objective;
      existing.confidence = decision.confidence;
      existing.latency = event.latency;
    }

    // Record event
    this.addRecentEvent({
      type: 'decision',
      playerId,
      tick: event.tick || 0,
      description: decision.objective || 'Decision made',
    });
  }

  /**
   * Handle match start
   */
  private handleMatchStart(event: any): void {
    this.addRecentEvent({
      type: 'match:start',
      tick: 0,
      description: 'Match started',
    });
  }

  /**
   * Handle match end
   */
  private handleMatchEnd(event: any): void {
    this.addRecentEvent({
      type: 'match:end',
      tick: this.lastEventTick,
      description: `Match ended: ${event.winner?.name || 'Unknown'} wins`,
    });
  }

  /**
   * Add event to recent buffer
   */
  private addRecentEvent(event: any): void {
    this.recentEventBuffer.push(event);
    // Keep only last 20 events
    if (this.recentEventBuffer.length > 20) {
      this.recentEventBuffer.shift();
    }
  }

  /**
   * Get recent events
   */
  private getRecentEvents(): Array<any> {
    return [...this.recentEventBuffer];
  }

  /**
   * Get current match state
   */
  private getCurrentMatchState(
    matchInfo: any
  ): 'intro' | 'running' | 'conclusion' | 'ended' {
    const tick = matchInfo.currentTick || 0;
    const endTick = matchInfo.endTick || 999999;

    if (tick < 1) return 'intro';
    if (tick >= endTick) return 'ended';
    if (tick > endTick - 300) return 'conclusion'; // Last 5 minutes
    return 'running';
  }

  /**
   * Calculate military value from observation
   */
  private calculateMilitaryValue(obs: any): number {
    const militaryUnits = obs.militaryUnits || Math.floor((obs.units || 0) * 0.3);
    return militaryUnits * 10;
  }

  /**
   * Get faction for civilization
   */
  private getFactionForCivilization(civName: string): string {
    const factions: Record<string, string> = {
      athenians: 'greek',
      britons: 'celtic',
      carthaginians: 'punic',
      gauls: 'celtic',
      germans: 'germanic',
      han: 'chinese',
      iberians: 'iberian',
      kushites: 'african',
      macedonians: 'greek',
      mauryas: 'indian',
      persians: 'persian',
      ptolemies: 'greek',
      romans: 'italic',
      seleucids: 'hellenistic',
      spartans: 'greek',
    };
    return factions[civName?.toLowerCase()] || 'unknown';
  }

  /**
   * Get current state
   */
  getState(): BroadcastStreamState | null {
    return this.currentState;
  }

  /**
   * Subscribe to state updates
   */
  onStateUpdated(callback: (state: BroadcastStreamState) => void): void {
    this.on('state:updated', callback);
  }

  /**
   * Disconnect from all sources
   */
  disconnect(): void {
    if (this.eventBus) {
      this.eventBus.removeAllListeners('observation:received');
      this.eventBus.removeAllListeners('decision:completed');
      this.eventBus.removeAllListeners('match:started');
      this.eventBus.removeAllListeners('match:ended');
      this.eventBus = null;
    }
    this.logger.info('Broadcast state disconnected');
  }
}

/**
 * Factory function
 */
export function createBroadcastState(logger?: Logger): BroadcastState {
  return new BroadcastState(logger);
}
