import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStartupSuccess,
  createStartupFailure,
  createShutdownSuccess,
  createShutdownFailure,
  FrameworkError,
  ErrorCode,
  isDisposable,
  isAsyncDisposable,
  disposeAll,
  isFactory,
  isAsyncFactory,
  createContext,
  createRequestContext,
  createEventBus,
  createRealtimeClock,
  createGameClock,
  createScheduler,
  createServiceRegistry,
  createModuleRegistry,
  createPluginRegistry,
  createConfigManager,
} from '../src/index.js';

describe('Core Infrastructure', () => {
  describe('Lifecycle', () => {
    it('should create startup success results', () => {
      const result = createStartupSuccess({ version: '1.0.0' });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metadata?.version).toBe('1.0.0');
      expect(Object.isFrozen(result)).toBe(true);
    });

    it('should create startup failure results', () => {
      const result = createStartupFailure('Init failed', { reason: 'timeout' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Init failed');
      expect(result.metadata?.reason).toBe('timeout');
    });

    it('should create shutdown success results', () => {
      const result = createShutdownSuccess();
      expect(result.success).toBe(true);
    });

    it('should create shutdown failure results', () => {
      const result = createShutdownFailure('Cleanup failed');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cleanup failed');
    });
  });

  describe('Error Handling', () => {
    it('should create framework errors with codes', () => {
      const error = new FrameworkError('Service not found', ErrorCode.ServiceNotFound, {
        serviceId: 'test',
      });
      expect(error.message).toBe('Service not found');
      expect(error.code).toBe(ErrorCode.ServiceNotFound);
      expect(error.context.serviceId).toBe('test');
    });

    it('should identify framework errors', () => {
      const error = new FrameworkError('Test');
      expect(FrameworkError.prototype.isPrototypeOf(error)).toBe(true);
    });

    it('should have all error codes', () => {
      expect(ErrorCode.Unknown).toBe('UNKNOWN');
      expect(ErrorCode.InvalidConfig).toBe('INVALID_CONFIG');
      expect(ErrorCode.ServiceNotFound).toBe('SERVICE_NOT_FOUND');
      expect(ErrorCode.CircularDependency).toBe('CIRCULAR_DEPENDENCY');
    });
  });

  describe('Disposable Resources', () => {
    it('should identify disposable objects', () => {
      const disposable = { dispose: () => {} };
      expect(isDisposable(disposable)).toBe(true);
      expect(isDisposable({})).toBe(false);
      expect(isDisposable(null)).toBe(false);
    });

    it('should identify async disposable objects', () => {
      const asyncDisposable = { dispose: async () => {} };
      expect(isAsyncDisposable(asyncDisposable)).toBe(true);
    });

    it('should dispose multiple resources', async () => {
      const disposed: string[] = [];
      const disposables = [
        {
          dispose: () => {
            disposed.push('first');
          },
        },
        {
          dispose: async () => {
            disposed.push('second');
          },
        },
      ];

      await disposeAll(disposables);
      expect(disposed).toEqual(['first', 'second']);
    });
  });

  describe('Factories', () => {
    it('should identify factory functions', () => {
      const factory = () => ({ id: '1' });
      expect(isFactory(factory)).toBe(true);
      expect(isFactory('not a factory')).toBe(false);
    });

    it('should identify async factory functions', () => {
      const asyncFactory = async () => ({ id: '1' });
      expect(isAsyncFactory(asyncFactory)).toBe(true);
    });
  });

  describe('Context', () => {
    it('should create contexts', () => {
      const ctx = createContext('ctx-1', { user: 'alice' });
      expect(ctx.id).toBe('ctx-1');
      expect(ctx.timestamp).toBeGreaterThan(0);
      expect(ctx.metadata.user).toBe('alice');
      expect(Object.isFrozen(ctx)).toBe(true);
    });

    it('should throw on empty context id', () => {
      expect(() => createContext('')).toThrow();
    });

    it('should create request contexts', () => {
      const ctx = createRequestContext('req-1', 'GET', '/api/users', '127.0.0.1');
      expect(ctx.id).toBe('req-1');
      expect(ctx.method).toBe('GET');
      expect(ctx.path).toBe('/api/users');
      expect(ctx.source).toBe('127.0.0.1');
    });
  });

  describe('EventBus', () => {
    it('should publish and subscribe to events', async () => {
      const bus = createEventBus();
      const events: unknown[] = [];

      bus.subscribe('test', (event) => {
        events.push(event);
      });

      await bus.publish('test', { id: 1 });
      expect(events).toEqual([{ id: 1 }]);
    });

    it('should support multiple subscribers', async () => {
      const bus = createEventBus();
      const events1: unknown[] = [];
      const events2: unknown[] = [];

      bus.subscribe('test', (event) => {
        events1.push(event);
      });
      bus.subscribe('test', (event) => {
        events2.push(event);
      });

      await bus.publish('test', 'data');
      expect(events1).toEqual(['data']);
      expect(events2).toEqual(['data']);
    });

    it('should unsubscribe from events', async () => {
      const bus = createEventBus();
      const events: unknown[] = [];

      const unsubscribe = bus.subscribe('test', (event) => {
        events.push(event);
      });

      await bus.publish('test', 1);
      unsubscribe();
      await bus.publish('test', 2);

      expect(events).toEqual([1]);
    });

    it('should check for subscribers', () => {
      const bus = createEventBus();
      expect(bus.hasSubscribers('test')).toBe(false);

      bus.subscribe('test', () => {});
      expect(bus.hasSubscribers('test')).toBe(true);
    });

    it('should throw on empty event type', () => {
      const bus = createEventBus();
      expect(() => bus.subscribe('', () => {})).toThrow();
    });
  });

  describe('Clock', () => {
    it('should create realtime clocks', () => {
      const clock = createRealtimeClock();
      const now1 = clock.now();
      expect(now1).toBeGreaterThan(0);

      // Advance is no-op for realtime
      clock.advance(1000);
      const now2 = clock.now();
      expect(now2).toBeGreaterThanOrEqual(now1);
    });

    it('should create game clocks', () => {
      const clock = createGameClock(0);
      expect(clock.now()).toBe(0);

      clock.advance(5);
      expect(clock.now()).toBe(5);

      clock.advance(10);
      expect(clock.now()).toBe(15);
    });

    it('should throw on invalid game clock tick', () => {
      expect(() => createGameClock(-1)).toThrow();
      expect(() => createGameClock(1.5)).toThrow();
    });

    it('should throw on invalid advance delta', () => {
      const clock = createGameClock();
      expect(() => clock.advance(-1)).toThrow();
      expect(() => clock.advance(1.5)).toThrow();
    });
  });

  describe('Scheduler', () => {
    it('should schedule and execute tasks', async () => {
      const clock = createGameClock();
      const scheduler = createScheduler(clock);
      const executed: string[] = [];

      scheduler.schedule(
        'task-1',
        () => {
          executed.push('task-1');
        },
        5
      );

      scheduler.schedule(
        'task-2',
        () => {
          executed.push('task-2');
        },
        10
      );

      await scheduler.tick();
      expect(executed).toEqual([]);

      clock.advance(5);
      await scheduler.tick();
      expect(executed).toEqual(['task-1']);

      clock.advance(5);
      await scheduler.tick();
      expect(executed).toEqual(['task-1', 'task-2']);
    });

    it('should cancel tasks', async () => {
      const clock = createGameClock();
      const scheduler = createScheduler(clock);
      const executed: string[] = [];

      const task = scheduler.schedule(
        'task-1',
        () => {
          executed.push('task-1');
        },
        5
      );

      expect(task.cancel()).toBe(true);
      clock.advance(5);
      await scheduler.tick();
      expect(executed).toEqual([]);
    });

    it('should check pending count', () => {
      const clock = createGameClock();
      const scheduler = createScheduler(clock);

      scheduler.schedule('task-1', () => {}, 5);
      scheduler.schedule('task-2', () => {}, 10);

      expect(scheduler.pendingCount()).toBe(2);
    });

    it('should clear all tasks', () => {
      const clock = createGameClock();
      const scheduler = createScheduler(clock);

      scheduler.schedule('task-1', () => {}, 5);
      scheduler.schedule('task-2', () => {}, 10);

      scheduler.clear();
      expect(scheduler.pendingCount()).toBe(0);
    });
  });

  describe('ServiceRegistry', () => {
    it('should register and retrieve services', () => {
      const registry = createServiceRegistry();
      registry.register('service-1', () => ({ id: '1' }));

      const service = registry.get('service-1');
      expect(service?.id).toBe('1');
    });

    it('should lazily instantiate services', () => {
      const registry = createServiceRegistry();
      let instantiated = false;

      registry.register('service-1', () => {
        instantiated = true;
        return { id: '1' };
      });

      expect(instantiated).toBe(false);
      registry.get('service-1');
      expect(instantiated).toBe(true);
    });

    it('should return undefined for missing services', () => {
      const registry = createServiceRegistry();
      expect(registry.get('missing')).toBeUndefined();
    });

    it('should support multiple services', () => {
      const registry = createServiceRegistry();
      registry.register('service-a', () => ({ id: 'a' }));
      registry.register('service-b', () => ({ id: 'b' }));

      expect(registry.has('service-a')).toBe(true);
      expect(registry.has('service-b')).toBe(true);
    });

    it('should handle lifecycle hooks', async () => {
      const registry = createServiceRegistry();
      const lifecycle: string[] = [];

      registry.register('service-1', () => ({
        onStart: async () => {
          lifecycle.push('start');
          return { success: true };
        },
        onStop: async () => {
          lifecycle.push('stop');
          return { success: true };
        },
      }));

      await registry.startAll();
      expect(lifecycle).toContain('start');

      await registry.stopAll();
      expect(lifecycle).toContain('stop');
    });
  });

  describe('ModuleRegistry', () => {
    it('should register and load modules', async () => {
      const registry = createModuleRegistry();
      registry.register({
        id: 'module-1',
        name: 'Module 1',
        version: '1.0.0',
        dependencies: [],
      });

      const module = await registry.load('module-1');
      expect(module.id).toBe('module-1');
      expect(registry.isLoaded('module-1')).toBe(true);
    });

    it('should respect module dependencies', async () => {
      const registry = createModuleRegistry();
      const loadOrder: string[] = [];

      registry.register({
        id: 'module-a',
        name: 'Module A',
        version: '1.0.0',
        dependencies: [],
        onStart: async () => {
          loadOrder.push('module-a');
          return { success: true };
        },
      });

      registry.register({
        id: 'module-b',
        name: 'Module B',
        version: '1.0.0',
        dependencies: ['module-a'],
        onStart: async () => {
          loadOrder.push('module-b');
          return { success: true };
        },
      });

      await registry.load('module-b');
      expect(loadOrder).toEqual(['module-a', 'module-b']);
    });

    it('should detect missing dependencies', () => {
      const registry = createModuleRegistry();
      expect(() => {
        registry.register({
          id: 'module-1',
          name: 'Module 1',
          version: '1.0.0',
          dependencies: ['missing-module'],
        });
      }).toThrow();
    });

    it('should enforce valid versions', () => {
      const registry = createModuleRegistry();
      expect(() => {
        registry.register({
          id: 'module-a',
          name: 'Module A',
          version: '',
          dependencies: [],
        });
      }).toThrow();
    });
  });

  describe('PluginRegistry', () => {
    it('should register and load plugins', async () => {
      const registry = createPluginRegistry();
      registry.register('plugin-1', () => ({
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
      }));

      const plugin = await registry.load('plugin-1');
      expect(plugin.id).toBe('plugin-1');
      expect(registry.isLoaded('plugin-1')).toBe(true);
    });

    it('should handle async plugin factories', async () => {
      const registry = createPluginRegistry();
      registry.register('plugin-1', async () => ({
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
      }));

      const plugin = await registry.load('plugin-1');
      expect(plugin.id).toBe('plugin-1');
    });

    it('should call plugin lifecycle hooks', async () => {
      const registry = createPluginRegistry();
      const lifecycle: string[] = [];

      registry.register('plugin-1', () => ({
        id: 'plugin-1',
        name: 'Plugin 1',
        version: '1.0.0',
        onStart: async () => {
          lifecycle.push('start');
          return { success: true };
        },
        onStop: async () => {
          lifecycle.push('stop');
          return { success: true };
        },
      }));

      await registry.load('plugin-1');
      expect(lifecycle).toContain('start');

      await registry.unload('plugin-1');
      expect(lifecycle).toContain('stop');
    });

    it('should not reload already loaded plugins', async () => {
      const registry = createPluginRegistry();
      let instantiations = 0;

      registry.register('plugin-1', () => {
        instantiations++;
        return {
          id: 'plugin-1',
          name: 'Plugin 1',
          version: '1.0.0',
        };
      });

      await registry.load('plugin-1');
      await registry.load('plugin-1');

      expect(instantiations).toBe(1);
    });
  });

  describe('ConfigManager', () => {
    it('should get and set configuration', () => {
      const config = createConfigManager();
      config.set('key', 'value');
      expect(config.get('key')).toBe('value');
    });

    it('should provide default values', () => {
      const config = createConfigManager();
      expect(config.getOrDefault('missing', 'default')).toBe('default');
    });

    it('should check key existence', () => {
      const config = createConfigManager();
      config.set('key', 'value');
      expect(config.has('key')).toBe(true);
      expect(config.has('missing')).toBe(false);
    });

    it('should merge configurations', () => {
      const config = createConfigManager({ a: 1 });
      config.merge({ b: 2, c: 3 });
      expect(config.get('a')).toBe(1);
      expect(config.get('b')).toBe(2);
      expect(config.get('c')).toBe(3);
    });

    it('should validate configurations', () => {
      const config = createConfigManager();
      config.set('port', 8080);

      expect(() => {
        config.validate({
          port: { required: true, validate: (v) => typeof v === 'number' },
        });
      }).not.toThrow();
    });

    it('should throw on missing required config', () => {
      const config = createConfigManager();
      expect(() => {
        config.validate({ port: { required: true } });
      }).toThrow();
    });

    it('should return all configuration', () => {
      const config = createConfigManager({ a: 1, b: 2 });
      const all = config.getAll();
      expect(all.a).toBe(1);
      expect(all.b).toBe(2);
      expect(Object.isFrozen(all)).toBe(true);
    });

    it('should clear configuration', () => {
      const config = createConfigManager({ a: 1 });
      config.clear();
      expect(config.has('a')).toBe(false);
    });
  });

  describe('Immutability', () => {
    it('should freeze all created objects', () => {
      const ctx = createContext('ctx-1');
      expect(Object.isFrozen(ctx)).toBe(true);

      const config = createConfigManager();
      expect(Object.isFrozen(config)).toBe(true);

      const bus = createEventBus();
      expect(Object.isFrozen(bus)).toBe(true);
    });
  });
});
