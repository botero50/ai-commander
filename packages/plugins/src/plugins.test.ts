/**
 * Plugin System Tests
 *
 * Tests for plugin management
 * - Plugin registration and unregistration
 * - Plugin execution
 * - Plugin discovery
 * - Plugin lifecycle
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface Plugin {
  name: string;
  version: string;
  execute: (input: unknown) => unknown;
}

class MockPluginManager {
  private plugins: Map<string, Plugin> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
  }

  unregister(name: string): boolean {
    return this.plugins.delete(name);
  }

  execute(name: string, input: unknown): unknown {
    const plugin = this.plugins.get(name);
    if (!plugin) return null;
    return plugin.execute(input);
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  getPluginCount(): number {
    return this.plugins.size;
  }

  getPluginVersion(name: string): string | undefined {
    return this.plugins.get(name)?.version;
  }
}

describe('PluginManager', () => {
  let manager: MockPluginManager;

  beforeEach(() => {
    manager = new MockPluginManager();
  });

  describe('Plugin Registration', () => {
    it('should register plugin', () => {
      manager.register({
        name: 'plugin1',
        version: '1.0.0',
        execute: (x) => x,
      });

      expect(manager.hasPlugin('plugin1')).toBe(true);
    });

    it('should register multiple plugins', () => {
      for (let i = 0; i < 5; i++) {
        manager.register({
          name: `plugin${i}`,
          version: '1.0.0',
          execute: (x) => x,
        });
      }

      expect(manager.getPluginCount()).toBe(5);
    });

    it('should store plugin version', () => {
      manager.register({
        name: 'versioned',
        version: '2.5.3',
        execute: (x) => x,
      });

      expect(manager.getPluginVersion('versioned')).toBe('2.5.3');
    });

    it('should replace existing plugin', () => {
      manager.register({
        name: 'plugin',
        version: '1.0.0',
        execute: (x: any) => x * 2,
      });

      manager.register({
        name: 'plugin',
        version: '2.0.0',
        execute: (x: any) => x * 3,
      });

      const result = manager.execute('plugin', 5);
      expect(result).toBe(15);
    });
  });

  describe('Plugin Execution', () => {
    it('should execute plugin', () => {
      manager.register({
        name: 'doubler',
        version: '1.0.0',
        execute: (x: any) => x * 2,
      });

      const result = manager.execute('doubler', 5);
      expect(result).toBe(10);
    });

    it('should return null for non-existent plugin', () => {
      const result = manager.execute('missing', 42);
      expect(result).toBeNull();
    });

    it('should pass input to plugin', () => {
      manager.register({
        name: 'echo',
        version: '1.0.0',
        execute: (x) => x,
      });

      expect(manager.execute('echo', 'hello')).toBe('hello');
      expect(manager.execute('echo', { data: 1 })).toEqual({ data: 1 });
    });

    it('should support plugin chains', () => {
      manager.register({
        name: 'add5',
        version: '1.0.0',
        execute: (x: any) => x + 5,
      });

      manager.register({
        name: 'multiply2',
        version: '1.0.0',
        execute: (x: any) => x * 2,
      });

      let result = 10;
      result = manager.execute('add5', result) as number;
      result = manager.execute('multiply2', result) as number;

      expect(result).toBe(30);
    });
  });

  describe('Plugin Management', () => {
    it('should unregister plugin', () => {
      manager.register({
        name: 'temp',
        version: '1.0.0',
        execute: (x) => x,
      });

      expect(manager.hasPlugin('temp')).toBe(true);
      manager.unregister('temp');
      expect(manager.hasPlugin('temp')).toBe(false);
    });

    it('should return false for non-existent unregister', () => {
      const result = manager.unregister('missing');
      expect(result).toBe(false);
    });

    it('should list all plugins', () => {
      manager.register({
        name: 'p1',
        version: '1.0.0',
        execute: (x) => x,
      });

      manager.register({
        name: 'p2',
        version: '1.0.0',
        execute: (x) => x,
      });

      const plugins = manager.getPlugins();
      expect(plugins.map(p => p.name)).toContain('p1');
      expect(plugins.map(p => p.name)).toContain('p2');
    });
  });

  describe('Performance', () => {
    it('should handle 100 plugins', () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        manager.register({
          name: `p${i}`,
          version: '1.0.0',
          execute: (x: any) => x + i,
        });
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(manager.getPluginCount()).toBe(100);
    });

    it('should execute plugins quickly', () => {
      manager.register({
        name: 'fast',
        version: '1.0.0',
        execute: (x: any) => x * 2,
      });

      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        manager.execute('fast', i);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null execution result', () => {
      manager.register({
        name: 'null-plugin',
        version: '1.0.0',
        execute: () => null,
      });

      expect(manager.execute('null-plugin', {})).toBeNull();
    });

    it('should handle undefined execution result', () => {
      manager.register({
        name: 'undefined-plugin',
        version: '1.0.0',
        execute: () => undefined,
      });

      expect(manager.execute('undefined-plugin', {})).toBeUndefined();
    });
  });
});
