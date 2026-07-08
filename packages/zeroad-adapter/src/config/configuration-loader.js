import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
const DEFAULT_CONFIG = {
    ipcPort: 9100,
    ipcHost: 'localhost',
    launchTimeout: 30000,
    shutdownTimeout: 10000,
    logLevel: 'info',
};
export class ConfigurationLoader {
    static load(overrides) {
        const fromEnv = this.loadFromEnvironment();
        const config = {
            ...DEFAULT_CONFIG,
            ...fromEnv,
            ...overrides,
        };
        this.validate(config);
        return config;
    }
    static loadFromEnvironment() {
        const env = process.env;
        return {
            gameExecutablePath: env.ZEROAD_EXECUTABLE || env.ZEROAD_PATH,
            gameDataPath: env.ZEROAD_DATA_PATH,
            ipcPort: env.ZEROAD_IPC_PORT ? parseInt(env.ZEROAD_IPC_PORT, 10) : undefined,
            ipcHost: env.ZEROAD_IPC_HOST,
            launchTimeout: env.ZEROAD_LAUNCH_TIMEOUT ? parseInt(env.ZEROAD_LAUNCH_TIMEOUT, 10) : undefined,
            shutdownTimeout: env.ZEROAD_SHUTDOWN_TIMEOUT ? parseInt(env.ZEROAD_SHUTDOWN_TIMEOUT, 10) : undefined,
            logLevel: env.ZEROAD_LOG_LEVEL || undefined,
        };
    }
    static validate(config) {
        if (!config.gameExecutablePath) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, 'gameExecutablePath is required (set via ZEROAD_EXECUTABLE or ZEROAD_PATH environment variable)');
        }
        if (!this.isValidLogLevel(config.logLevel || 'info')) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, `Invalid logLevel: ${config.logLevel}. Must be one of: debug, info, warn, error`);
        }
        if (config.ipcPort && (config.ipcPort < 1024 || config.ipcPort > 65535)) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, `Invalid ipcPort: ${config.ipcPort}. Must be between 1024 and 65535`);
        }
        if (config.launchTimeout && config.launchTimeout < 1000) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, `Invalid launchTimeout: ${config.launchTimeout}. Must be at least 1000ms`);
        }
        if (config.shutdownTimeout && config.shutdownTimeout < 100) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.INVALID_CONFIG, `Invalid shutdownTimeout: ${config.shutdownTimeout}. Must be at least 100ms`);
        }
    }
    static isValidLogLevel(level) {
        return ['debug', 'info', 'warn', 'error'].includes(level);
    }
}
//# sourceMappingURL=configuration-loader.js.map