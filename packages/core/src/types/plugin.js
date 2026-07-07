import { FrameworkError, ErrorCode } from './error.js';
/**
 * Create a PluginRegistry instance.
 */
export function createPluginRegistry() {
    const factories = new Map();
    const plugins = new Map();
    const loaded = new Set();
    function isAsyncFactory(factory) {
        return factory.constructor.name === 'AsyncFunction';
    }
    return Object.freeze({
        register(id, factory) {
            if (!id || id.length === 0) {
                throw new FrameworkError('Plugin id cannot be empty', ErrorCode.InvalidConfig);
            }
            if (!factory) {
                throw new FrameworkError('Plugin factory cannot be null', ErrorCode.InvalidConfig);
            }
            factories.set(id, factory);
        },
        async load(pluginId) {
            if (loaded.has(pluginId)) {
                const plugin = plugins.get(pluginId);
                if (plugin)
                    return plugin;
            }
            const factory = factories.get(pluginId);
            if (!factory) {
                throw new FrameworkError(`Plugin ${pluginId} not found`, ErrorCode.PluginLoadFailed, {
                    pluginId,
                });
            }
            try {
                let plugin;
                if (isAsyncFactory(factory)) {
                    plugin = await factory();
                }
                else {
                    plugin = factory();
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
                        throw new FrameworkError(`Failed to initialize plugin ${pluginId}: ${result.error}`, ErrorCode.PluginLoadFailed, { pluginId });
                    }
                }
                plugins.set(pluginId, plugin);
                loaded.add(pluginId);
                return plugin;
            }
            catch (error) {
                if (error instanceof FrameworkError) {
                    throw error;
                }
                throw new FrameworkError(`Failed to load plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`, ErrorCode.PluginLoadFailed, { pluginId });
            }
        },
        async loadAll() {
            const toLoad = Array.from(factories.keys()).filter((id) => !loaded.has(id));
            for (const pluginId of toLoad) {
                await this.load(pluginId);
            }
        },
        get(pluginId) {
            return plugins.get(pluginId);
        },
        async unload(pluginId) {
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
        isLoaded(pluginId) {
            return loaded.has(pluginId);
        },
        getAll() {
            return Array.from(plugins.values());
        },
        clear() {
            factories.clear();
            plugins.clear();
            loaded.clear();
        },
    });
}
//# sourceMappingURL=plugin.js.map