/**
 * STORY 32.2: Tournament Executor
 *
 * Executes scheduled matches and records results.
 *
 * Responsibilities:
 * - Execute matches sequentially
 * - Record match results and metrics
 * - Handle errors gracefully
 * - Generate PGN for each match
 * - Progress reporting
 */

import type {
  TournamentSchedule,
  ScheduledMatch,
  CompletedMatch,
  TournamentResults,
} from './tournament-types.js';

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

export class TournamentExecutor {
  constructor(
    private schedule: TournamentSchedule,
    private matchExecutor: MatchExecutor,
    private config: ExecutionConfig = {
      maxRetries: 1,
      skipOnError: false,
      recordPgn: true,
    },
    private callbacks: ExecutorCallbacks = {}
  ) {}

  async execute(): Promise<TournamentResults> {
    const completedMatches: CompletedMatch[] = [];
    const startTime = Date.now();
    let totalMoves = 0;
    const moveTimings: number[] = [];

    let matchIndex = 0;
    const totalMatches = this.schedule.totalMatches;

    // Execute matches
    for (const round of this.schedule.rounds) {
      for (const scheduledMatch of round) {
        matchIndex++;

        try {
          this.callbacks.onMatchStart?.(scheduledMatch);

          // Execute match with retries
          let result = null;
          let lastError: Error | null = null;

          for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
            try {
              result = await this.matchExecutor.executeMatch(
                scheduledMatch.white,
                scheduledMatch.black
              );
              break;
            } catch (error) {
              lastError = error instanceof Error ? error : new Error(String(error));
              if (attempt === this.config.maxRetries - 1) throw lastError;
            }
          }

          if (!result) {
            throw new Error('Match execution returned no result');
          }

          const completedMatch: CompletedMatch = {
            ...scheduledMatch,
            result: result.result,
            moveCount: result.moveCount,
            duration: result.duration,
            completedTime: Date.now(),
            pgn: result.pgn,
          };

          completedMatches.push(completedMatch);
          totalMoves += result.moveCount;
          moveTimings.push(result.duration);

          this.callbacks.onMatchComplete?.(completedMatch);
          this.callbacks.onProgress?.(matchIndex, totalMatches);
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));

          this.callbacks.onMatchError?.(scheduledMatch, err);

          if (!this.config.skipOnError) {
            throw err;
          }

          // Log error and continue
          console.warn(
            `Match ${scheduledMatch.matchId} failed: ${err.message}`
          );
        }
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate statistics
    const winRates: Record<string, number> = {};
    for (const player of this.schedule.config.players) {
      const wins = completedMatches.filter(
        (m) => (m.result === 'white-win' && m.white === player) ||
               (m.result === 'black-win' && m.black === player)
      ).length;
      const losses = completedMatches.filter(
        (m) => (m.result === 'white-win' && m.black === player) ||
               (m.result === 'black-win' && m.white === player)
      ).length;
      const total = wins + losses;
      winRates[player] = total > 0 ? wins / total : 0;
    }

    const drawMatches = completedMatches.filter((m) => m.result === 'draw').length;
    const drawRate = completedMatches.length > 0 ? drawMatches / completedMatches.length : 0;

    const avgMoveTime =
      moveTimings.length > 0
        ? moveTimings.reduce((a, b) => a + b, 0) / moveTimings.length
        : 0;

    return {
      tournamentId: this.schedule.config.id,
      config: this.schedule.config,
      matches: completedMatches,
      standings: [], // Will be populated by aggregator
      startTime,
      endTime,
      duration,
      stats: {
        totalMatches: completedMatches.length,
        totalMoves,
        avgMoveTime,
        winRates,
        drawRate,
      },
    };
  }
}

export function createExecutor(
  schedule: TournamentSchedule,
  matchExecutor: MatchExecutor,
  config?: ExecutionConfig,
  callbacks?: ExecutorCallbacks
): TournamentExecutor {
  return new TournamentExecutor(schedule, matchExecutor, config, callbacks);
}
