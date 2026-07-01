# @ai-commander/core

Core framework infrastructure and abstractions for AI Commander.

The Core package provides foundational infrastructure that every higher layer depends upon. It contains no game logic, AI logic, or domain-specific concepts—only pure framework abstractions.

## Purpose

Core enables the higher layers (Engine, Planner, Decision, Strategy) to:

- Manage component lifecycle (startup, shutdown)
- Handle errors with structured error codes
- Manage resources with proper cleanup
- Publish and subscribe to events
- Manage time (realtime or game time)
- Schedule tasks
- Register and retrieve services
- Load and manage modules
- Load and manage plugins
- Manage configuration

## Core Concepts

### Lifecycle Management

Components implement `Lifecycle` to participate in startup and shutdown:

```typescript
import { Lifecycle, createStartupSuccess } from '@ai-commander/core';

const component: Lifecycle = {
  onStart: async () => {
    console.log('Starting...');
    return createStartupSuccess({ initialized: true });
  },
  onStop: async () => {
    console.log('Shutting down...');
    return createShutdownSuccess();
  },
};
```

### Error Handling

Framework errors use structured error codes for categorization:

```typescript
import { FrameworkError, ErrorCode } from '@ai-commander/core';

throw new FrameworkError('Service initialization failed', ErrorCode.InitializationFailed, {
  serviceId: 'auth-service',
});
```

### Disposable Resources

Clean up resources safely:

```typescript
import { Disposable, disposeAll } from '@ai-commander/core';

const resources: Disposable[] = [
  { dispose: () => console.log('Cleanup 1') },
  { dispose: () => console.log('Cleanup 2') },
];

await disposeAll(resources);
```

### Event Bus

Publish and subscribe to events with type safety:

```typescript
import { createEventBus } from '@ai-commander/core';

const bus = createEventBus();

// Subscribe to events
bus.subscribe('user-login', (event: { userId: string }) => {
  console.log(`User logged in: ${event.userId}`);
});

// Publish events
await bus.publish('user-login', { userId: 'alice' });
```

### Clock Abstraction

Abstract time representation (realtime or game time):

```typescript
import { createGameClock } from '@ai-commander/core';

const clock = createGameClock(0);

console.log(clock.now()); // 0
clock.advance(5);
console.log(clock.now()); // 5
```

### Scheduler

Schedule tasks to execute at specific times:

```typescript
import { createGameClock, createScheduler } from '@ai-commander/core';

const clock = createGameClock();
const scheduler = createScheduler(clock);

scheduler.schedule(
  'task-1',
  () => {
    console.log('Executing task 1');
  },
  5
);

// Advance time and tick scheduler
clock.advance(5);
await scheduler.tick(); // Task executes
```

### Service Registry

Register and retrieve services with dependency injection:

```typescript
import { createServiceRegistry } from '@ai-commander/core';

const registry = createServiceRegistry();

// Register services
registry.register('config', () => ({ port: 8080 }));
registry.register('database', () => ({ connected: true }), ['config']);

// Retrieve services
const config = registry.get('config');
const db = registry.get('database');

// Manage lifecycle
await registry.startAll();
await registry.stopAll();
```

### Module System

Load modules with dependency resolution:

```typescript
import { createModuleRegistry } from '@ai-commander/core';

const registry = createModuleRegistry();

registry.register({
  id: 'auth-module',
  name: 'Authentication',
  version: '1.0.0',
  dependencies: [],
  onStart: async () => {
    console.log('Auth module started');
    return { success: true };
  },
});

await registry.load('auth-module');
```

### Plugin System

Load plugins dynamically:

```typescript
import { createPluginRegistry } from '@ai-commander/core';

const registry = createPluginRegistry();

registry.register('analytics-plugin', () => ({
  id: 'analytics-plugin',
  name: 'Analytics',
  version: '1.0.0',
  onStart: async () => {
    console.log('Analytics plugin initialized');
    return { success: true };
  },
}));

await registry.loadAll();
```

### Configuration Management

Manage application configuration:

```typescript
import { createConfigManager } from '@ai-commander/core';

const config = createConfigManager({
  debug: true,
  port: 8080,
});

config.set('version', '1.0.0');
config.merge({ timeout: 5000 });

console.log(config.get('debug')); // true
console.log(config.getOrDefault('missing', 'default')); // 'default'

// Validate configuration
config.validate({
  port: { required: true, validate: (v) => typeof v === 'number' },
});
```

### Context Tracking

Track execution context for tracing and debugging:

```typescript
import { createContext, createRequestContext } from '@ai-commander/core';

const ctx = createContext('op-123', {
  userId: 'alice',
  source: 'web',
});

const req = createRequestContext('req-456', 'POST', '/api/users', '127.0.0.1');
console.log(req.method); // POST
console.log(req.path); // /api/users
```

## What Core Contains

- **Lifecycle Management**: Start/stop hooks, initialization
- **Error Handling**: FrameworkError, error codes, error context
- **Resource Management**: Disposable pattern, cleanup utilities
- **Factories**: Abstract creation interfaces
- **Events**: Type-safe event bus with subscribers
- **Time**: Clock abstraction (realtime and game time)
- **Scheduling**: Task scheduling with cancelation
- **Services**: Dependency injection container with lifecycle
- **Modules**: Module loading with dependency resolution
- **Plugins**: Plugin system with dynamic loading
- **Configuration**: Type-safe config management
- **Context**: Execution context for tracing

## What Core Does NOT Contain

- Game logic or game-specific concepts
- AI algorithms or decision-making
- Planning or strategy logic
- ECS (Entity Component System)
- Rendering or graphics
- Network code
- Persistence or serialization
- Domain models (those are in @ai-commander/domain)

## Design Principles

### Pure Infrastructure

Core provides only framework abstractions. It never imports game logic, domain concepts, or higher-layer code.

### Immutability

All created objects are frozen. State changes create new instances.

### Lifecycle-Aware

Components can hook into startup and shutdown for proper initialization and cleanup.

### Type Safe

Full TypeScript strict mode. Type guards for runtime type checking.

### Dependency Direction

Core depends on: Nothing (only standard library)
Higher layers depend on: Core

## Architecture

Core sits at the foundation of the AI Commander architecture:

```
Applications
    ↓
Strategy Layer
    ↓
Planner Layer
    ↓
Decision Layer
    ↓
Engine Layer
    ↓
Core Layer (this package)
    ↓
Domain Layer (separate package)
```

Every layer above Core can depend on Core. Core depends on no other AI Commander packages.

## Examples

### Complete Application Lifecycle

```typescript
import {
  createServiceRegistry,
  createModuleRegistry,
  createPluginRegistry,
} from '@ai-commander/core';

const services = createServiceRegistry();
const modules = createModuleRegistry();
const plugins = createPluginRegistry();

// Register components
services.register('config', () => ({
  onStart: async () => {
    console.log('Loading config...');
    return { success: true };
  },
}));

modules.register({
  id: 'core-module',
  name: 'Core',
  version: '1.0.0',
  dependencies: [],
});

plugins.register('analytics', () => ({
  id: 'analytics',
  name: 'Analytics',
  version: '1.0.0',
}));

// Initialize application
try {
  await services.startAll();
  await modules.loadAll();
  await plugins.loadAll();
  console.log('Application started');
} catch (error) {
  console.error('Startup failed:', error);
  await services.stopAll();
  process.exit(1);
}
```

### Event-Driven Gameplay

```typescript
import { createEventBus } from '@ai-commander/core';

const events = createEventBus();

// Game event handling
events.subscribe('agent-spawned', async (event) => {
  console.log(`Agent spawned: ${event.agentId}`);
});

events.subscribe('resource-gathered', async (event) => {
  console.log(`Resource gathered: ${event.amount} ${event.type}`);
});

// Publish game events
await events.publish('agent-spawned', { agentId: 'agent-1' });
await events.publish('resource-gathered', { amount: 100, type: 'gold' });
```

## Testing

Core provides immutable value objects and frozen interfaces making it easy to test:

```typescript
import { createContext, createConfigManager } from '@ai-commander/core';

const ctx = createContext('test-1');
const config = createConfigManager({ debug: true });

expect(ctx.id).toBe('test-1');
expect(config.get('debug')).toBe(true);
```

## Versioning

Core follows semantic versioning:

- **MAJOR**: Breaking changes to public API (removed types, signature changes)
- **MINOR**: New exports, new optional parameters, backward compatible
- **PATCH**: Bug fixes, internal improvements

All public APIs exported from `index.ts` are stable within a major version.

## Related Documentation

- [Architecture Overview](../../.foundation/docs/ARCHITECTURE.md)
- [ADR-0001: Repository Architecture](../../.foundation/adr/adr-0001.md)
- [ADR-0002: Dependency Direction](../../.foundation/adr/adr-0002.md)
- [@ai-commander/domain](../domain) - Game-agnostic domain models
