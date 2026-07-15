/**
 * Match Contract
 *
 * Defines interfaces for running matches and tournaments.
 */

import type { GameCommand } from './game-adapter.js';
import type { BrainDecision } from './brain.js';

export interface MatchTick {
  number: number;
  timestamp: number;
  brainDecisions: BrainDecision[];
  gameState: Record<string, unknown>;
}

export interface MatchResult {
  matchId: string;
  winner?: number;
  duration: number; // seconds
  tickCount: number;
  startTime: number;
  endTime: number;
  playerStats: Record<number, MatchPlayerStats>;
}

export interface MatchPlayerStats {
  playerId: number;
  commandsIssued: number;
  commandsExecuted: number;
  averageDecisionLatency: number; // ms
  finalScore?: number;
}

export interface Match {
  readonly matchId: string;
  readonly playerId1: string;
  readonly playerId2: string;

  start(): Promise<void>;
  run(): Promise<MatchResult>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
}

export interface Tournament {
  readonly tournamentId: string;

  addMatch(match: Match): void;
  start(): Promise<void>;
  getResults(): Promise<TournamentResults>;
}

export interface TournamentResults {
  standings: Array<{ playerId: string; wins: number; rating: number }>;
  matches: MatchResult[];
  startTime: number;
  endTime: number;
}
