/**
 * Preference for Goal achievement.
 *
 * Expresses desired properties or outcomes without mandating specific actions.
 * Used by planners and strategies to guide decision-making.
 */
export interface GoalPreference {
  /**
   * Preference type (game-agnostic identifier).
   *
   * Examples: 'fast', 'efficient', 'safe', 'aggressive'
   * The meaning is domain-specific and interpreted by planners/strategies.
   */
  readonly type: string;

  /**
   * Preference weight (0-1, higher = stronger preference).
   *
   * Allows multiple preferences to be ranked.
   */
  readonly weight: number;

  /**
   * Optional preference description.
   */
  readonly description?: string;
}

/**
 * Check equality of preferences.
 */
export function preferencesEqual(a: GoalPreference, b: GoalPreference): boolean {
  return a.type === b.type && a.weight === b.weight && a.description === b.description;
}
