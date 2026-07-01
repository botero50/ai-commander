/**
 * Decision layer error.
 * Separate from Engine errors.
 */
export class DecisionError extends Error {
  constructor(
    message: string,
    readonly code: string
  ) {
    super(message);
    this.name = 'DecisionError';
    Object.setPrototypeOf(this, DecisionError.prototype);
  }
}
