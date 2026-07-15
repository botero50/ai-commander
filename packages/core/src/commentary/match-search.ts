/**
 * Story 50.2 — Search Matches
 *
 * Provide high-level search API over match index.
 * Enable complex queries with:
 * - Multi-criteria filtering
 * - Sorting options
 * - Aggregation by player, model, prompt, map
 * - Performance analysis (win rates, latency trends)
 */

import { Logger } from '../config/logger.js';
import { MatchIndex, type MatchIndexEntry, type MatchIndexFilter } from './match-index.js';

export interface SearchQuery {
  filter: MatchIndexFilter;
  sortBy?: 'timestamp' | 'duration' | 'latency' | 'commands';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  matches: MatchIndexEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PlayerStats {
  name: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageLatency: number;
  favoriteMap?: string;
  favoriteModel?: string;
}

export interface ModelStats {
  name: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageLatency: number;
  averageCost: number;
  preferredMap?: string;
}

export interface PromptStats {
  version: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  averageLatency: number;
  averageCommands: number;
}

export interface MapStats {
  name: string;
  totalMatches: number;
  averageDuration: number;
  averageLatency: number;
  uniqueModels: number;
}

export class MatchSearchEngine {
  private index: MatchIndex;
  private logger: Logger;

  constructor(index: MatchIndex, logger: Logger) {
    this.index = index;
    this.logger = logger;
  }

  /**
   * Execute a search query
   */
  search(query: SearchQuery): SearchResult {
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    // Get initial results
    let results = this.index.search(query.filter, limit * 10, 0); // Get extra for sorting

    // Apply sorting
    results = this.applySort(results, query.sortBy || 'timestamp', query.sortOrder || 'desc');

    // Get total count before pagination
    const total = results.length;

    // Apply pagination
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      matches: paginatedResults,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Apply sorting to results
   */
  private applySort(
    matches: MatchIndexEntry[],
    sortBy: string,
    sortOrder: 'asc' | 'desc'
  ): MatchIndexEntry[] {
    const sorted = [...matches];

    switch (sortBy) {
      case 'timestamp':
        sorted.sort((a, b) => {
          const diff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
          return sortOrder === 'asc' ? -diff : diff;
        });
        break;

      case 'duration':
        sorted.sort((a, b) => {
          const diff = b.duration.gameTicksCompleted - a.duration.gameTicksCompleted;
          return sortOrder === 'asc' ? -diff : diff;
        });
        break;

      case 'latency':
        sorted.sort((a, b) => {
          const diff = b.stats.averageLatency - a.stats.averageLatency;
          return sortOrder === 'asc' ? -diff : diff;
        });
        break;

      case 'commands':
        sorted.sort((a, b) => {
          const diff = b.stats.totalCommands - a.stats.totalCommands;
          return sortOrder === 'asc' ? -diff : diff;
        });
        break;

      default:
        break;
    }

    return sorted;
  }

  /**
   * Get statistics for a specific player
   */
  getPlayerStats(playerName: string): PlayerStats | null {
    const matches = this.index.search({ player: playerName });

    if (matches.length === 0) return null;

    let wins = 0;
    let totalLatency = 0;
    const mapFrequency: Record<string, number> = {};
    const modelFrequency: Record<string, number> = {};

    for (const match of matches) {
      const player = match.players.find(p => p.name.toLowerCase().includes(playerName.toLowerCase()));

      if (player) {
        if (player.won) wins++;
        totalLatency += match.stats.averageLatency;

        mapFrequency[match.map] = (mapFrequency[match.map] || 0) + 1;

        if (player.aiModel) {
          modelFrequency[player.aiModel] = (modelFrequency[player.aiModel] || 0) + 1;
        }
      }
    }

    // Get most frequent map and model
    let favoriteMap: string | undefined;
    let maxMapCount = 0;
    for (const [map, count] of Object.entries(mapFrequency)) {
      if (count > maxMapCount) {
        maxMapCount = count;
        favoriteMap = map;
      }
    }

    let favoriteModel: string | undefined;
    let maxModelCount = 0;
    for (const [model, count] of Object.entries(modelFrequency)) {
      if (count > maxModelCount) {
        maxModelCount = count;
        favoriteModel = model;
      }
    }

    return {
      name: playerName,
      totalMatches: matches.length,
      wins,
      losses: matches.length - wins,
      winRate: wins / matches.length,
      averageLatency: totalLatency / matches.length,
      favoriteMap,
      favoriteModel,
    };
  }

  /**
   * Get statistics for a specific AI model
   */
  getModelStats(modelName: string): ModelStats | null {
    const matches = this.index.getMatchesByAiModel(modelName);

    if (matches.length === 0) return null;

    let wins = 0;
    let totalLatency = 0;
    let totalCost = 0;
    const mapFrequency: Record<string, number> = {};

    for (const match of matches) {
      const player = match.players.find(p => p.aiModel === modelName);

      if (player) {
        if (player.won) wins++;
      }

      totalLatency += match.stats.averageLatency;
      totalCost += 0; // Cost not tracked in match entry, would need additional data

      mapFrequency[match.map] = (mapFrequency[match.map] || 0) + 1;
    }

    // Get most frequent map
    let preferredMap: string | undefined;
    let maxMapCount = 0;
    for (const [map, count] of Object.entries(mapFrequency)) {
      if (count > maxMapCount) {
        maxMapCount = count;
        preferredMap = map;
      }
    }

    return {
      name: modelName,
      totalMatches: matches.length,
      wins,
      losses: matches.length - wins,
      winRate: wins / matches.length,
      averageLatency: totalLatency / matches.length,
      averageCost: totalCost / matches.length,
      preferredMap,
    };
  }

  /**
   * Get statistics for a specific prompt
   */
  getPromptStats(promptVersion: string): PromptStats | null {
    const matches = this.index.getMatchesByPrompt(promptVersion);

    if (matches.length === 0) return null;

    let wins = 0;
    let totalLatency = 0;
    let totalCommands = 0;

    for (const match of matches) {
      const player = match.players.find(p => p.aiPrompt === promptVersion);

      if (player) {
        if (player.won) wins++;
      }

      totalLatency += match.stats.averageLatency;
      totalCommands += match.stats.totalCommands;
    }

    return {
      version: promptVersion,
      totalMatches: matches.length,
      wins,
      losses: matches.length - wins,
      winRate: wins / matches.length,
      averageLatency: totalLatency / matches.length,
      averageCommands: totalCommands / matches.length,
    };
  }

  /**
   * Get statistics for a specific map
   */
  getMapStats(mapName: string): MapStats | null {
    const matches = this.index.getMatchesByMap(mapName);

    if (matches.length === 0) return null;

    let totalDuration = 0;
    let totalLatency = 0;
    const uniqueModels = new Set<string>();

    for (const match of matches) {
      totalDuration += match.duration.gameTicksCompleted;
      totalLatency += match.stats.averageLatency;

      for (const player of match.players) {
        if (player.aiModel) {
          uniqueModels.add(player.aiModel);
        }
      }
    }

    return {
      name: mapName,
      totalMatches: matches.length,
      averageDuration: totalDuration / matches.length,
      averageLatency: totalLatency / matches.length,
      uniqueModels: uniqueModels.size,
    };
  }

  /**
   * Compare two players
   */
  comparePlayersHeadToHead(
    player1: string,
    player2: string
  ): { player1Wins: number; player2Wins: number; draws: number } {
    const results = this.index.search({});

    let player1Wins = 0;
    let player2Wins = 0;
    let draws = 0;

    for (const match of results) {
      const p1 = match.players.find(p => p.name.toLowerCase().includes(player1.toLowerCase()));
      const p2 = match.players.find(p => p.name.toLowerCase().includes(player2.toLowerCase()));

      if (p1 && p2) {
        if (p1.won && !p2.won) player1Wins++;
        else if (p2.won && !p1.won) player2Wins++;
        else if (p1.won && p2.won) draws++;
      }
    }

    return { player1Wins, player2Wins, draws };
  }

  /**
   * Compare two AI models
   */
  compareModelsHeadToHead(
    model1: string,
    model2: string
  ): { model1Wins: number; model2Wins: number; draws: number } {
    const results = this.index.search({});

    let model1Wins = 0;
    let model2Wins = 0;
    let draws = 0;

    for (const match of results) {
      const p1 = match.players.find(p => p.aiModel === model1);
      const p2 = match.players.find(p => p.aiModel === model2);

      if (p1 && p2) {
        if (p1.won && !p2.won) model1Wins++;
        else if (p2.won && !p1.won) model2Wins++;
        else if (p1.won && p2.won) draws++;
      }
    }

    return { model1Wins, model2Wins, draws };
  }

  /**
   * Get trending prompts (most improved)
   */
  getTrendingPrompts(limit: number = 10): Array<{
    prompt: string;
    winRate: number;
    matchCount: number;
    trend: number; // improvement trend -1 to 1
  }> {
    const results = this.index.search({});
    const promptStats: Record<string, { wins: number; total: number }> = {};

    for (const match of results) {
      for (const player of match.players) {
        if (player.aiPrompt) {
          if (!promptStats[player.aiPrompt]) {
            promptStats[player.aiPrompt] = { wins: 0, total: 0 };
          }

          promptStats[player.aiPrompt].total++;
          if (player.won) {
            promptStats[player.aiPrompt].wins++;
          }
        }
      }
    }

    const trending = Object.entries(promptStats)
      .map(([prompt, stats]) => ({
        prompt,
        winRate: stats.wins / stats.total,
        matchCount: stats.total,
        trend: (stats.wins / stats.total - 0.5) * 2, // Normalize to -1 to 1
      }))
      .sort((a, b) => b.trend - a.trend)
      .slice(0, limit);

    return trending;
  }

  /**
   * Get trending AI models
   */
  getTrendingModels(limit: number = 10): Array<{
    model: string;
    winRate: number;
    matchCount: number;
  }> {
    const results = this.index.search({});
    const modelStats: Record<string, { wins: number; total: number }> = {};

    for (const match of results) {
      for (const player of match.players) {
        if (player.aiModel) {
          if (!modelStats[player.aiModel]) {
            modelStats[player.aiModel] = { wins: 0, total: 0 };
          }

          modelStats[player.aiModel].total++;
          if (player.won) {
            modelStats[player.aiModel].wins++;
          }
        }
      }
    }

    const trending = Object.entries(modelStats)
      .map(([model, stats]) => ({
        model,
        winRate: stats.wins / stats.total,
        matchCount: stats.total,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit);

    return trending;
  }
}
