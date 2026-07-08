/**
 * UI Components
 *
 * Reusable components and rendering logic for web match viewer.
 * Framework-agnostic component definitions with TypeScript interfaces.
 * Ready for React, Vue, or any other UI framework.
 */

import type { MatchViewerState, MatchViewerEvent } from './match-viewer.js';
import type { DecisionEvent } from '../match/decision-overlay.js';

/**
 * Formatted match status display
 */
export interface FormattedMatchStatus {
  readonly matchId: string;
  readonly status: string;
  readonly brain1: string;
  readonly brain2: string;
  readonly currentTick: number;
  readonly totalTicks: number;
  readonly progress: number; // 0-100
  readonly duration: string; // Formatted: "1m 23s"
  readonly winner?: string;
  readonly isActive: boolean;
}

/**
 * Formatted decision display
 */
export interface FormattedDecision {
  readonly tick: number;
  readonly player: 'Player 1' | 'Player 2';
  readonly brain: string;
  readonly reasoning: string;
  readonly commandCount: number;
  readonly commands: string;
  readonly duration: string; // Formatted: "250ms"
}

/**
 * Formatted player statistics
 */
export interface FormattedPlayerStats {
  readonly name: string;
  readonly commands: number;
  readonly errors: number;
  readonly commandsPerTick: number; // commands / ticks
  readonly errorRate: number; // errors / commands
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000);

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}

/**
 * Format match state for UI display
 */
export function formatMatchStatus(state: Partial<MatchViewerState>): FormattedMatchStatus {
  const progress =
    state.totalTicks && state.currentTick ? Math.min((state.currentTick / state.totalTicks) * 100, 100) : 0;

  return {
    matchId: state.matchId || 'Unknown',
    status: state.status || 'unknown',
    brain1: state.brain1 || 'Brain 1',
    brain2: state.brain2 || 'Brain 2',
    currentTick: state.currentTick || 0,
    totalTicks: state.totalTicks || 0,
    progress,
    duration: formatDuration(state.duration || 0),
    winner: state.winner,
    isActive: state.status === 'running',
  };
}

/**
 * Format decision for UI display
 */
export function formatDecision(decision: DecisionEvent): FormattedDecision {
  const playerLabel = decision.player === 'player1' ? 'Player 1' : 'Player 2';

  return {
    tick: decision.tick,
    player: playerLabel,
    brain: decision.brainName,
    reasoning: decision.reasoning || '(no reasoning)',
    commandCount: decision.commandCount,
    commands: decision.commands.join(', ') || '(no commands)',
    duration: formatDuration(decision.durationMs),
  };
}

/**
 * Format player statistics for UI display
 */
export function formatPlayerStats(
  name: string,
  commands: number,
  errors: number,
  totalTicks: number
): FormattedPlayerStats {
  const commandsPerTick = totalTicks > 0 ? commands / totalTicks : 0;
  const errorRate = commands > 0 ? errors / commands : 0;

  return {
    name,
    commands,
    errors,
    commandsPerTick: Math.round(commandsPerTick * 100) / 100,
    errorRate: Math.round(errorRate * 10000) / 100, // percentage
  };
}

/**
 * Color for status indicator
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'starting':
      return '#FFA500'; // Orange
    case 'running':
      return '#00FF00'; // Green
    case 'completed':
      return '#0000FF'; // Blue
    default:
      return '#808080'; // Gray
  }
}

/**
 * Color for trend indicator
 */
export function getTrendColor(trend: 'increasing' | 'decreasing' | 'stable'): string {
  switch (trend) {
    case 'increasing':
      return '#00FF00'; // Green
    case 'decreasing':
      return '#FF0000'; // Red
    case 'stable':
      return '#FFFF00'; // Yellow
    default:
      return '#808080'; // Gray
  }
}

/**
 * Color for player
 */
export function getPlayerColor(player: 'player1' | 'player2'): string {
  return player === 'player1' ? '#FF6B6B' : '#4ECDC4'; // Red and Teal
}

/**
 * Truncate long text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Format large numbers with separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Get progress bar width percentage
 */
export function getProgressWidth(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min((current / total) * 100, 100);
}
