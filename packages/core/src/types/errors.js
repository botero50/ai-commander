export var ZeroADAdapterErrorCode;
(function (ZeroADAdapterErrorCode) {
    ZeroADAdapterErrorCode["INVALID_CONFIG"] = "INVALID_CONFIG";
    ZeroADAdapterErrorCode["LAUNCH_FAILED"] = "LAUNCH_FAILED";
    ZeroADAdapterErrorCode["IPC_CONNECTION_FAILED"] = "IPC_CONNECTION_FAILED";
    ZeroADAdapterErrorCode["GAME_CRASH"] = "GAME_CRASH";
    ZeroADAdapterErrorCode["TIMEOUT"] = "TIMEOUT";
    ZeroADAdapterErrorCode["UNKNOWN"] = "UNKNOWN";
})(ZeroADAdapterErrorCode || (ZeroADAdapterErrorCode = {}));
export class ZeroADAdapterError extends Error {
    code;
    cause;
    constructor(code, message, cause) {
        super(message);
        this.code = code;
        this.cause = cause;
        this.name = 'ZeroADAdapterError';
    }
}
//# sourceMappingURL=errors.js.map