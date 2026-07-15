/**
 * Story 50.1 — Match Index
 *
 * Index archived matches for fast lookup and filtering.
 * Enable:
 * - Fast search across large match archives
 * - Filter by game state, duration, outcome, players, AI models
 * - Pagination for large result sets
 * - Statistics aggregation (win rates by player, model, map)
 */

import { Logger } from '../config/logger.js';

export interface MatchIndexEntry {
  matchId: string;
  timestamp: string;
  map: string;
  players: Array<{
    id: number;
    name: string;
    civilization: string;
    isAI: boolean;
    aiModel?: string;
    aiPrompt?: string;
    won: boolean;
  }>;
  duration: {
    gameTicksCompleted: number;
    realTimeSeconds: number;
  };
  winner: {
    playerId: number;
    playerName: string;
  };
  stats: {
    totalCommands: number;
    averageLatency: number;
    p95Latency: number;
  };
  tags: string[];
}

export interface MatchIndexFilter {
  map?: string;
  minDuration?: number;
  maxDuration?: number;
  winner?: number;
  aiModel?: string;
  aiPrompt?: string;
  hasTag?: string;
  startDate?: string;
  endDate?: string;
  player?: string; // player name
}

export interface MatchIndexStats {
  totalMatches: number;
  mapCount: Record<string, number>;
  aiModelCount: Record<string, number>;
  averageDuration: number;
  shortestMatch: number;
  longestMatch: number;
  winRateByAiModel: Record<string, number>;
  winRateByMap: Record<string, number>;
}

export class MatchIndex {
  private entries: Map<string, MatchIndexEntry> = new Map();
  private logger: Logger;

  // In-memory indices for fast lookups
  private mapIndex: Map<string, Set<string>> = new Map(); // map -> set of match IDs
  private modelIndex: Map<string, Set<string>> = new Map(); // AI model -> set of match IDs
  private promptIndex: Map<string, Set<string>> = new Map(); // prompt -> set of match IDs
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> set of match IDs

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Add a match to the index
   */
  addMatch(entry: MatchIndexEntry): void {
    this.entries.set(entry.matchId, entry);

    // Update map index
    if (!this.mapIndex.has(entry.map)) {
      this.mapIndex.set(entry.map, new Set());
    }
    this.mapIndex.get(entry.map)!.add(entry.matchId);

    // Update model index
    for (const player of entry.players) {
      if (player.aiModel) {
        if (!this.modelIndex.has(player.aiModel)) {
          this.modelIndex.set(player.aiModel, new Set());
        }
        this.modelIndex.get(player.aiModel)!.add(entry.matchId);
      }

      if (player.aiPrompt) {
        if (!this.promptIndex.has(player.aiPrompt)) {
          this.promptIndex.set(player.aiPrompt, new Set());
        }
        this.promptIndex.get(player.aiPrompt)!.add(entry.matchId);
      }
    }

    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(entry.matchId);
    }

    this.logger.debug('Match indexed', { matchId: entry.matchId, map: entry.map });
  }

  /**
   * Remove a match from index
   */
  removeMatch(matchId: string): boolean {
    const entry = this.entries.get(matchId);
    if (!entry) return false;

    this.entries.delete(matchId);

    // Remove from map index
    this.mapIndex.get(entry.map)?.delete(matchId);

    // Remove from model and prompt indices
    for (const player of entry.players) {
      if (player.aiModel) {
        this.modelIndex.get(player.aiModel)?.delete(matchId);
      }
      if (player.aiPrompt) {
        this.promptIndex.get(player.aiPrompt)?.delete(matchId);
      }
    }

    // Remove from tag index
    for (const tag of entry.tags) {
      this.tagIndex.get(tag)?.delete(matchId);
    }

    this.logger.debug('Match removed from index', { matchId });
    return true;
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): MatchIndexEntry | null {
    return this.entries.get(matchId) || null;
  }

  /**
   * Search matches with filters
   */
  search(filter: MatchIndexFilter, limit: number = 100, offset: number = 0): MatchIndexEntry[] {
    let candidates = Array.from(this.entries.values());

    // Apply filters
    if (filter.map) {
      const mapMatches = this.mapIndex.get(filter.map);
      candidates = candidates.filter(m => mapMatches?.has(m.matchId));
    }

    if (filter.minDuration !== undefined) {
      candidates = candidates.filter(m => m.duration.gameTicksCompleted >= filter.minDuration!);
    }

    if (filter.maxDuration !== undefined) {
      candidates = candidates.filter(m => m.duration.gameTicksCompleted <= filter.maxDuration!);
    }

    if (filter.winner !== undefined) {
      candidates = candidates.filter(m => m.winner.playerId === filter.winner);
    }

    if (filter.aiModel) {
      const modelMatches = this.modelIndex.get(filter.aiModel);
      candidates = candidates.filter(m => modelMatches?.has(m.matchId));
    }

    if (filter.aiPrompt) {
      const promptMatches = this.promptIndex.get(filter.aiPrompt);
      candidates = candidates.filter(m => promptMatches?.has(m.matchId));
    }

    if (filter.hasTag) {
      const tagMatches = this.tagIndex.get(filter.hasTag);
      candidates = candidates.filter(m => tagMatches?.has(m.matchId));
    }

    if (filter.startDate) {
      const startTime = new Date(filter.startDate).getTime();
      candidates = candidates.filter(m => new Date(m.timestamp).getTime() >= startTime);
    }

    if (filter.endDate) {
      const endTime = new Date(filter.endDate).getTime();
      candidates = candidates.filter(m => new Date(m.timestamp).getTime() <= endTime);
    }

    if (filter.player) {
      candidates = candidates.filter(m =>
        m.players.some(p => p.name.toLowerCase().includes(filter.player!.toLowerCase()))
      );
    }

    // Sort by timestamp descending
    candidates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination
    return candidates.slice(offset, offset + limit);
  }

  /**
   * Get all matches for a specific map
   */
  getMatchesByMap(map: string): MatchIndexEntry[] {
    const ids = this.mapIndex.get(map);
    if (!ids) return [];

    const matches = Array.from(ids).map(id => this.entries.get(id)!);
    matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matches;
  }

  /**
   * Get all matches using a specific AI model
   */
  getMatchesByAiModel(model: string): MatchIndexEntry[] {
    const ids = this.modelIndex.get(model);
    if (!ids) return [];

    const matches = Array.from(ids).map(id => this.entries.get(id)!);
    matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matches;
  }

  /**
   * Get all matches using a specific prompt
   */
  getMatchesByPrompt(prompt: string): MatchIndexEntry[] {
    const ids = this.promptIndex.get(prompt);
    if (!ids) return [];

    const matches = Array.from(ids).map(id => this.entries.get(id)!);
    matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matches;
  }

  /**
   * Get all matches with a specific tag
   */
  getMatchesByTag(tag: string): MatchIndexEntry[] {
    const ids = this.tagIndex.get(tag);
    if (!ids) return [];

    const matches = Array.from(ids).map(id => this.entries.get(id)!);
    matches.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return matches;
  }

  /**
   * Add a tag to a match
   */
  addTag(matchId: string, tag: string): boolean {
    const entry = this.entries.get(matchId);
    if (!entry) return false;

    if (!entry.tags.includes(tag)) {
      entry.tags.push(tag);

      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(matchId);
    }

    return true;
  }

  /**
   * Remove a tag from a match
   */
  removeTag(matchId: string, tag: string): boolean {
    const entry = this.entries.get(matchId);
    if (!entry) return false;

    const index = entry.tags.indexOf(tag);
    if (index >= 0) {
      entry.tags.splice(index, 1);
      this.tagIndex.get(tag)?.delete(matchId);
    }

    return true;
  }

  /**
   * Get index statistics
   */
  getStatistics(): MatchIndexStats {
    const entries = Array.from(this.entries.values());
    if (entries.length === 0) {
      return {
        totalMatches: 0,
        mapCount: {},
        aiModelCount: {},
        averageDuration: 0,
        shortestMatch: 0,
        longestMatch: 0,
        winRateByAiModel: {},
        winRateByMap: {},
      };
    }

    const mapCount: Record<string, number> = {};
    const aiModelCount: Record<string, number> = {};
    const winsByAiModel: Record<string, number> = {};
    const totalByAiModel: Record<string, number> = {};
    const winsByMap: Record<string, number> = {};
    const totalByMap: Record<string, number> = {};

    let totalDuration = 0;
    let shortestMatch = Infinity;
    let longestMatch = 0;

    for (const entry of entries) {
      // Map stats
      mapCount[entry.map] = (mapCount[entry.map] || 0) + 1;
      winsByMap[entry.map] = (winsByMap[entry.map] || 0) + 1; // Each match has one winner

      totalByMap[entry.map] = (totalByMap[entry.map] || 0) + 1;

      // Duration stats
      const duration = entry.duration.gameTicksCompleted;
      totalDuration += duration;
      shortestMatch = Math.min(shortestMatch, duration);
      longestMatch = Math.max(longestMatch, duration);

      // AI model stats
      for (const player of entry.players) {
        if (player.aiModel) {
          aiModelCount[player.aiModel] = (aiModelCount[player.aiModel] || 0) + 1;
          totalByAiModel[player.aiModel] = (totalByAiModel[player.aiModel] || 0) + 1;

          if (player.won) {
            winsByAiModel[player.aiModel] = (winsByAiModel[player.aiModel] || 0) + 1;
          }
        }
      }
    }

    const winRateByAiModel: Record<string, number> = {};
    for (const model in totalByAiModel) {
      winRateByAiModel[model] = (winsByAiModel[model] || 0) / totalByAiModel[model];
    }

    const winRateByMap: Record<string, number> = {};
    for (const map in totalByMap) {
      winRateByMap[map] = (winsByMap[map] || 0) / totalByMap[map];
    }

    return {
      totalMatches: entries.length,
      mapCount,
      aiModelCount,
      averageDuration: totalDuration / entries.length,
      shortestMatch: shortestMatch === Infinity ? 0 : shortestMatch,
      longestMatch,
      winRateByAiModel,
      winRateByMap,
    };
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.entries.clear();
    this.mapIndex.clear();
    this.modelIndex.clear();
    this.promptIndex.clear();
    this.tagIndex.clear();
  }

  /**
   * Get total match count
   */
  getMatchCount(): number {
    return this.entries.size;
  }

  /**
   * Export index as JSON
   */
  export(): string {
    const data = {
      timestamp: new Date().toISOString(),
      matchCount: this.entries.size,
      matches: Array.from(this.entries.values()),
    };

    return JSON.stringify(data, null, 2);
  }
}
