import type { Lifecycle } from './lifecycle.js';
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
export declare function createModuleRegistry(): ModuleRegistry;
//# sourceMappingURL=module.d.ts.map