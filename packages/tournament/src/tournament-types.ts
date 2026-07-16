/**
 * Tournament Engine - Core Type Definitions
 */

export type TournamentFormat = 'round-robin' | 'swiss' | 'double-elimination';

export interface TournamentConfig {
  readonly id: string;
  readonly name: string;
  readonly format: TournamentFormat;
  readonly players: readonly string[];
  readonly roundCount?: number; // For Swiss format
  readonly timeControl: 'infinite' | '5m' | '15m' | '30m';
  readonly k_factor: number; // ELO K-factor (default 32)
  readonly seed?: number; // For reproducibility
}

export interface ScheduledMatch {
  readonly matchId: string;
  readonly round: number;
  readonly white: string;
  readonly black: string;
  readonly scheduledTime?: number;
}

export interface CompletedMatch extends ScheduledMatch {
  readonly result: 'white-win' | 'black-win' | 'draw';
  readonly moveCount: number;
  readonly duration: number;
  readonly completedTime: number;
  readonly pgn?: string;
}

export interface PlayerRating {
  readonly player: string;
  readonly rating: number;
  readonly ratingChange: number;
}

export interface PlayerStandings {
  readonly rank: number;
  readonly player: string;
  readonly gamesPlayed: number;
  readonly wins: number;
  readonly losses: number;
  readonly draws: number;
  readonly score: number; // Win=1, Draw=0.5, Loss=0
  readonly rating: number; // ELO
  readonly ratingChange: number;
  readonly performance: number; // Calculated from results
}

export interface TournamentResults {
  readonly tournamentId: string;
  readonly config: TournamentConfig;
  readonly matches: readonly CompletedMatch[];
  readonly standings: readonly PlayerStandings[];
  readonly startTime: number;
  readonly endTime: number;
  readonly duration: number;
  readonly stats: {
    readonly totalMatches: number;
    readonly totalMoves: number;
    readonly avgMoveTime: number;
    readonly winRates: Record<string, number>;
    readonly drawRate: number;
  };
}

export interface TournamentSchedule {
  readonly config: TournamentConfig;
  readonly rounds: readonly (readonly ScheduledMatch[])[];
  readonly totalMatches: number;
}

export interface ExecutionConfig {
  readonly maxRetries: number;
  readonly skipOnError: boolean;
  readonly recordPgn: boolean;
}

export interface ExecutorCallbacks {
  readonly onMatchStart?: (match: ScheduledMatch) => void;
  readonly onMatchComplete?: (match: CompletedMatch) => void;
  readonly onMatchError?: (match: ScheduledMatch, error: Error) => void;
  readonly onProgress?: (completed: number, total: number) => void;
}

export interface MatchExecutor {
  executeMatch(white: string, black: string): Promise<{
    result: 'white-win' | 'black-win' | 'draw';
    moveCount: number;
    duration: number;
    pgn?: string;
  }>;
}
