import type { Lifecycle } from './lifecycle.js';
import { FrameworkError, ErrorCode } from './error.js';

/**
 * Module that can be loaded into the framework.
 * Modules have dependencies, versions, and lifecycle hooks.
 */
export interface Module extends Partial<Lifecycle> {
  /**
   * Unique identifier for this module.
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
   * IDs of modules this module depends on.
   */
  readonly dependencies: readonly string[];

  /**
   * Module metadata.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Registry for loading and managing modules.
 * Handles dependency resolution and lifecycle.
 */
export interface ModuleRegistry {
  /**
   * Register a module.
   */
  register(module: Module): void;

  /**
   * Load a module and its dependencies.
   */
  load(moduleId: string): Promise<Module>;

  /**
   * Load all registered modules.
   */
  loadAll(): Promise<void>;

  /**
   * Get a loaded module.
   */
  get(moduleId: string): Module | undefined;

  /**
   * Unload a module and its dependents.
   */
  unload(moduleId: string): Promise<void>;

  /**
   * Check if a module is loaded.
   */
  isLoaded(moduleId: string): boolean;

  /**
   * Get all loaded modules.
   */
  getAll(): readonly Module[];

  /**
   * Clear all modules.
   */
  clear(): void;
}

/**
 * Create a ModuleRegistry instance.
 */
export function createModuleRegistry(): ModuleRegistry {
  const modules = new Map<string, Module>();
  const loaded = new Set<string>();

  function validateDependencies(module: Module): void {
    for (const dep of module.dependencies) {
      if (!modules.has(dep)) {
        throw new FrameworkError(
          `Module ${module.id} depends on ${dep} which is not registered`,
          ErrorCode.MissingDependency,
          { moduleId: module.id, missingDep: dep }
        );
      }
    }
  }

  function detectCircularDependencies(
    id: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    visited.add(id);
    recursionStack.add(id);

    const module = modules.get(id);
    if (!module) return false;

    for (const dep of module.dependencies) {
      if (!visited.has(dep)) {
        if (detectCircularDependencies(dep, visited, recursionStack)) {
          return true;
        }
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    recursionStack.delete(id);
    return false;
  }

  function getLoadOrder(moduleId: string): string[] {
    const order: string[] = [];
    const visited = new Set<string>();

    function visit(id: string): void {
      if (visited.has(id)) return;
      visited.add(id);

      const module = modules.get(id);
      if (!module) return;

      for (const dep of module.dependencies) {
        visit(dep);
      }

      order.push(id);
    }

    visit(moduleId);
    return order;
  }

  return Object.freeze({
    register(module: Module): void {
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
        throw new FrameworkError(
          `Circular dependency detected in module ${module.id}`,
          ErrorCode.CircularDependency,
          { moduleId: module.id }
        );
      }

      modules.set(module.id, module);
    },

    async load(moduleId: string): Promise<Module> {
      const module = modules.get(moduleId);
      if (!module) {
        throw new FrameworkError(`Module ${moduleId} not found`, ErrorCode.MissingDependency, {
          moduleId,
        });
      }

      const loadOrder = getLoadOrder(moduleId);

      for (const id of loadOrder) {
        if (loaded.has(id)) continue;

        const mod = modules.get(id);
        if (!mod) continue;

        if (mod.onStart) {
          const result = await mod.onStart();
          if (!result.success) {
            throw new FrameworkError(
              `Failed to start module ${id}: ${result.error}`,
              ErrorCode.InitializationFailed,
              { moduleId: id }
            );
          }
        }

        loaded.add(id);
      }

      return module;
    },

    async loadAll(): Promise<void> {
      const toLoad = Array.from(modules.keys()).filter((id) => !loaded.has(id));

      for (const moduleId of toLoad) {
        await this.load(moduleId);
      }
    },

    get(moduleId: string): Module | undefined {
      return modules.get(moduleId);
    },

    async unload(moduleId: string): Promise<void> {
      if (!loaded.has(moduleId)) {
        return;
      }

      const dependents = Array.from(modules.values()).filter((m) =>
        m.dependencies.includes(moduleId)
      );

      for (const dependent of dependents) {
        await this.unload(dependent.id);
      }

      const module = modules.get(moduleId);
      if (module?.onStop) {
        await module.onStop();
      }

      loaded.delete(moduleId);
    },

    isLoaded(moduleId: string): boolean {
      return loaded.has(moduleId);
    },

    getAll(): readonly Module[] {
      return Array.from(modules.values());
    },

    clear(): void {
      modules.clear();
      loaded.clear();
    },
  });
}
