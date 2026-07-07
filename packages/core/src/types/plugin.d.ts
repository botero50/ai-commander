import type { Factory, AsyncFactory } from './factory.js';
import type { Lifecycle } from './lifecycle.js';
/**
 * Plugin that can extend the framework.
 * Plugins are loadable modules with initialization logic.
 */
export interface Plugin extends Partial<Lifecycle> {
    /**
     * Unique identifier for this plugin.
     */
    readonly id: string;
    /**
     * Human-readable name.
     */
    readonly name: string;
    /**
     * Semantic version (e.g., "1.0.0").
     */
    readonly version: string;
    /**
     * Plugin metadata.
     */
    readonly metadata?: Record<string, unknown>;
}
/**
 * Registry for loading and managing plugins.
 * Handles plugin lifecycle and initialization.
 */
export interface PluginRegistry {
    /**
     * Register a plugin factory.
     */
    register(id: string, factory: Factory<Plugin> | AsyncFactory<Plugin>): void;
    /**
     * Load a plugin by ID.
     */
    load(pluginId: string): Promise<Plugin>;
    /**
     * Load all registered plugins.
     */
    loadAll(): Promise<void>;
    /**
     * Get a loaded plugin.
     */
    get(pluginId: string): Plugin | undefined;
    /**
     * Unload a plugin.
     */
    unload(pluginId: string): Promise<void>;
    /**
     * Check if a plugin is loaded.
     */
    isLoaded(pluginId: string): boolean;
    /**
     * Get all loaded plugins.
     */
    getAll(): readonly Plugin[];
    /**
     * Clear all plugins.
     */
    clear(): void;
}
/**
 * Create a PluginRegistry instance.
 */
export declare function createPluginRegistry(): PluginRegistry;
//# sourceMappingURL=plugin.d.ts.map