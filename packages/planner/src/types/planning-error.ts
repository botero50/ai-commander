/**
 * Error class for planning-layer failures.
 *
 * Separate from Engine errors; specific to planning operations.
 */
export class PlanningError extends Error {
  /**
   * Error code for programmatic handling.
   */
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'PlanningError';
    this.code = code;
  }
}
