/**
 * Chess Integration Harness — End-to-end tournament simulation and validation.
 *
 * Handles:
 * - Complete match orchestration (setup → play → analysis)
 * - Multi-match tournament execution
 * - Broadcast streaming integration
 * - Real-time metrics collection
 * - Match validation and integrity checks
 * - Comprehensive reporting
 */

import { ChessBroadcastManager } from './chess-broadcast-manager.js';
import { ChessResearchPlatform } from './chess-research-platform.js';
import type { BrainPerformance } from './chess-results-aggregator.js';

export interface HarnessConfig {
  readonly maxMovesPerGame: number;
  readonly timeoutPerMoveMs: number;
  readonly enableStreaming: boolean;
  readonly enableBroadcast: boolean;
  readonly enableAnalytics: boolean;
  readonly matchRetries: number;
}

export interface MatchSimulation {
  readonly matchId: string;
  readonly whiteBrain: string;
  readonly blackBrain: string;
  readonly result: 'white-win' | 'black-win' | 'draw' | 'error';
  readonly moveCount: number;
  readonly duration: number;
  readonly whiteRating: number;
  readonly blackRating: number;
  readonly errorMessage?: string;
}

export interface TournamentReport {
  readonly tournamentId: string;
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly failedMatches: number;
  readonly totalDuration: number;
  readonly standings: readonly BrainPerformance[];
  readonly avgMovesPerGame: number;
  readonly whiteWinRate: number;
  readonly blackWinRate: number;
  readonly drawRate: number;
}

export class ChessIntegrationHarness {
  private config: HarnessConfig;
  private broadcastManager: ChessBroadcastManager | null = null;
  private researchPlatform: ChessResearchPlatform | null = null;
  private matchResults: MatchSimulation[] = [];
  private currentTournamentId: string = '';

  constructor(config: Partial<HarnessConfig> = {}) {
    this.config = {
      maxMovesPerGame: config.maxMovesPerGame ?? 200,
      timeoutPerMoveMs: config.timeoutPerMoveMs ?? 30000,
      enableStreaming: config.enableStreaming !== false,
      enableBroadcast: config.enableBroadcast !== false,
      enableAnalytics: config.enableAnalytics !== false,
      matchRetries: config.matchRetries ?? 3,
    };

    if (this.config.enableBroadcast) {
      this.broadcastManager = new ChessBroadcastManager('harness-broadcast', {
        enableStreaming: this.config.enableStreaming,
        enableOverlay: true,
      });
    }

    if (this.config.enableAnalytics) {
      this.researchPlatform = new ChessResearchPlatform();
    }
  }

  /**
   * Initialize a tournament.
   */
  initializeTournament(tournamentId: string, brains: readonly string[]): void {
    this.currentTournamentId = tournamentId;
    this.matchResults = [];

    if (this.broadcastManager) {
      // Note: Would start broadcast for tournament
    }
  }

  /**
   * Simulate a single match (mock implementation).
   */
  async simulateMatch(
    matchId: string,
    whiteBrain: string,
    blackBrain: string
  ): Promise<MatchSimulation> {
    const startTime = Date.now();

    try {
      // Mock match simulation: random result
      const moveCount = Math.floor(Math.random() * (this.config.maxMovesPerGame - 10)) + 10;
      const resultRoll = Math.random();

      let result: 'white-win' | 'black-win' | 'draw';
      if (resultRoll < 0.35) {
        result = 'white-win';
      } else if (resultRoll < 0.7) {
        result = 'black-win';
      } else {
        result = 'draw';
      }

      const duration = Date.now() - startTime;

      // Calculate rating change (mock ELO)
      const baseRatingChange = this.calculateRatingChange(result);

      const simulation: MatchSimulation = {
        matchId,
        whiteBrain,
        blackBrain,
        result,
        moveCount,
        duration,
        whiteRating: 1600 + (result === 'white-win' ? baseRatingChange : -baseRatingChange / 2),
        blackRating: 1600 + (result === 'black-win' ? baseRatingChange : -baseRatingChange / 2),
      };

      this.matchResults.push(simulation);

      // Broadcast match if enabled
      if (this.broadcastManager) {
        this.broadcastMatchResult(simulation);
      }

      return simulation;
    } catch (error) {
      const duration = Date.now() - startTime;
      const simulation: MatchSimulation = {
        matchId,
        whiteBrain,
        blackBrain,
        result: 'error',
        moveCount: 0,
        duration,
        whiteRating: 1600,
        blackRating: 1600,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };

      this.matchResults.push(simulation);
      return simulation;
    }
  }

  /**
   * Run a complete tournament.
   */
  async runTournament(
    tournamentId: string,
    brains: readonly string[],
    format: 'round-robin' | 'swiss' = 'round-robin'
  ): Promise<TournamentReport> {
    this.initializeTournament(tournamentId, brains);

    const matchPairs = this.generateMatchPairs(brains, format);
    const startTime = Date.now();

    for (const [white, black] of matchPairs) {
      const matchId = `${tournamentId}-${white}-vs-${black}`;
      await this.simulateMatch(matchId, white, black);
    }

    const totalDuration = Date.now() - startTime;

    return this.generateTournamentReport(tournamentId, totalDuration);
  }

  /**
   * Get match results.
   */
  getMatchResults(): readonly MatchSimulation[] {
    return Object.freeze([...this.matchResults]);
  }

  /**
   * Get successful matches only.
   */
  getSuccessfulMatches(): readonly MatchSimulation[] {
    return this.matchResults.filter(m => m.result !== 'error');
  }

  /**
   * Get failed matches.
   */
  getFailedMatches(): readonly MatchSimulation[] {
    return this.matchResults.filter(m => m.result === 'error');
  }

  /**
   * Validate match integrity.
   */
  validateMatch(match: MatchSimulation): {
    readonly isValid: boolean;
    readonly issues: readonly string[];
  } {
    const issues: string[] = [];

    if (match.moveCount < 1 && match.result !== 'error') {
      issues.push('Invalid move count');
    }

    if (match.duration < 0) {
      issues.push('Invalid duration');
    }

    if (match.result === 'error' && !match.errorMessage) {
      issues.push('Error result without error message');
    }

    if (match.result !== 'error' && match.errorMessage) {
      issues.push('Successful match with error message');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Validate tournament integrity.
   */
  validateTournament(): {
    readonly isValid: boolean;
    readonly totalMatches: number;
    readonly validMatches: number;
    readonly invalidMatches: number;
    readonly issues: readonly string[];
  } {
    const issues: string[] = [];
    let validCount = 0;

    for (const match of this.matchResults) {
      const validation = this.validateMatch(match);
      if (validation.isValid) {
        validCount++;
      } else {
        issues.push(`Match ${match.matchId}: ${validation.issues.join(', ')}`);
      }
    }

    return {
      isValid: issues.length === 0,
      totalMatches: this.matchResults.length,
      validMatches: validCount,
      invalidMatches: this.matchResults.length - validCount,
      issues,
    };
  }

  /**
   * Export tournament data.
   */
  exportTournamentData() {
    return {
      tournamentId: this.currentTournamentId,
      matches: this.matchResults,
      validation: this.validateTournament(),
      timestamp: Date.now(),
    };
  }

  /**
   * Shutdown harness.
   */
  shutdown(): void {
    if (this.broadcastManager) {
      this.broadcastManager.shutdown();
    }
  }

  /**
   * Private: Generate match pairs for tournament format.
   */
  private generateMatchPairs(
    brains: readonly string[],
    format: 'round-robin' | 'swiss'
  ): Array<[string, string]> {
    const pairs: Array<[string, string]> = [];

    if (format === 'round-robin') {
      // Each brain plays every other brain once
      for (let i = 0; i < brains.length; i++) {
        for (let j = i + 1; j < brains.length; j++) {
          pairs.push([brains[i], brains[j]]);
        }
      }
    } else {
      // Swiss: simplified to round-robin for this harness
      for (let i = 0; i < brains.length; i++) {
        for (let j = i + 1; j < brains.length; j++) {
          pairs.push([brains[i], brains[j]]);
        }
      }
    }

    return pairs;
  }

  /**
   * Private: Calculate rating change (simplified ELO).
   */
  private calculateRatingChange(result: string): number {
    // Simplified K-factor of 32
    if (result === 'draw') {
      return 0;
    }
    return 32;
  }

  /**
   * Private: Broadcast match result.
   */
  private broadcastMatchResult(match: MatchSimulation): void {
    if (!this.broadcastManager) {
      return;
    }

    this.broadcastManager.recordEvent(
      'move',
      `Match complete: ${match.whiteBrain} vs ${match.blackBrain} - ${match.result}`,
      'info'
    );
  }

  /**
   * Private: Generate tournament report.
   */
  private generateTournamentReport(tournamentId: string, totalDuration: number): TournamentReport {
    const successful = this.getSuccessfulMatches();
    const failed = this.getFailedMatches();

    const standings = this.calculateStandings();
    const avgMoves =
      successful.length > 0 ? successful.reduce((sum, m) => sum + m.moveCount, 0) / successful.length : 0;

    let whiteWins = 0;
    let blackWins = 0;
    let draws = 0;

    for (const match of successful) {
      if (match.result === 'white-win') {
        whiteWins++;
      } else if (match.result === 'black-win') {
        blackWins++;
      } else {
        draws++;
      }
    }

    const totalSuccessful = whiteWins + blackWins + draws;

    return {
      tournamentId,
      totalMatches: this.matchResults.length,
      completedMatches: successful.length,
      failedMatches: failed.length,
      totalDuration,
      standings,
      avgMovesPerGame: Math.round(avgMoves),
      whiteWinRate: totalSuccessful > 0 ? whiteWins / totalSuccessful : 0,
      blackWinRate: totalSuccessful > 0 ? blackWins / totalSuccessful : 0,
      drawRate: totalSuccessful > 0 ? draws / totalSuccessful : 0,
    };
  }

  /**
   * Private: Calculate standings from match results.
   */
  private calculateStandings(): readonly BrainPerformance[] {
    const standings: Map<string, BrainPerformance> = new Map();

    for (const match of this.matchResults) {
      const initializeIfNeeded = (name: string) => {
        if (!standings.has(name)) {
          standings.set(name, {
            brainName: name,
            rating: 1600,
            games: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winRate: 0,
            drawRate: 0,
            avgMoveTime: 0,
            avgMoveCount: 0,
            successRate: 1,
            lastUpdated: Date.now(),
          });
        }
      };

      initializeIfNeeded(match.whiteBrain);
      initializeIfNeeded(match.blackBrain);

      const white = standings.get(match.whiteBrain)!;
      const black = standings.get(match.blackBrain)!;

      white.games++;
      black.games++;
      white.rating = match.whiteRating;
      black.rating = match.blackRating;

      if (match.result === 'white-win') {
        white.wins++;
        black.losses++;
      } else if (match.result === 'black-win') {
        black.wins++;
        white.losses++;
      } else if (match.result === 'draw') {
        white.draws++;
        black.draws++;
      }

      white.winRate = white.games > 0 ? white.wins / white.games : 0;
      white.drawRate = white.games > 0 ? white.draws / white.games : 0;
      white.avgMoveCount =
        white.games > 0 ? (white.avgMoveCount * (white.games - 1) + match.moveCount) / white.games : match.moveCount;

      black.winRate = black.games > 0 ? black.wins / black.games : 0;
      black.drawRate = black.games > 0 ? black.draws / black.games : 0;
      black.avgMoveCount =
        black.games > 0 ? (black.avgMoveCount * (black.games - 1) + match.moveCount) / black.games : match.moveCount;
    }

    return Array.from(standings.values()).sort((a, b) => b.rating - a.rating);
  }
}
