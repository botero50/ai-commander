import type { Factory, AsyncFactory } from './factory.js';
import type { Lifecycle } from './lifecycle.js';
import { FrameworkError, ErrorCode } from './error.js';

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
export function createPluginRegistry(): PluginRegistry {
  const factories = new Map<string, Factory<Plugin> | AsyncFactory<Plugin>>();
  const plugins = new Map<string, Plugin>();
  const loaded = new Set<string>();

  function isAsyncFactory(factory: Factory<Plugin> | AsyncFactory<Plugin>): boolean {
    return factory.constructor.name === 'AsyncFunction';
  }

  return Object.freeze({
    register(id: string, factory: Factory<Plugin> | AsyncFactory<Plugin>): void {
      if (!id || id.length === 0) {
        throw new FrameworkError('Plugin id cannot be empty', ErrorCode.InvalidConfig);
      }
      if (!factory) {
        throw new FrameworkError('Plugin factory cannot be null', ErrorCode.InvalidConfig);
      }

      factories.set(id, factory);
    },

    async load(pluginId: string): Promise<Plugin> {
      if (loaded.has(pluginId)) {
        const plugin = plugins.get(pluginId);
        if (plugin) return plugin;
      }

      const factory = factories.get(pluginId);
      if (!factory) {
        throw new FrameworkError(`Plugin ${pluginId} not found`, ErrorCode.PluginLoadFailed, {
          pluginId,
        });
      }

      try {
        let plugin: Plugin;

        if (isAsyncFactory(factory)) {
          plugin = await (factory as AsyncFactory<Plugin>)();
        } else {
          plugin = (factory as Factory<Plugin>)();
        }

        if (!plugin.id || plugin.id.length === 0) {
          throw new FrameworkError('Plugin must have an id', ErrorCode.InvalidConfig, { pluginId });
        }

        if (!plugin.name || plugin.name.length === 0) {
          throw new FrameworkError('Plugin must have a name', ErrorCode.InvalidConfig, {
            pluginId,
          });
        }

        if (!plugin.version || plugin.version.length === 0) {
          throw new FrameworkError('Plugin must have a version', ErrorCode.InvalidConfig, {
            pluginId,
          });
        }

        if (plugin.onStart) {
          const result = await plugin.onStart();
          if (!result.success) {
            throw new FrameworkError(
              `Failed to initialize plugin ${pluginId}: ${result.error}`,
              ErrorCode.PluginLoadFailed,
              { pluginId }
            );
          }
        }

        plugins.set(pluginId, plugin);
        loaded.add(pluginId);

        return plugin;
      } catch (error) {
        if (error instanceof FrameworkError) {
          throw error;
        }
        throw new FrameworkError(
          `Failed to load plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`,
          ErrorCode.PluginLoadFailed,
          { pluginId }
        );
      }
    },

    async loadAll(): Promise<void> {
      const toLoad = Array.from(factories.keys()).filter((id) => !loaded.has(id));

      for (const pluginId of toLoad) {
        await this.load(pluginId);
      }
    },

    get(pluginId: string): Plugin | undefined {
      return plugins.get(pluginId);
    },

    async unload(pluginId: string): Promise<void> {
      if (!loaded.has(pluginId)) {
        return;
      }

      const plugin = plugins.get(pluginId);
      if (plugin?.onStop) {
        await plugin.onStop();
      }

      plugins.delete(pluginId);
      loaded.delete(pluginId);
    },

    isLoaded(pluginId: string): boolean {
      return loaded.has(pluginId);
    },

    getAll(): readonly Plugin[] {
      return Array.from(plugins.values());
    },

    clear(): void {
      factories.clear();
      plugins.clear();
      loaded.clear();
    },
  });
}
