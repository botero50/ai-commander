/**
 * Match Data Service
 * Exposes live match data from GameSession to UI via HTTP/WebSocket
 */

import type { ZeroADGameSession } from '../session/game-session.js';

export interface MatchMetadataResponse {
  matchId: string;
  player1: {
    id: string;
    name: string;
    brainModel: string;
    provider: string;
  };
  player2: {
    id: string;
    name: string;
    brainModel: string;
    provider: string;
  };
  startTime: number;
  currentTick: number;
  isLive: boolean;
  isPaused: boolean;
}

export interface GameStateResponse {
  tick: number;
  timestamp: number;
  player1: {
    resources: { food: number; wood: number; metal: number; stone: number };
    population: { current: number; max: number };
    units: number;
    buildings: number;
    technologies: number[];
  };
  player2: {
    resources: { food: number; wood: number; metal: number; stone: number };
    population: { current: number; max: number };
    units: number;
    buildings: number;
    technologies: number[];
  };
}

export interface CommentaryEventResponse {
  tick: number;
  text: string;
  severity: 'critical' | 'major' | 'minor';
  type: string;
  timestamp: number;
}

export interface DecisionEventResponse {
  tick: number;
  player: string;
  model: string;
  action: string;
  reasoning: string;
  duration: number;
  timestamp: number;
}

export interface HighlightResponse {
  tick: number;
  title: string;
  type: string;
  importance: number;
}

export interface ReplayDataResponse {
  matchId: string;
  duration: number;
  highlights: HighlightResponse[];
  available: boolean;
}

/**
 * Service that exposes GameSession data to UI
 * Adapts internal services (HUD, commentary, replays, etc) to standard HTTP responses
 */
export class MatchDataService {
  constructor(private session: ZeroADGameSession | null = null) {}

  /**
   * Update the current session (called when a match starts)
   */
  setSession(session: ZeroADGameSession): void {
    this.session = session;
  }

  /**
   * Get match metadata
   */
  getMatchMetadata(): MatchMetadataResponse | null {
    if (!this.session) {
      return null;
    }

    // Get data from session's services
    const hudState = this.session.getGameStateHUD?.();
    const aiStatus1 = this.session.getAIStatus?.('player1');
    const aiStatus2 = this.session.getAIStatus?.('player2');

    if (!hudState) return null;

    return {
      matchId: this.session.sessionId,
      player1: {
        id: 'player1',
        name: aiStatus1?.playerName || 'Player 1',
        brainModel: aiStatus1?.model || 'Unknown',
        provider: aiStatus1?.provider || 'Unknown',
      },
      player2: {
        id: 'player2',
        name: aiStatus2?.playerName || 'Player 2',
        brainModel: aiStatus2?.model || 'Unknown',
        provider: aiStatus2?.provider || 'Unknown',
      },
      startTime: hudState.matchStartTime || Date.now(),
      currentTick: hudState.currentTick || 0,
      isLive: true,
      isPaused: false,
    };
  }

  /**
   * Get current game state (resources, population, tech)
   */
  getGameState(): GameStateResponse | null {
    if (!this.session) {
      return null;
    }

    const hudState = this.session.getGameStateHUD?.();
    if (!hudState) return null;

    return {
      tick: hudState.currentTick || 0,
      timestamp: Date.now(),
      player1: {
        resources: hudState.player1?.resources || { food: 0, wood: 0, metal: 0, stone: 0 },
        population: hudState.player1?.population || { current: 0, max: 0 },
        units: hudState.player1?.unitCount || 0,
        buildings: hudState.player1?.buildingCount || 0,
        technologies: hudState.player1?.technologies || [],
      },
      player2: {
        resources: hudState.player2?.resources || { food: 0, wood: 0, metal: 0, stone: 0 },
        population: hudState.player2?.population || { current: 0, max: 0 },
        units: hudState.player2?.unitCount || 0,
        buildings: hudState.player2?.buildingCount || 0,
        technologies: hudState.player2?.technologies || [],
      },
    };
  }

  /**
   * Get recent commentary events
   */
  getCommentaryEvents(limit: number = 50): CommentaryEventResponse[] {
    if (!this.session) {
      return [];
    }

    const commentaryService = this.session.getLiveCommentary?.();
    if (!commentaryService) {
      return [];
    }

    // Get recent entries from commentary service
    const entries = commentaryService.getRecentEntries?.(limit) || [];

    return entries.map((entry) => ({
      tick: entry.tick || 0,
      text: entry.text || '',
      severity: entry.severity || 'minor',
      type: entry.type || 'commentary',
      timestamp: entry.timestamp || Date.now(),
    }));
  }

  /**
   * Get recent decision events
   */
  getDecisionEvents(limit: number = 50): DecisionEventResponse[] {
    if (!this.session) {
      return [];
    }

    const decisionTimeline = this.session.getDecisionTimeline?.();
    if (!decisionTimeline) {
      return [];
    }

    // Get recent decisions from timeline service
    const entries = decisionTimeline.getRecentDecisions?.(limit) || [];

    return entries.map((entry) => ({
      tick: entry.tick || 0,
      player: entry.player || '',
      model: entry.model || '',
      action: entry.action || '',
      reasoning: entry.reasoning || '',
      duration: entry.durationMs || 0,
      timestamp: entry.timestamp || Date.now(),
    }));
  }

  /**
   * Get replay data and highlights
   */
  getReplayData(): ReplayDataResponse | null {
    if (!this.session) {
      return null;
    }

    const highlightGenerator = this.session.getHighlightGenerator?.();
    const replayDirector = this.session.getReplayDirector?.();

    const metadata = this.getMatchMetadata();
    if (!metadata) return null;

    // Get highlights from highlight generator
    const highlights = highlightGenerator?.getHighlights?.() || [];

    return {
      matchId: this.session.sessionId,
      duration: metadata.currentTick,
      highlights: highlights.map((h) => ({
        tick: h.tick || 0,
        title: h.title || '',
        type: h.type || 'moment',
        importance: h.importance || 0,
      })),
      available: true,
    };
  }

  /**
   * Get AI status for a player
   */
  getAIStatus(player: 'player1' | 'player2') {
    if (!this.session) {
      return null;
    }

    return this.session.getAIStatus?.(player) || null;
  }

  /**
   * Get minimap data
   */
  getMinimapData() {
    if (!this.session) {
      return null;
    }

    return this.session.getMinimapState?.() || null;
  }

  /**
   * Get objective tracker data
   */
  getObjectiveTracker() {
    if (!this.session) {
      return null;
    }

    return this.session.getObjectiveTracker?.() || null;
  }

  /**
   * Get event annotations
   */
  getEventAnnotations(limit: number = 50) {
    if (!this.session) {
      return [];
    }

    return this.session.getEventAnnotations?.(limit) || [];
  }
}

/**
 * Create a singleton instance
 */
export const matchDataService = new MatchDataService();
