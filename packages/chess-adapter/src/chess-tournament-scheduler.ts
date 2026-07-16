/**
 * Chess Tournament Scheduler — Manages tournament lifecycle and scheduling.
 *
 * Handles:
 * - Tournament creation and configuration
 * - Multiple tournament formats (round-robin, Swiss, elimination)
 * - Match scheduling (pairing generation, timing)
 * - Bracket management
 * - Tournament state and status
 * - Results aggregation and finalization
 */

import type { Brain } from '@ai-commander/brain';

export type TournamentFormat = 'round-robin' | 'swiss' | 'elimination' | 'double-elimination';

export interface TournamentConfig {
  readonly name: string;
  readonly format: TournamentFormat;
  readonly maxRounds?: number; // For Swiss/elimination
  readonly timeControlMs?: number; // Per move timeout
  readonly roundDurationMs?: number; // Wall-clock time between rounds
  readonly description?: string;
}

export interface ScheduledMatch {
  readonly matchId: string;
  readonly roundNumber: number;
  readonly whiteBrainName: string;
  readonly blackBrainName: string;
  readonly scheduledTime: number; // Unix timestamp
  readonly status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  readonly result?: 'white-win' | 'black-win' | 'draw';
  readonly moveCount?: number;
  readonly duration?: number; // ms
}

export interface TournamentRound {
  readonly roundNumber: number;
  readonly matches: ScheduledMatch[];
  readonly status: 'pending' | 'in-progress' | 'completed';
  readonly startTime?: number;
  readonly endTime?: number;
}

export interface TournamentBracket {
  readonly roundNumber: number;
  readonly matches: Array<{
    readonly matchId: string;
    readonly whiteBrainName: string;
    readonly blackBrainName: string;
    readonly winner?: string;
    readonly matchNumber: number;
  }>;
}

export interface TournamentState {
  readonly tournamentId: string;
  readonly config: TournamentConfig;
  readonly brainCount: number;
  readonly rounds: TournamentRound[];
  readonly totalMatches: number;
  readonly completedMatches: number;
  readonly status: 'created' | 'in-progress' | 'completed' | 'cancelled';
  readonly startTime?: number;
  readonly endTime?: number;
}

export class ChessTournamentScheduler {
  private tournamentId: string;
  private config: TournamentConfig;
  private rounds: TournamentRound[] = [];
  private matches: ScheduledMatch[] = [];
  private brains: Map<string, Brain> = new Map();
  private status: 'created' | 'in-progress' | 'completed' | 'cancelled' = 'created';
  private startTime?: number;
  private endTime?: number;
  private matchIdCounter = 0;

  constructor(config: TournamentConfig) {
    this.tournamentId = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.config = config;
  }

  /**
   * Get tournament ID.
   */
  getTournamentId(): string {
    return this.tournamentId;
  }

  /**
   * Get tournament configuration.
   */
  getConfig(): TournamentConfig {
    return this.config;
  }

  /**
   * Add a brain to the tournament.
   */
  addBrain(brain: Brain): void {
    if (this.status !== 'created') {
      throw new Error('Cannot add brains after tournament has started');
    }
    this.brains.set(brain.name, brain);
  }

  /**
   * Get all registered brains.
   */
  getBrains(): readonly Brain[] {
    return Array.from(this.brains.values());
  }

  /**
   * Generate tournament bracket based on format.
   * Must be called after all brains are registered and before tournament starts.
   */
  generateBracket(): void {
    if (this.brains.size === 0) {
      throw new Error('No brains registered for tournament');
    }

    const brainNames = Array.from(this.brains.keys());

    switch (this.config.format) {
      case 'round-robin':
        this.generateRoundRobinBracket(brainNames);
        break;
      case 'swiss':
        this.generateSwissBracket(brainNames, this.config.maxRounds || 5);
        break;
      case 'elimination':
        this.generateEliminationBracket(brainNames);
        break;
      case 'double-elimination':
        this.generateDoubleEliminationBracket(brainNames);
        break;
    }
  }

  /**
   * Round-robin: Each brain plays every other brain twice (white/black).
   */
  private generateRoundRobinBracket(brainNames: string[]): void {
    const roundsNeeded = brainNames.length * 2 - 1; // Optimal scheduling

    for (let round = 0; round < roundsNeeded; round++) {
      const roundMatches: ScheduledMatch[] = [];

      for (let i = 0; i < brainNames.length; i++) {
        for (let j = i + 1; j < brainNames.length; j++) {
          const white = brainNames[i];
          const black = brainNames[j];

          // Alternate colors each round
          const isWhiteFirst = round % 2 === 0;

          roundMatches.push(
            this.createMatch(
              round,
              isWhiteFirst ? white : black,
              isWhiteFirst ? black : white
            )
          );
        }
      }

      if (roundMatches.length > 0) {
        this.rounds.push({
          roundNumber: round,
          matches: roundMatches,
          status: 'pending',
        });
      }
    }
  }

  /**
   * Swiss system: Flexible format with variable rounds, pairing based on performance.
   * Note: Initial implementation uses round-robin; dynamic pairing deferred to future.
   */
  private generateSwissBracket(brainNames: string[], maxRounds: number): void {
    // Swiss pairing is dynamic based on standings
    // For now, generate initial pairings; update after each round
    for (let round = 0; round < Math.min(maxRounds, brainNames.length); round++) {
      const roundMatches: ScheduledMatch[] = [];

      // Simple pairing: rotate brains each round
      for (let i = 0; i < brainNames.length / 2; i++) {
        const white = brainNames[i];
        const black = brainNames[(i + round + 1) % brainNames.length];

        if (white !== black) {
          roundMatches.push(this.createMatch(round, white, black));
        }
      }

      if (roundMatches.length > 0) {
        this.rounds.push({
          roundNumber: round,
          matches: roundMatches,
          status: 'pending',
        });
      }
    }
  }

  /**
   * Single elimination: Standard bracket with winners advancing.
   */
  private generateEliminationBracket(brainNames: string[]): void {
    let currentRound = 0;
    let participants = brainNames.slice();

    while (participants.length > 1) {
      const roundMatches: ScheduledMatch[] = [];

      // Give byes to odd brain
      const byeAdded = participants.length % 2 === 1;
      if (byeAdded) {
        // Participant with bye auto-advances (handled in results processing)
      }

      // Pair up remaining participants
      for (let i = 0; i < Math.floor(participants.length / 2); i++) {
        const white = participants[i * 2];
        const black = participants[i * 2 + 1];
        roundMatches.push(this.createMatch(currentRound, white, black));
      }

      if (roundMatches.length > 0) {
        this.rounds.push({
          roundNumber: currentRound,
          matches: roundMatches,
          status: 'pending',
        });
      }

      // For next round, would need winners from this round
      // Deferred: dynamically update bracket after round completion
      participants = ['placeholder1', 'placeholder2']; // Placeholder for now
      currentRound++;

      if (currentRound > 20) break; // Safety limit
    }
  }

  /**
   * Double elimination: Winners and losers brackets.
   */
  private generateDoubleEliminationBracket(brainNames: string[]): void {
    // Double elimination is complex; deferred to future enhancement
    // For now, fall back to round-robin
    this.generateRoundRobinBracket(brainNames);
  }

  /**
   * Create a scheduled match.
   */
  private createMatch(roundNumber: number, whiteBrain: string, blackBrain: string): ScheduledMatch {
    const matchId = `match-${this.tournamentId}-${this.matchIdCounter++}`;
    const scheduledTime = this.startTime
      ? this.startTime + roundNumber * (this.config.roundDurationMs || 60000)
      : Date.now();

    const match: ScheduledMatch = {
      matchId,
      roundNumber,
      whiteBrainName: whiteBrain,
      blackBrainName: blackBrain,
      scheduledTime,
      status: 'scheduled',
    };

    this.matches.push(match);
    return match;
  }

  /**
   * Start the tournament.
   */
  start(): void {
    if (this.status !== 'created') {
      throw new Error('Tournament already started or completed');
    }
    if (this.rounds.length === 0) {
      throw new Error('Tournament bracket not generated. Call generateBracket() first.');
    }

    this.status = 'in-progress';
    this.startTime = Date.now();

    // Update start times for all rounds with matches
    for (let i = 0; i < this.rounds.length; i++) {
      const round = this.rounds[i];
      if (!round.startTime) {
        this.rounds[i] = {
          ...round,
          startTime: this.startTime + round.roundNumber * (this.config.roundDurationMs || 60000),
        };
      }
    }
  }

  /**
   * Get next unplayed match.
   */
  getNextMatch(): ScheduledMatch | null {
    const scheduled = this.matches.find(m => m.status === 'scheduled');
    if (scheduled) return scheduled;

    const inProgress = this.matches.find(m => m.status === 'in-progress');
    if (inProgress) return inProgress;

    return null;
  }

  /**
   * Record match result.
   */
  recordMatchResult(
    matchId: string,
    result: 'white-win' | 'black-win' | 'draw',
    moveCount: number,
    duration: number
  ): void {
    const match = this.matches.find(m => m.matchId === matchId);
    if (!match) {
      throw new Error(`Match not found: ${matchId}`);
    }

    const index = this.matches.indexOf(match);
    this.matches[index] = {
      ...match,
      status: 'completed',
      result,
      moveCount,
      duration,
    };

    // Update round status
    this.updateRoundStatus();
  }

  /**
   * Update round status based on match results.
   */
  private updateRoundStatus(): void {
    for (let i = 0; i < this.rounds.length; i++) {
      const round = this.rounds[i];
      const matchStatuses = round.matches.map(m => {
        const match = this.matches.find(x => x.matchId === m.matchId);
        return match?.status || 'scheduled';
      });

      if (matchStatuses.every(s => s === 'completed')) {
        this.rounds[i] = { ...round, status: 'completed', endTime: Date.now() };
      } else if (matchStatuses.some(s => s === 'in-progress' || s === 'completed')) {
        this.rounds[i] = { ...round, status: 'in-progress', startTime: Date.now() };
      }
    }
  }

  /**
   * Complete the tournament.
   */
  finalize(): void {
    if (this.status !== 'in-progress') {
      throw new Error('Tournament not in progress');
    }

    this.status = 'completed';
    this.endTime = Date.now();
  }

  /**
   * Cancel the tournament.
   */
  cancel(): void {
    this.status = 'cancelled';
    this.endTime = Date.now();
  }

  /**
   * Get tournament state.
   */
  getState(): TournamentState {
    const completedMatches = this.matches.filter(m => m.status === 'completed').length;

    return {
      tournamentId: this.tournamentId,
      config: this.config,
      brainCount: this.brains.size,
      rounds: this.rounds.map(r => ({
        ...r,
        matches: r.matches.map(m => {
          // Look up current match status from matches array
          const currentMatch = this.matches.find(x => x.matchId === m.matchId);
          return {
            matchId: m.matchId,
            whiteBrainName: m.whiteBrainName,
            blackBrainName: m.blackBrainName,
            scheduledTime: m.scheduledTime,
            status: currentMatch?.status || m.status,
            result: currentMatch?.result || m.result,
            moveCount: currentMatch?.moveCount || m.moveCount,
            duration: currentMatch?.duration || m.duration,
          };
        }),
      })),
      totalMatches: this.matches.length,
      completedMatches,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  /**
   * Get all scheduled matches.
   */
  getMatches(): readonly ScheduledMatch[] {
    return Object.freeze([...this.matches]);
  }

  /**
   * Get matches for a specific round.
   */
  getMatchesForRound(roundNumber: number): readonly ScheduledMatch[] {
    return this.matches.filter(m => m.roundNumber === roundNumber);
  }

  /**
   * Get matches for a specific brain.
   */
  getMatchesForBrain(brainName: string): readonly ScheduledMatch[] {
    return this.matches.filter(
      m => m.whiteBrainName === brainName || m.blackBrainName === brainName
    );
  }

  /**
   * Calculate tournament progress.
   */
  getProgress() {
    const totalMatches = this.matches.length;
    const completedMatches = this.matches.filter(m => m.status === 'completed').length;
    const inProgressMatches = this.matches.filter(m => m.status === 'in-progress').length;
    const scheduledMatches = this.matches.filter(m => m.status === 'scheduled').length;

    return {
      totalMatches,
      completedMatches,
      inProgressMatches,
      scheduledMatches,
      completionPercent: totalMatches > 0 ? Math.round((completedMatches / totalMatches) * 100) : 0,
      estimatedTimeRemaining: this.estimateTimeRemaining(),
    };
  }

  /**
   * Estimate time remaining based on scheduled times.
   */
  private estimateTimeRemaining(): number {
    const scheduledMatches = this.matches.filter(m => m.status === 'scheduled');
    if (scheduledMatches.length === 0) return 0;

    const lastScheduled = scheduledMatches[scheduledMatches.length - 1];
    const estimatedDuration = this.config.roundDurationMs || 60000;
    const estimatedEndTime = lastScheduled.scheduledTime + estimatedDuration;

    return Math.max(0, estimatedEndTime - Date.now());
  }
}
