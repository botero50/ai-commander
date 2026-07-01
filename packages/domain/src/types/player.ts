import type { PlayerId, TeamId } from './identity.js';

/**
 * Player in the game.
 * Represents a human player or AI agent competing in the game.
 */
export interface Player {
  /**
   * Unique identifier for this player.
   */
  readonly id: PlayerId;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Team this player belongs to (if applicable).
   * null if game is free-for-all.
   */
  readonly teamId: TeamId | null;

  /**
   * Is this a human-controlled player?
   */
  readonly isHuman: boolean;

  /**
   * Arbitrary custom data for game-specific player properties.
   * Examples: color, faction, starting resources, difficulty level.
   */
  readonly customData: Record<string, unknown>;
}

/**
 * Create a Player value object.
 */
export function createPlayer(
  id: PlayerId,
  name: string,
  teamId: TeamId | null = null,
  isHuman: boolean = false,
  customData: Record<string, unknown> = {}
): Player {
  if (!name || name.length === 0) {
    throw new Error('Player name cannot be empty');
  }

  return Object.freeze({
    id,
    name,
    teamId,
    isHuman,
    customData: Object.freeze({ ...customData }),
  });
}

/**
 * Check if two players are the same.
 */
export function playersEqual(a: Player, b: Player): boolean {
  return a.id === b.id;
}

/**
 * Team in the game.
 * Groups players for cooperative play.
 */
export interface Team {
  /**
   * Unique identifier for this team.
   */
  readonly id: TeamId;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * All players in this team.
   */
  readonly playerIds: readonly PlayerId[];

  /**
   * Arbitrary custom data for game-specific team properties.
   * Examples: color, faction, shared resources.
   */
  readonly customData: Record<string, unknown>;
}

/**
 * Create a Team value object.
 */
export function createTeam(
  id: TeamId,
  name: string,
  playerIds: readonly PlayerId[],
  customData: Record<string, unknown> = {}
): Team {
  if (!name || name.length === 0) {
    throw new Error('Team name cannot be empty');
  }
  if (playerIds.length === 0) {
    throw new Error('Team must have at least one player');
  }

  return Object.freeze({
    id,
    name,
    playerIds: Object.freeze([...playerIds]),
    customData: Object.freeze({ ...customData }),
  });
}

/**
 * Check if two teams are the same.
 */
export function teamsEqual(a: Team, b: Team): boolean {
  return a.id === b.id;
}
