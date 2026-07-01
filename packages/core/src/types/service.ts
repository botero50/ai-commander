import type { Factory, AsyncFactory } from './factory.js';
import type { Lifecycle } from './lifecycle.js';
import { FrameworkError, ErrorCode } from './error.js';

/**
 * Service instance with optional lifecycle hooks.
 */
export type Service = Partial<Lifecycle> & { [key: string]: unknown };

/**
 * Service definition in the registry.
 */
interface ServiceDefinition {
  factory: Factory<Service> | AsyncFactory<Service>;
  dependencies: string[];
  instance?: Service;
  isAsync: boolean;
}

/**
 * Registry for services with dependency injection and lifecycle management.
 */
export interface ServiceRegistry {
  /**
   * Register a service factory.
   */
  register(
    id: string,
    factory: Factory<Service> | AsyncFactory<Service>,
    dependencies?: string[]
  ): void;

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
export function createServiceRegistry(): ServiceRegistry {
  const definitions = new Map<string, ServiceDefinition>();
  const startedServices: Service[] = [];

  function isAsyncFactory(factory: Factory<Service> | AsyncFactory<Service>): boolean {
    return factory.constructor.name === 'AsyncFunction';
  }

  function detectCircularDependencies(
    id: string,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
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
      } else if (recursionStack.has(dep)) {
        return true;
      }
    }

    recursionStack.delete(id);
    return false;
  }

  return Object.freeze({
    register(
      id: string,
      factory: Factory<Service> | AsyncFactory<Service>,
      dependencies: string[] = []
    ): void {
      if (!id || id.length === 0) {
        throw new FrameworkError('Service id cannot be empty', ErrorCode.InvalidConfig);
      }

      if (detectCircularDependencies(id, new Set(), new Set())) {
        throw new FrameworkError(
          `Circular dependency detected for service ${id}`,
          ErrorCode.CircularDependency,
          { serviceId: id }
        );
      }

      definitions.set(id, {
        factory,
        dependencies,
        isAsync: isAsyncFactory(factory),
      });
    },

    get(id: string): Service | undefined {
      const def = definitions.get(id);
      if (!def) {
        return undefined;
      }

      if (def.isAsync) {
        throw new FrameworkError(
          `Cannot call get() on async service ${id}. Use getAsync() instead.`,
          ErrorCode.NotSupported,
          { serviceId: id }
        );
      }

      if (!def.instance) {
        def.instance = (def.factory as Factory<Service>)();
      }

      return def.instance;
    },

    async getAsync(id: string): Promise<Service | undefined> {
      const def = definitions.get(id);
      if (!def) {
        return undefined;
      }

      if (!def.instance) {
        if (def.isAsync) {
          def.instance = await (def.factory as AsyncFactory<Service>)();
        } else {
          def.instance = (def.factory as Factory<Service>)();
        }
      }

      return def.instance;
    },

    has(id: string): boolean {
      return definitions.has(id);
    },

    async startAll(): Promise<void> {
      for (const def of definitions.values()) {
        if (!def.instance) {
          if (def.isAsync) {
            def.instance = await (def.factory as AsyncFactory<Service>)();
          } else {
            def.instance = (def.factory as Factory<Service>)();
          }
        }

        if (def.instance && def.instance.onStart) {
          await def.instance.onStart();
          startedServices.push(def.instance);
        }
      }
    },

    async stopAll(): Promise<void> {
      for (let i = startedServices.length - 1; i >= 0; i--) {
        const service = startedServices[i];
        if (service && service.onStop) {
          await service.onStop();
        }
      }
      startedServices.length = 0;
    },

    clear(): void {
      definitions.clear();
      startedServices.length = 0;
    },
  });
}
