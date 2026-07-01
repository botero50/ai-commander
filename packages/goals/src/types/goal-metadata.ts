/**
 * Extensible metadata attached to a Goal.
 *
 * Allows future extensions without modifying Goal interface.
 */
export interface GoalMetadata {
  /**
   * Timestamp when goal was created (milliseconds since epoch).
   */
  readonly createdAt: number;

  /**
   * Optional timestamp when goal was last modified.
   */
  readonly modifiedAt?: number;

  /**
   * Optional reason for goal creation.
   */
  readonly reason?: string;

  /**
   * Custom metadata (extensible).
   */
  readonly [key: string]: unknown;
}
