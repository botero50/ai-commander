/**
 * Error codes for adapter failures.
 */
export var AdapterErrorCode;
(function (AdapterErrorCode) {
    // Initialization errors
    AdapterErrorCode["GameNotFound"] = "GAME_NOT_FOUND";
    AdapterErrorCode["GameIncompatible"] = "GAME_INCOMPATIBLE";
    AdapterErrorCode["InitializationFailed"] = "INITIALIZATION_FAILED";
    // Session errors
    AdapterErrorCode["SessionStartFailed"] = "SESSION_START_FAILED";
    AdapterErrorCode["SessionNotActive"] = "SESSION_NOT_ACTIVE";
    AdapterErrorCode["SessionAlreadyActive"] = "SESSION_ALREADY_ACTIVE";
    // Observation errors
    AdapterErrorCode["ObservationFailed"] = "OBSERVATION_FAILED";
    AdapterErrorCode["ObservationUnavailable"] = "OBSERVATION_UNAVAILABLE";
    AdapterErrorCode["PartialObservation"] = "PARTIAL_OBSERVATION";
    // Execution errors
    AdapterErrorCode["CommandFailed"] = "COMMAND_FAILED";
    AdapterErrorCode["CommandInvalid"] = "COMMAND_INVALID";
    AdapterErrorCode["ExecutionUnavailable"] = "EXECUTION_UNAVAILABLE";
    // State errors
    AdapterErrorCode["SaveStateFailed"] = "SAVE_STATE_FAILED";
    AdapterErrorCode["RestoreStateFailed"] = "RESTORE_STATE_FAILED";
    AdapterErrorCode["PauseFailed"] = "PAUSE_FAILED";
    AdapterErrorCode["ResumeFailed"] = "RESUME_FAILED";
    // Connection errors
    AdapterErrorCode["ConnectionLost"] = "CONNECTION_LOST";
    AdapterErrorCode["ConnectionTimeout"] = "CONNECTION_TIMEOUT";
    AdapterErrorCode["GameCrashed"] = "GAME_CRASHED";
    // Generic errors
    AdapterErrorCode["UnknownError"] = "UNKNOWN_ERROR";
})(AdapterErrorCode || (AdapterErrorCode = {}));
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
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'AdapterError';
    }
}
//# sourceMappingURL=adapter-error.js.map