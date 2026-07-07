/**
 * Error codes for adapter failures.
 */
export declare enum AdapterErrorCode {
    GameNotFound = "GAME_NOT_FOUND",
    GameIncompatible = "GAME_INCOMPATIBLE",
    InitializationFailed = "INITIALIZATION_FAILED",
    SessionStartFailed = "SESSION_START_FAILED",
    SessionNotActive = "SESSION_NOT_ACTIVE",
    SessionAlreadyActive = "SESSION_ALREADY_ACTIVE",
    ObservationFailed = "OBSERVATION_FAILED",
    ObservationUnavailable = "OBSERVATION_UNAVAILABLE",
    PartialObservation = "PARTIAL_OBSERVATION",
    CommandFailed = "COMMAND_FAILED",
    CommandInvalid = "COMMAND_INVALID",
    ExecutionUnavailable = "EXECUTION_UNAVAILABLE",
    SaveStateFailed = "SAVE_STATE_FAILED",
    RestoreStateFailed = "RESTORE_STATE_FAILED",
    PauseFailed = "PAUSE_FAILED",
    ResumeFailed = "RESUME_FAILED",
    ConnectionLost = "CONNECTION_LOST",
    ConnectionTimeout = "CONNECTION_TIMEOUT",
    GameCrashed = "GAME_CRASHED",
    UnknownError = "UNKNOWN_ERROR"
}
/**
 * Adapter-specific error.
 *
 * Used when adapter operations fail.
 */
export declare class AdapterError extends Error {
    readonly code: AdapterErrorCode;
    readonly details?: Record<string, unknown> | undefined;
    /**
     * Create an adapter error.
     *
     * @param message Human-readable error message
     * @param code Error code for programmatic handling
     * @param details Optional error details
     */
    constructor(message: string, code: AdapterErrorCode, details?: Record<string, unknown> | undefined);
}
//# sourceMappingURL=adapter-error.d.ts.map