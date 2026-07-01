/**
 * Error codes for adapter failures.
 */
export enum AdapterErrorCode {
  // Initialization errors
  GameNotFound = 'GAME_NOT_FOUND',
  GameIncompatible = 'GAME_INCOMPATIBLE',
  InitializationFailed = 'INITIALIZATION_FAILED',

  // Session errors
  SessionStartFailed = 'SESSION_START_FAILED',
  SessionNotActive = 'SESSION_NOT_ACTIVE',
  SessionAlreadyActive = 'SESSION_ALREADY_ACTIVE',

  // Observation errors
  ObservationFailed = 'OBSERVATION_FAILED',
  ObservationUnavailable = 'OBSERVATION_UNAVAILABLE',
  PartialObservation = 'PARTIAL_OBSERVATION',

  // Execution errors
  CommandFailed = 'COMMAND_FAILED',
  CommandInvalid = 'COMMAND_INVALID',
  ExecutionUnavailable = 'EXECUTION_UNAVAILABLE',

  // State errors
  SaveStateFailed = 'SAVE_STATE_FAILED',
  RestoreStateFailed = 'RESTORE_STATE_FAILED',
  PauseFailed = 'PAUSE_FAILED',
  ResumeFailed = 'RESUME_FAILED',

  // Connection errors
  ConnectionLost = 'CONNECTION_LOST',
  ConnectionTimeout = 'CONNECTION_TIMEOUT',
  GameCrashed = 'GAME_CRASHED',

  // Generic errors
  UnknownError = 'UNKNOWN_ERROR',
}

/**
 * Adapter-specific error.
 *
 * Used when adapter operations fail.
 */
export class AdapterError extends Error {
  /**
   * Create an adapter error.
   *
   * @param message Human-readable error message
   * @param code Error code for programmatic handling
   * @param details Optional error details
   */
  constructor(
    message: string,
    readonly code: AdapterErrorCode,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AdapterError';
  }
}
