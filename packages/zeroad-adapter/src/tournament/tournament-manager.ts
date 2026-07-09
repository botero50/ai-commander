/**
 * Tournament Manager
 * Orchestrates tournament structure, match scheduling, and bracket progression
 */

export type BracketFormat = 'single_elimination' | 'round_robin' | 'double_elimination' | 'swiss';
export type TournamentStatus = 'planning' | 'in_progress' | 'completed';

export interface Participant {
  id: string;
  name: string;
  seed: number; // 1 = best, higher = worse
  wins: number;
  losses: number;
  rating: number; // ELO or similar
}

export interface MatchSchedule {
  matchId: string;
  round: number;
  position: number; // position in round bracket
  participant1Id: string;
  participant2Id: string;
  scheduled: number; // timestamp
  status: 'scheduled' | 'in_progress' | 'completed';
  winner?: string;
  loser?: string;
}

export interface BracketNode {
  matchId: string;
  round: number;
  position: number;
  participant1: Participant | null;
  participant2: Participant | null;
  winner: Participant | null;
  completed: boolean;
}

export interface TournamentMetadata {
  id: string;
  name: string;
  description: string;
  format: BracketFormat;
  participants: Participant[];
  status: TournamentStatus;
  createdAt: number;
  startTime?: number;
  endTime?: number;
  totalRounds: number;
  currentRound: number;
}

/**
 * Manages tournament bracket and match scheduling
 */
export class TournamentManager {
  private metadata: TournamentMetadata;
  private bracket: Map<string, MatchSchedule> = new Map();
  private completedMatches: MatchSchedule[] = [];

  constructor(
    id: string,
    name: string,
    format: BracketFormat,
    participants: Participant[]
  ) {
    this.metadata = {
      id,
      name,
      description: '',
      format,
      participants: this.seedParticipants(participants),
      status: 'planning',
      createdAt: Date.now(),
      totalRounds: this.calculateTotalRounds(participants.length, format),
      currentRound: 0,
    };
  }

  /**
   * Seed participants by rating
   */
  private seedParticipants(participants: Participant[]): Participant[] {
    // Sort by rating descending
    const sorted = [...participants].sort((a, b) => b.rating - a.rating);

    // Assign seeds (1 = best)
    return sorted.map((p, i) => ({
      ...p,
      seed: i + 1,
    }));
  }

  /**
   * Calculate total rounds needed
   */
  private calculateTotalRounds(participantCount: number, format: BracketFormat): number {
    switch (format) {
      case 'single_elimination':
        return Math.ceil(Math.log2(participantCount));
      case 'double_elimination':
        return Math.ceil(Math.log2(participantCount)) * 2 + 1;
      case 'round_robin':
        return participantCount - 1;
      case 'swiss':
        return Math.ceil(Math.log2(participantCount)) + 1;
      default:
        return 1;
    }
  }

  /**
   * Start tournament by generating initial bracket
   */
  start(): void {
    if (this.metadata.status !== 'planning') {
      throw new Error('Tournament already started');
    }

    this.generateBracket();
    this.metadata.status = 'in_progress';
    this.metadata.startTime = Date.now();
    this.metadata.currentRound = 1;
  }

  /**
   * Generate bracket for tournament
   */
  private generateBracket(): void {
    switch (this.metadata.format) {
      case 'single_elimination':
        this.generateSingleEliminationBracket();
        break;
      case 'round_robin':
        this.generateRoundRobinBracket();
        break;
      case 'double_elimination':
        this.generateDoubleEliminationBracket();
        break;
      case 'swiss':
        this.generateSwissBracket();
        break;
    }
  }

  /**
   * Generate single elimination bracket
   */
  private generateSingleEliminationBracket(): void {
    const participants = this.metadata.participants;
    const totalMatches = participants.length - 1;

    let matchCount = 0;
    let round = 1;
    let matchesInRound = participants.length / 2;

    for (let i = 0; i < totalMatches; i++) {
      const position = (i % matchesInRound) + 1;

      const matchId = `match_r${round}_p${position}`;
      const p1Idx = Math.floor(i / matchesInRound) * 2;
      const p2Idx = p1Idx + 1;

      const match: MatchSchedule = {
        matchId,
        round,
        position,
        participant1Id: p1Idx < participants.length ? participants[p1Idx].id : '',
        participant2Id: p2Idx < participants.length ? participants[p2Idx].id : '',
        scheduled: this.metadata.startTime ? this.metadata.startTime + (i + 1) * 3600000 : Date.now(),
        status: 'scheduled',
      };

      this.bracket.set(matchId, match);
      matchCount++;

      if (matchCount >= matchesInRound) {
        matchCount = 0;
        round++;
        matchesInRound = matchesInRound / 2;
      }
    }
  }

  /**
   * Generate round robin bracket
   */
  private generateRoundRobinBracket(): void {
    const participants = this.metadata.participants;
    const n = participants.length;
    let matchId = 1;
    let round = 1;

    for (let r = 0; r < n - 1; r++) {
      for (let i = 0; i < n / 2; i++) {
        const p1 = (r + i) % n;
        const p2 = (r + n - 1 - i) % n;

        const match: MatchSchedule = {
          matchId: `match_r${round}_p${i + 1}`,
          round,
          position: i + 1,
          participant1Id: participants[p1].id,
          participant2Id: participants[p2].id,
          scheduled: this.metadata.startTime ? this.metadata.startTime + matchId * 3600000 : Date.now(),
          status: 'scheduled',
        };

        this.bracket.set(`match_r${round}_p${i + 1}`, match);
        matchId++;
      }
      round++;
    }
  }

  /**
   * Generate double elimination bracket (simplified)
   */
  private generateDoubleEliminationBracket(): void {
    // Generate winners bracket (single elimination)
    this.generateSingleEliminationBracket();

    // Add losers bracket matches
    const participants = this.metadata.participants;
    const winnerRounds = Math.ceil(Math.log2(participants.length));

    for (let r = 1; r <= winnerRounds; r++) {
      const loserBracketRound = winnerRounds + r;
      const matchesInRound = participants.length / (2 * r);

      for (let i = 0; i < matchesInRound; i++) {
        const match: MatchSchedule = {
          matchId: `match_r${loserBracketRound}_p${i + 1}`,
          round: loserBracketRound,
          position: i + 1,
          participant1Id: participants[i * 2].id,
          participant2Id: participants[i * 2 + 1].id,
          scheduled: this.metadata.startTime
            ? this.metadata.startTime + (winnerRounds + i + 1) * 3600000
            : Date.now(),
          status: 'scheduled',
        };

        this.bracket.set(`match_r${loserBracketRound}_p${i + 1}`, match);
      }
    }
  }

  /**
   * Generate Swiss system bracket
   */
  private generateSwissBracket(): void {
    // First round: seed-based pairings
    const participants = this.metadata.participants;
    const round1 = 1;

    for (let i = 0; i < participants.length / 2; i++) {
      const match: MatchSchedule = {
        matchId: `match_r${round1}_p${i + 1}`,
        round: round1,
        position: i + 1,
        participant1Id: participants[i * 2].id,
        participant2Id: participants[i * 2 + 1].id,
        scheduled: this.metadata.startTime ? this.metadata.startTime + (i + 1) * 3600000 : Date.now(),
        status: 'scheduled',
      };

      this.bracket.set(`match_r${round1}_p${i + 1}`, match);
    }
  }

  /**
   * Record match result and advance bracket
   */
  recordMatchResult(matchId: string, winnerId: string, loserId: string): void {
    const match = this.bracket.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    if (match.status === 'completed') {
      throw new Error(`Match ${matchId} already completed`);
    }

    // Update match
    match.status = 'completed';
    match.winner = winnerId;
    match.loser = loserId;

    // Update participant records
    const winner = this.metadata.participants.find((p) => p.id === winnerId);
    const loser = this.metadata.participants.find((p) => p.id === loserId);

    if (winner) winner.wins++;
    if (loser) loser.losses++;

    this.completedMatches.push(match);

    // Check if round is complete and advance
    if (this.isRoundComplete(match.round)) {
      this.advanceRound();
    }
  }

  /**
   * Check if all matches in a round are completed
   */
  private isRoundComplete(round: number): boolean {
    for (const match of this.bracket.values()) {
      if (match.round === round && match.status !== 'completed') {
        return false;
      }
    }
    return true;
  }

  /**
   * Advance to next round
   */
  private advanceRound(): void {
    this.metadata.currentRound++;

    if (this.metadata.currentRound > this.metadata.totalRounds) {
      this.metadata.status = 'completed';
      this.metadata.endTime = Date.now();
    }
  }

  /**
   * Get scheduled matches for a round
   */
  getMatchesForRound(round: number): MatchSchedule[] {
    return Array.from(this.bracket.values())
      .filter((m) => m.round === round)
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Get next scheduled matches
   */
  getNextMatches(count: number = 4): MatchSchedule[] {
    const unplayed = Array.from(this.bracket.values())
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) => a.scheduled - b.scheduled);

    return unplayed.slice(0, count);
  }

  /**
   * Get tournament metadata
   */
  getMetadata(): TournamentMetadata {
    return { ...this.metadata };
  }

  /**
   * Get bracket state
   */
  getBracket(): MatchSchedule[] {
    return Array.from(this.bracket.values());
  }

  /**
   * Get participant standings
   */
  getStandings(): Participant[] {
    return [...this.metadata.participants].sort((a, b) => {
      // Sort by wins descending, then by head-to-head, then by rating
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.losses !== a.losses) return a.losses - b.losses;
      return b.rating - a.rating;
    });
  }

  /**
   * Get match history
   */
  getMatchHistory(): MatchSchedule[] {
    return [...this.completedMatches];
  }

  /**
   * Check if tournament is finished
   */
  isFinished(): boolean {
    return this.metadata.status === 'completed';
  }

  /**
   * Reset tournament (for testing)
   */
  reset(): void {
    this.bracket.clear();
    this.completedMatches = [];
    this.metadata.status = 'planning';
    this.metadata.currentRound = 0;
    this.metadata.startTime = undefined;
    this.metadata.endTime = undefined;
  }
}
