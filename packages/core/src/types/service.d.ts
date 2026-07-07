import type { Factory, AsyncFactory } from './factory.js';
import type { Lifecycle } from './lifecycle.js';
/**
 * Service instance with optional lifecycle hooks.
 */
export type Service = Partial<Lifecycle> & {
    [key: string]: unknown;
};
/**
 * Registry for services with dependency injection and lifecycle management.
 */
export interface ServiceRegistry {
    /**
     * Register a service factory.
     */
    register(id: string, factory: Factory<Service> | AsyncFactory<Service>, dependencies?: string[]): void;
    /**
     * Get a service instance, creating it if necessary.
     */
    get(id: string): Service | undefined;
    /**
     * Get a service instance, creating it if necessary (async).
     */
    getAsync(id: string): Promise<Service | undefined>;
    /**
     * Check if a service is registered.
     */
    has(id: string): boolean;
    /**
     * Start all registered services with lifecycle hooks.
     */
    startAll(): Promise<void>;
    /**
     * Stop all registered services with lifecycle hooks.
     */
    stopAll(): Promise<void>;
    /**
     * Clear all services.
     */
    clear(): void;
}
/**
 * Create a ServiceRegistry instance.
 */
export declare function createServiceRegistry(): ServiceRegistry;
//# sourceMappingURL=service.d.ts.map