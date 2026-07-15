export declare enum ZeroADAdapterErrorCode {
    INVALID_CONFIG = "INVALID_CONFIG",
    LAUNCH_FAILED = "LAUNCH_FAILED",
    IPC_CONNECTION_FAILED = "IPC_CONNECTION_FAILED",
    GAME_CRASH = "GAME_CRASH",
    TIMEOUT = "TIMEOUT",
    UNKNOWN = "UNKNOWN"
}
export declare class ZeroADAdapterError extends Error {
    code: ZeroADAdapterErrorCode;
    cause?: unknown | undefined;
    constructor(code: ZeroADAdapterErrorCode, message: string, cause?: unknown | undefined);
}
//# sourceMappingURL=errors.d.ts.map