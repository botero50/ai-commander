// Core module - Framework infrastructure and abstractions

// Lifecycle types and functions
export type { StartupResult, ShutdownResult, Lifecycle } from './types/lifecycle.js';
export {
  createStartupSuccess,
  createStartupFailure,
  createShutdownSuccess,
  createShutdownFailure,
} from './types/lifecycle.js';

// Error types and codes
export { ErrorCode, FrameworkError, isFrameworkError } from './types/error.js';

// Disposable types and utilities
export type { Disposable, AsyncDisposable } from './types/disposable.js';
export { isDisposable, isAsyncDisposable, disposeAll } from './types/disposable.js';

// Factory types and utilities
export type { Factory, AsyncFactory } from './types/factory.js';
export { isFactory, isAsyncFactory } from './types/factory.js';

// Context types and functions
export type { Context, RequestContext } from './types/context.js';
export { createContext, createRequestContext } from './types/context.js';

// Event types and functions
export type { EventListener, EventBus } from './types/event.js';
export { createEventBus } from './types/event.js';

// Clock types and functions
export type { Clock } from './types/clock.js';
export { createRealtimeClock, createGameClock } from './types/clock.js';

// Scheduler types and functions
export type { ScheduledTaskConfig, ScheduledTask, Scheduler } from './types/scheduler.js';
export { createScheduler } from './types/scheduler.js';

// Service types and functions
export type { Service, ServiceRegistry } from './types/service.js';
export { createServiceRegistry } from './types/service.js';

// Module types and functions
export type { Module, ModuleRegistry } from './types/module.js';
export { createModuleRegistry } from './types/module.js';

// Plugin types and functions
export type { Plugin, PluginRegistry } from './types/plugin.js';
export { createPluginRegistry } from './types/plugin.js';

// Configuration types and functions
export type { ConfigManager, ConfigSchema, ConfigValue } from './types/config.js';
export { createConfigManager } from './types/config.js';
