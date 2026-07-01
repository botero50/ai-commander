import { FrameworkError, ErrorCode } from './error.js';

/**
 * Configuration value - can be any type.
 */
export type ConfigValue = string | number | boolean | object | null | undefined;

/**
 * Configuration schema for validation.
 */
export interface ConfigSchema {
  [key: string]: {
    required?: boolean;
    default?: ConfigValue;
    validate?: (value: ConfigValue) => boolean;
  };
}

/**
 * Configuration manager for application settings.
 * Supports merging, validation, and override strategies.
 */
export interface ConfigManager {
  /**
   * Get a configuration value.
   */
  get<T extends ConfigValue = ConfigValue>(key: string): T | undefined;

  /**
   * Get a configuration value with a default.
   */
  getOrDefault<T extends ConfigValue = ConfigValue>(key: string, defaultValue: T): T;

  /**
   * Set a configuration value.
   */
  set(key: string, value: ConfigValue): void;

  /**
   * Check if a configuration key exists.
   */
  has(key: string): boolean;

  /**
   * Get all configuration values.
   */
  getAll(): Record<string, ConfigValue>;

  /**
   * Merge configuration from another source.
   */
  merge(config: Record<string, ConfigValue>): void;

  /**
   * Validate configuration against schema.
   */
  validate(schema: ConfigSchema): boolean;

  /**
   * Clear all configuration.
   */
  clear(): void;
}

/**
 * Create a ConfigManager instance.
 */
export function createConfigManager(
  initialConfig: Record<string, ConfigValue> = {}
): ConfigManager {
  const config = new Map<string, ConfigValue>();

  for (const [key, value] of Object.entries(initialConfig)) {
    config.set(key, value);
  }

  return Object.freeze({
    get<T extends ConfigValue = ConfigValue>(key: string): T | undefined {
      if (!key || key.length === 0) {
        throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
      }
      return config.get(key) as T | undefined;
    },

    getOrDefault<T extends ConfigValue = ConfigValue>(key: string, defaultValue: T): T {
      if (!key || key.length === 0) {
        throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
      }
      const value = config.get(key);
      return (value === undefined ? defaultValue : value) as T;
    },

    set(key: string, value: ConfigValue): void {
      if (!key || key.length === 0) {
        throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
      }
      config.set(key, value);
    },

    has(key: string): boolean {
      if (!key || key.length === 0) {
        throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
      }
      return config.has(key);
    },

    getAll(): Record<string, ConfigValue> {
      const result: Record<string, ConfigValue> = {};
      for (const [key, value] of config) {
        result[key] = value;
      }
      return Object.freeze(result);
    },

    merge(newConfig: Record<string, ConfigValue>): void {
      for (const [key, value] of Object.entries(newConfig)) {
        config.set(key, value);
      }
    },

    validate(schema: ConfigSchema): boolean {
      for (const [key, rules] of Object.entries(schema)) {
        const value = config.get(key);

        if (rules.required && value === undefined) {
          throw new FrameworkError(
            `Required configuration ${key} is missing`,
            ErrorCode.InvalidConfig,
            { key }
          );
        }

        if (value !== undefined && rules.validate) {
          if (!rules.validate(value)) {
            throw new FrameworkError(
              `Configuration ${key} failed validation`,
              ErrorCode.InvalidConfig,
              { key, value }
            );
          }
        }

        if (value === undefined && rules.default !== undefined) {
          config.set(key, rules.default);
        }
      }

      return true;
    },

    clear(): void {
      config.clear();
    },
  });
}
