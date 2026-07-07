import { FrameworkError, ErrorCode } from './error.js';
/**
 * Create a ConfigManager instance.
 */
export function createConfigManager(initialConfig = {}) {
    const config = new Map();
    for (const [key, value] of Object.entries(initialConfig)) {
        config.set(key, value);
    }
    return Object.freeze({
        get(key) {
            if (!key || key.length === 0) {
                throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
            }
            return config.get(key);
        },
        getOrDefault(key, defaultValue) {
            if (!key || key.length === 0) {
                throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
            }
            const value = config.get(key);
            return (value === undefined ? defaultValue : value);
        },
        set(key, value) {
            if (!key || key.length === 0) {
                throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
            }
            config.set(key, value);
        },
        has(key) {
            if (!key || key.length === 0) {
                throw new FrameworkError('Config key cannot be empty', ErrorCode.InvalidConfig);
            }
            return config.has(key);
        },
        getAll() {
            const result = {};
            for (const [key, value] of config) {
                result[key] = value;
            }
            return Object.freeze(result);
        },
        merge(newConfig) {
            for (const [key, value] of Object.entries(newConfig)) {
                config.set(key, value);
            }
        },
        validate(schema) {
            for (const [key, rules] of Object.entries(schema)) {
                const value = config.get(key);
                if (rules.required && value === undefined) {
                    throw new FrameworkError(`Required configuration ${key} is missing`, ErrorCode.InvalidConfig, { key });
                }
                if (value !== undefined && rules.validate) {
                    if (!rules.validate(value)) {
                        throw new FrameworkError(`Configuration ${key} failed validation`, ErrorCode.InvalidConfig, { key, value });
                    }
                }
                if (value === undefined && rules.default !== undefined) {
                    config.set(key, rules.default);
                }
            }
            return true;
        },
        clear() {
            config.clear();
        },
    });
}
//# sourceMappingURL=config.js.map