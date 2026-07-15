import { ZeroADConfiguration } from '../types/configuration.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

const DEFAULT_CONFIG: Partial<ZeroADConfiguration> = {
  ipcPort: 9100,
  ipcHost: 'localhost',
  launchTimeout: 30000,
  shutdownTimeout: 10000,
  logLevel: 'info',
  gameExecutablePath: 'C:\\Program Files (x86)\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe',
};

export class ConfigurationLoader {
  static load(overrides?: Partial<ZeroADConfiguration>): ZeroADConfiguration {
    const fromEnv = this.loadFromEnvironment();
    const config = {
      ...DEFAULT_CONFIG,
      ...fromEnv,
      ...overrides,
    } as ZeroADConfiguration;

    this.validate(config);
    return config;
  }

  private static loadFromEnvironment(): Partial<ZeroADConfiguration> {
    const env = process.env;
    const result: Partial<ZeroADConfiguration> = {};

    // Only set values if they exist in environment, otherwise let defaults apply
    if (env.ZEROAD_EXECUTABLE || env.ZEROAD_PATH) {
      result.gameExecutablePath = env.ZEROAD_EXECUTABLE || env.ZEROAD_PATH;
    }
    if (env.ZEROAD_DATA_PATH) {
      result.gameDataPath = env.ZEROAD_DATA_PATH;
    }
    if (env.ZEROAD_IPC_PORT) {
      result.ipcPort = parseInt(env.ZEROAD_IPC_PORT, 10);
    }
    if (env.ZEROAD_IPC_HOST) {
      result.ipcHost = env.ZEROAD_IPC_HOST;
    }
    if (env.ZEROAD_LAUNCH_TIMEOUT) {
      result.launchTimeout = parseInt(env.ZEROAD_LAUNCH_TIMEOUT, 10);
    }
    if (env.ZEROAD_SHUTDOWN_TIMEOUT) {
      result.shutdownTimeout = parseInt(env.ZEROAD_SHUTDOWN_TIMEOUT, 10);
    }
    if (env.ZEROAD_LOG_LEVEL) {
      result.logLevel = env.ZEROAD_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error';
    }

    return result;
  }

  private static validate(config: ZeroADConfiguration): void {
    if (!config.gameExecutablePath) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        'gameExecutablePath is required (set via ZEROAD_EXECUTABLE or ZEROAD_PATH environment variable or it will use the default Windows installation path)'
      );
    }

    if (!this.isValidLogLevel(config.logLevel || 'info')) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        `Invalid logLevel: ${config.logLevel}. Must be one of: debug, info, warn, error`
      );
    }

    if (config.ipcPort && (config.ipcPort < 1024 || config.ipcPort > 65535)) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        `Invalid ipcPort: ${config.ipcPort}. Must be between 1024 and 65535`
      );
    }

    if (config.launchTimeout && config.launchTimeout < 1000) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        `Invalid launchTimeout: ${config.launchTimeout}. Must be at least 1000ms`
      );
    }

    if (config.shutdownTimeout && config.shutdownTimeout < 100) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.INVALID_CONFIG,
        `Invalid shutdownTimeout: ${config.shutdownTimeout}. Must be at least 100ms`
      );
    }
  }

  private static isValidLogLevel(level: string): boolean {
    return ['debug', 'info', 'warn', 'error'].includes(level);
  }
}
