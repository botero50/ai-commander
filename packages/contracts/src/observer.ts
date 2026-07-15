/**
 * Observer Contract
 *
 * Event-driven pattern for broadcasting game/tournament events.
 */

import type { GameCommand } from './game-adapter.js';
import type { BrainDecision } from './brain.js';
import type { MatchResult } from './match.js';

export interface GameEvent {
  type: string;
  timestamp: number;
  playerId?: number;
  [key: string]: unknown;
}

export interface DecisionEvent extends GameEvent {
  type: 'decision';
  decision: BrainDecision;
}

export interface CommandEvent extends GameEvent {
  type: 'command';
  command: GameCommand;
}

export interface MatchEventData {
  matchId: string;
  tick?: number;
  [key: string]: unknown;
}

export interface Observer {
  onGameStarted(data: MatchEventData): Promise<void>;
  onDecision(event: DecisionEvent): Promise<void>;
  onCommand(event: CommandEvent): Promise<void>;
  onGameEnded(result: MatchResult): Promise<void>;
  onEvent(event: GameEvent): Promise<void>;
}

export interface EventBus {
  subscribe(observer: Observer): void;
  unsubscribe(observer: Observer): void;
  publish(event: GameEvent): Promise<void>;
}
