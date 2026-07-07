import { FrameworkError, ErrorCode } from './error.js';
/**
 * Create a ServiceRegistry instance.
 */
export function createServiceRegistry() {
    const definitions = new Map();
    const startedServices = [];
    function isAsyncFactory(factory) {
        return factory.constructor.name === 'AsyncFunction';
    }
    function detectCircularDependencies(id, visited, recursionStack) {
        visited.add(id);
        recursionStack.add(id);
        const def = definitions.get(id);
        if (!def) {
            return false;
        }
        for (const dep of def.dependencies) {
            if (!visited.has(dep)) {
                if (detectCircularDependencies(dep, visited, recursionStack)) {
                    return true;
                }
            }
            else if (recursionStack.has(dep)) {
                return true;
            }
        }
        recursionStack.delete(id);
        return false;
    }
    return Object.freeze({
        register(id, factory, dependencies = []) {
            if (!id || id.length === 0) {
                throw new FrameworkError('Service id cannot be empty', ErrorCode.InvalidConfig);
            }
            if (detectCircularDependencies(id, new Set(), new Set())) {
                throw new FrameworkError(`Circular dependency detected for service ${id}`, ErrorCode.CircularDependency, { serviceId: id });
            }
            definitions.set(id, {
                factory,
                dependencies,
                isAsync: isAsyncFactory(factory),
            });
        },
        get(id) {
            const def = definitions.get(id);
            if (!def) {
                return undefined;
            }
            if (def.isAsync) {
                throw new FrameworkError(`Cannot call get() on async service ${id}. Use getAsync() instead.`, ErrorCode.NotSupported, { serviceId: id });
            }
            if (!def.instance) {
                def.instance = def.factory();
            }
            return def.instance;
        },
        async getAsync(id) {
            const def = definitions.get(id);
            if (!def) {
                return undefined;
            }
            if (!def.instance) {
                if (def.isAsync) {
                    def.instance = await def.factory();
                }
                else {
                    def.instance = def.factory();
                }
            }
            return def.instance;
        },
        has(id) {
            return definitions.has(id);
        },
        async startAll() {
            for (const def of definitions.values()) {
                if (!def.instance) {
                    if (def.isAsync) {
                        def.instance = await def.factory();
                    }
                    else {
                        def.instance = def.factory();
                    }
                }
                if (def.instance && def.instance.onStart) {
                    await def.instance.onStart();
                    startedServices.push(def.instance);
                }
            }
        },
        async stopAll() {
            for (let i = startedServices.length - 1; i >= 0; i--) {
                const service = startedServices[i];
                if (service && service.onStop) {
                    await service.onStop();
                }
            }
            startedServices.length = 0;
        },
        clear() {
            definitions.clear();
            startedServices.length = 0;
        },
    });
}
//# sourceMappingURL=service.js.map