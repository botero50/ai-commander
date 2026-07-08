/**
 * Tournament Bracket — Schedule and manage multiple matches
 *
 * Supports:
 * - Round-robin (everyone plays everyone)
 * - Single elimination
 * - Double elimination
 * - Swiss system
 */

export type BracketFormat = 'round-robin' | 'single-elimination' | 'double-elimination' | 'swiss';

export interface BracketParticipant {
  readonly id: string;
  readonly name: string;
  readonly provider: string; // 'ollama', 'claude', 'gpt', 'builtin'
  readonly model?: string; // e.g., 'mistral', 'gpt-4'
}

export interface ScheduledMatch {
  readonly matchId: string;
  readonly player1: BracketParticipant;
  readonly player2: BracketParticipant;
  readonly round: number;
  readonly scheduled: boolean;
  readonly completed: boolean;
  readonly winner?: string; // participant ID
}

export interface TournamentStandings {
  readonly participantId: string;
  readonly name: string;
  readonly wins: number;
  readonly losses: number;
  readonly rating: number;
  readonly winRate: number;
}

/**
 * Generate round-robin bracket
 */
export function generateRoundRobin(participants: BracketParticipant[]): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  let matchCounter = 0;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        matchId: `match-rr-${matchCounter++}`,
        player1: participants[i],
        player2: participants[j],
        round: 1,
        scheduled: false,
        completed: false,
      });
    }
  }

  return matches;
}

/**
 * Generate single-elimination bracket
 */
export function generateSingleElimination(participants: BracketParticipant[]): ScheduledMatch[] {
  // Simple pairing for single elimination
  const matches: ScheduledMatch[] = [];
  const shuffled = [...participants].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      matches.push({
        matchId: `match-se-${matches.length}`,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        round: 1,
        scheduled: false,
        completed: false,
      });
    }
  }

  return matches;
}

/**
 * Calculate standings from match results
 */
export function calculateStandings(
  participants: BracketParticipant[],
  matches: ScheduledMatch[]
): TournamentStandings[] {
  const standings = new Map<string, { wins: number; losses: number; totalRating: number; matchCount: number }>();

  // Initialize
  participants.forEach((p) => {
    standings.set(p.id, { wins: 0, losses: 0, totalRating: 1600, matchCount: 0 });
  });

  // Process matches
  matches.forEach((match) => {
    if (match.completed && match.winner) {
      const winner = standings.get(match.winner)!;
      const loser = standings.get(match.winner === match.player1.id ? match.player2.id : match.player1.id)!;

      winner.wins++;
      winner.matchCount++;
      loser.losses++;
      loser.matchCount++;

      // Simple ELO update (K=32)
      const K = 32;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.totalRating - winner.totalRating) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winner.totalRating - loser.totalRating) / 400));

      winner.totalRating += K * (1 - expectedWinner);
      loser.totalRating += K * (0 - expectedLoser);
    }
  });

  // Convert to standings
  return participants
    .map((p) => {
      const s = standings.get(p.id)!;
      const winRate = s.matchCount > 0 ? s.wins / s.matchCount : 0;

      return {
        participantId: p.id,
        name: p.name,
        wins: s.wins,
        losses: s.losses,
        rating: Math.round(s.totalRating),
        winRate,
      };
    })
    .sort((a, b) => b.wins - a.wins || b.rating - a.rating);
}

/**
 * Tournament bracket manager
 */
export class TournamentBracket {
  private format: BracketFormat;
  private participants: BracketParticipant[];
  private matches: ScheduledMatch[];
  private standings: TournamentStandings[] = [];

  constructor(format: BracketFormat, participants: BracketParticipant[]) {
    this.format = format;
    this.participants = participants;

    // Generate bracket
    switch (format) {
      case 'round-robin':
        this.matches = generateRoundRobin(participants);
        break;
      case 'single-elimination':
        this.matches = generateSingleElimination(participants);
        break;
      case 'double-elimination':
        // For now, treat like round-robin
        this.matches = generateRoundRobin(participants);
        break;
      case 'swiss':
        // For now, treat like round-robin
        this.matches = generateRoundRobin(participants);
        break;
    }

    this.updateStandings();
  }

  /**
   * Get next unplayed match
   */
  getNextMatch(): ScheduledMatch | null {
    return this.matches.find((m) => !m.completed) || null;
  }

  /**
   * Record match result
   */
  recordResult(matchId: string, winnerId: string): void {
    const match = this.matches.find((m) => m.matchId === matchId);
    if (match) {
      match.completed = true;
      match.winner = winnerId;
      this.updateStandings();
    }
  }

  /**
   * Get current standings
   */
  getStandings(): TournamentStandings[] {
    return this.standings;
  }

  /**
   * Get all matches
   */
  getMatches(): ScheduledMatch[] {
    return this.matches;
  }

  /**
   * Get matches for a participant
   */
  getParticipantMatches(participantId: string): ScheduledMatch[] {
    return this.matches.filter(
      (m) => m.player1.id === participantId || m.player2.id === participantId
    );
  }

  /**
   * Is tournament complete
   */
  isComplete(): boolean {
    return this.matches.every((m) => m.completed);
  }

  /**
   * Get winner
   */
  getWinner(): BracketParticipant | null {
    if (!this.isComplete()) {
      return null;
    }

    const topStanding = this.standings[0];
    return this.participants.find((p) => p.id === topStanding.participantId) || null;
  }

  private updateStandings(): void {
    this.standings = calculateStandings(this.participants, this.matches);
  }
}
