/**
 * AI Brain Contract
 *
 * Defines the interface for AI decision-making engines.
 * Implementations can use Ollama, Claude, OpenAI, Gemini, Stockfish, etc.
 */

import type { GameCommand } from './game-adapter.js';

export interface WorldState {
  tick: number;
  players: PlayerState[];
  gameState: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PlayerState {
  id: number;
  name: string;
  resources?: Record<string, number>;
  units?: number;
  [key: string]: unknown;
}

export interface BrainDecision {
  playerID: number;
  commands: GameCommand[];
  reasoning?: string;
  confidence: number;
  timestamp: number;
}

export interface AIBrain {
  readonly providerId: string;
  readonly modelName: string;

  decide(worldState: WorldState): Promise<BrainDecision>;
  reset?(): Promise<void>;
  shutdown?(): Promise<void>;
}

export interface BrainFactory {
  createBrain(provider: string, model: string): Promise<AIBrain>;
  listAvailableBrains(): Promise<Array<{ provider: string; model: string }>>;
}
