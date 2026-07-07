import { FrameworkError, ErrorCode } from './error.js';
/**
 * Create a ModuleRegistry instance.
 */
export function createModuleRegistry() {
    const modules = new Map();
    const loaded = new Set();
    function validateDependencies(module) {
        for (const dep of module.dependencies) {
            if (!modules.has(dep)) {
                throw new FrameworkError(`Module ${module.id} depends on ${dep} which is not registered`, ErrorCode.MissingDependency, { moduleId: module.id, missingDep: dep });
            }
        }
    }
    function detectCircularDependencies(id, visited, recursionStack) {
        visited.add(id);
        recursionStack.add(id);
        const module = modules.get(id);
        if (!module)
            return false;
        for (const dep of module.dependencies) {
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
    function getLoadOrder(moduleId) {
        const order = [];
        const visited = new Set();
        function visit(id) {
            if (visited.has(id))
                return;
            visited.add(id);
            const module = modules.get(id);
            if (!module)
                return;
            for (const dep of module.dependencies) {
                visit(dep);
            }
            order.push(id);
        }
        visit(moduleId);
        return order;
    }
    return Object.freeze({
        register(module) {
            if (!module.id || module.id.length === 0) {
                throw new FrameworkError('Module id cannot be empty', ErrorCode.InvalidConfig);
            }
            if (!module.name || module.name.length === 0) {
                throw new FrameworkError('Module name cannot be empty', ErrorCode.InvalidConfig);
            }
            if (!module.version || module.version.length === 0) {
                throw new FrameworkError('Module version cannot be empty', ErrorCode.InvalidConfig);
            }
            validateDependencies(module);
            if (detectCircularDependencies(module.id, new Set(), new Set())) {
                throw new FrameworkError(`Circular dependency detected in module ${module.id}`, ErrorCode.CircularDependency, { moduleId: module.id });
            }
            modules.set(module.id, module);
        },
        async load(moduleId) {
            const module = modules.get(moduleId);
            if (!module) {
                throw new FrameworkError(`Module ${moduleId} not found`, ErrorCode.MissingDependency, {
                    moduleId,
                });
            }
            const loadOrder = getLoadOrder(moduleId);
            for (const id of loadOrder) {
                if (loaded.has(id))
                    continue;
                const mod = modules.get(id);
                if (!mod)
                    continue;
                if (mod.onStart) {
                    const result = await mod.onStart();
                    if (!result.success) {
                        throw new FrameworkError(`Failed to start module ${id}: ${result.error}`, ErrorCode.InitializationFailed, { moduleId: id });
                    }
                }
                loaded.add(id);
            }
            return module;
        },
        async loadAll() {
            const toLoad = Array.from(modules.keys()).filter((id) => !loaded.has(id));
            for (const moduleId of toLoad) {
                await this.load(moduleId);
            }
        },
        get(moduleId) {
            return modules.get(moduleId);
        },
        async unload(moduleId) {
            if (!loaded.has(moduleId)) {
                return;
            }
            const dependents = Array.from(modules.values()).filter((m) => m.dependencies.includes(moduleId));
            for (const dependent of dependents) {
                await this.unload(dependent.id);
            }
            const module = modules.get(moduleId);
            if (module?.onStop) {
                await module.onStop();
            }
            loaded.delete(moduleId);
        },
        isLoaded(moduleId) {
            return loaded.has(moduleId);
        },
        getAll() {
            return Array.from(modules.values());
        },
        clear() {
            modules.clear();
            loaded.clear();
        },
    });
}
//# sourceMappingURL=module.js.map