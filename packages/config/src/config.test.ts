/**
 * Configuration Management Tests
 *
 * Tests for application configuration handling
 * - Config loading and validation
 * - Environment variable handling
 * - Config merging and overrides
 * - Schema validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

interface ConfigValue {
  [key: string]: unknown;
}

interface ConfigSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required?: boolean;
  defaultValue?: unknown;
}

class MockConfigManager {
  private config: ConfigValue = {};
  private schema: Map<string, ConfigSchema> = new Map();
  private env: Record<string, string> = {};

  registerSchema(key: string, schema: ConfigSchema): void {
    this.schema.set(key, schema);
  }

  set(key: string, value: unknown): void {
    this.config[key] = value;
  }

  get(key: string): unknown {
    return this.config[key];
  }

  loadFromEnv(prefix: string = ''): void {
    for (const [key, value] of Object.entries(this.env)) {
      if (prefix && !key.startsWith(prefix)) continue;
      const configKey = prefix ? key.substring(prefix.length).toLowerCase() : key.toLowerCase();
      this.config[configKey] = value;
    }
  }

  setEnv(key: string, value: string): void {
    this.env[key] = value;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, schema] of this.schema.entries()) {
      const value = this.config[key];

      if (schema.required && value === undefined) {
        errors.push(`Missing required config: ${key}`);
      }

      if (value !== undefined) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== schema.type && !(schema.type === 'object' && actualType === 'object')) {
          errors.push(`Invalid type for ${key}: expected ${schema.type}, got ${actualType}`);
        }
      }

      if (value === undefined && schema.defaultValue !== undefined) {
        this.config[key] = schema.defaultValue;
      }
    }

    return { valid: errors.length === 0, errors };
  }

  merge(overrides: ConfigValue): void {
    this.config = { ...this.config, ...overrides };
  }

  getAll(): ConfigValue {
    return { ...this.config };
  }

  clear(): void {
    this.config = {};
  }

  getSchemaKeys(): string[] {
    return Array.from(this.schema.keys());
  }

  hasKey(key: string): boolean {
    return key in this.config;
  }

  getType(key: string): string | undefined {
    return this.schema.get(key)?.type;
  }
}

describe('ConfigManager', () => {
  let config: MockConfigManager;

  beforeEach(() => {
    config = new MockConfigManager();
  });

  describe('Configuration Basics', () => {
    it('should set and get config values', () => {
      config.set('database.host', 'localhost');
      expect(config.get('database.host')).toBe('localhost');
    });

    it('should handle multiple values', () => {
      config.set('host', 'localhost');
      config.set('port', 3000);
      config.set('debug', true);

      expect(config.get('host')).toBe('localhost');
      expect(config.get('port')).toBe(3000);
      expect(config.get('debug')).toBe(true);
    });

    it('should return all config', () => {
      config.set('a', 1);
      config.set('b', 2);

      const all = config.getAll();
      expect(all.a).toBe(1);
      expect(all.b).toBe(2);
    });

    it('should clear all config', () => {
      config.set('key1', 'value1');
      config.set('key2', 'value2');

      config.clear();
      expect(config.getAll()).toEqual({});
    });
  });

  describe('Schema Registration', () => {
    it('should register schema', () => {
      config.registerSchema('port', {
        name: 'port',
        type: 'number',
        required: true,
        defaultValue: 3000,
      });

      expect(config.getSchemaKeys()).toContain('port');
    });

    it('should register multiple schemas', () => {
      config.registerSchema('host', {
        name: 'host',
        type: 'string',
        required: true,
      });
      config.registerSchema('port', {
        name: 'port',
        type: 'number',
        required: false,
      });

      expect(config.getSchemaKeys()).toHaveLength(2);
    });

    it('should get schema type', () => {
      config.registerSchema('timeout', {
        name: 'timeout',
        type: 'number',
        required: false,
      });

      expect(config.getType('timeout')).toBe('number');
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      config.registerSchema('host', {
        name: 'host',
        type: 'string',
        required: true,
      });
      config.registerSchema('port', {
        name: 'port',
        type: 'number',
        required: false,
        defaultValue: 3000,
      });
    });

    it('should validate required fields', () => {
      const result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('host'))).toBe(true);
    });

    it('should pass validation with required fields', () => {
      config.set('host', 'localhost');
      const result = config.validate();
      expect(result.valid).toBe(true);
    });

    it('should apply default values', () => {
      config.set('host', 'localhost');
      config.validate();

      expect(config.get('port')).toBe(3000);
    });

    it('should validate types', () => {
      config.set('host', 'localhost');
      config.set('port', 'invalid');

      const result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('port'))).toBe(true);
    });
  });

  describe('Environment Variable Handling', () => {
    it('should load from environment', () => {
      config.setEnv('DATABASE_HOST', 'db.example.com');
      config.setEnv('DATABASE_PORT', '5432');

      config.loadFromEnv('DATABASE_');

      expect(config.hasKey('host')).toBe(true);
      expect(config.hasKey('port')).toBe(true);
    });

    it('should handle env prefix', () => {
      config.setEnv('APP_DEBUG', 'true');
      config.setEnv('OTHER_DEBUG', 'false');

      config.loadFromEnv('APP_');

      expect(config.get('debug')).toBe('true');
    });

    it('should load all env without prefix', () => {
      config.setEnv('HOST', 'localhost');
      config.setEnv('PORT', '3000');

      config.loadFromEnv();

      expect(config.hasKey('host')).toBe(true);
      expect(config.hasKey('port')).toBe(true);
    });
  });

  describe('Config Merging', () => {
    it('should merge override values', () => {
      config.set('name', 'app');
      config.set('version', '1.0.0');

      config.merge({ version: '2.0.0', debug: true });

      expect(config.get('name')).toBe('app');
      expect(config.get('version')).toBe('2.0.0');
      expect(config.get('debug')).toBe(true);
    });

    it('should preserve existing values not in overrides', () => {
      config.set('a', 1);
      config.set('b', 2);

      config.merge({ b: 20 });

      expect(config.get('a')).toBe(1);
      expect(config.get('b')).toBe(20);
    });

    it('should handle empty merge', () => {
      config.set('key', 'value');
      config.merge({});

      expect(config.get('key')).toBe('value');
    });
  });

  describe('Type Handling', () => {
    beforeEach(() => {
      config.registerSchema('string_val', {
        name: 'string_val',
        type: 'string',
      });
      config.registerSchema('number_val', {
        name: 'number_val',
        type: 'number',
      });
      config.registerSchema('boolean_val', {
        name: 'boolean_val',
        type: 'boolean',
      });
    });

    it('should validate string type', () => {
      config.set('string_val', 'test');
      const result = config.validate();
      expect(result.valid).toBe(true);
    });

    it('should validate number type', () => {
      config.set('number_val', 42);
      const result = config.validate();
      expect(result.valid).toBe(true);
    });

    it('should validate boolean type', () => {
      config.set('boolean_val', true);
      const result = config.validate();
      expect(result.valid).toBe(true);
    });

    it('should reject wrong types', () => {
      config.set('string_val', 123);
      const result = config.validate();
      expect(result.valid).toBe(false);
    });
  });

  describe('Complex Scenarios', () => {
    it('should support full config workflow', () => {
      // Register schema
      config.registerSchema('host', {
        name: 'host',
        type: 'string',
        required: true,
      });
      config.registerSchema('port', {
        name: 'port',
        type: 'number',
        required: false,
        defaultValue: 3000,
      });

      // Load from environment
      config.setEnv('HOST', 'localhost');
      config.loadFromEnv();

      // Merge overrides
      config.merge({ port: 8080 });

      // Validate
      const result = config.validate();
      expect(result.valid).toBe(true);

      // Check values
      expect(config.get('host')).toBe('localhost');
      expect(config.get('port')).toBe(8080);
    });

    it('should handle nested objects', () => {
      config.registerSchema('database', {
        name: 'database',
        type: 'object',
      });

      const dbConfig = {
        host: 'localhost',
        port: 5432,
        name: 'mydb',
      };

      config.set('database', dbConfig);
      const result = config.validate();

      expect(result.valid).toBe(true);
      const db = config.get('database') as Record<string, unknown>;
      expect(db.host).toBe('localhost');
    });
  });

  describe('Performance', () => {
    it('should handle many config values', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        config.set(`key${i}`, `value${i}`);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(500);
      expect(config.getAll()).toHaveProperty('key999');
    });

    it('should validate large schemas efficiently', () => {
      for (let i = 0; i < 100; i++) {
        config.registerSchema(`param${i}`, {
          name: `param${i}`,
          type: 'string',
          required: i < 50,
        });
      }

      for (let i = 0; i < 50; i++) {
        config.set(`param${i}`, `value${i}`);
      }

      const start = Date.now();
      const result = config.validate();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });
});
