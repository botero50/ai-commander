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
export declare function createConfigManager(initialConfig?: Record<string, ConfigValue>): ConfigManager;
//# sourceMappingURL=config.d.ts.map