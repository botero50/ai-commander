import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRegistry, type ModelProfile } from './model-registry.js';
import { Logger } from '../config/logger.js';

describe('ModelRegistry', () => {
  let registry: ModelRegistry;
  const logger = new Logger('error');

  beforeEach(() => {
    registry = new ModelRegistry(logger);
  });

  describe('initialization', () => {
    it('should initialize with Petra built-in model', () => {
      const petra = registry.getModel('petra-builtin');
      expect(petra).toBeDefined();
      expect(petra?.name).toBe('Petra');
      expect(petra?.type).toBe('petra');
      expect(petra?.status).toBe('available');
    });

    it('should have Petra marked as available by default', () => {
      expect(registry.isAvailable('petra-builtin')).toBe(true);
    });
  });

  describe('registerModel', () => {
    it('should register a new model', () => {
      const profile: ModelProfile = {
        id: 'test-model',
        name: 'Test Model',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: { test: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      registry.registerModel(profile);
      const retrieved = registry.getModel('test-model');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Test Model');
    });

    it('should update createdAt and updatedAt', () => {
      const profile: ModelProfile = {
        id: 'test-model-2',
        name: 'Test Model 2',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 8192,
          streaming: false,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };

      registry.registerModel(profile);
      const retrieved = registry.getModel('test-model-2');

      expect(retrieved?.updatedAt).not.toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('getModel', () => {
    it('should return model by ID', () => {
      const petra = registry.getModel('petra-builtin');
      expect(petra?.id).toBe('petra-builtin');
    });

    it('should return null for non-existent model', () => {
      const model = registry.getModel('nonexistent');
      expect(model).toBeNull();
    });
  });

  describe('listModels', () => {
    it('should list all models', () => {
      const models = registry.listModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models.some(m => m.type === 'petra')).toBe(true);
    });

    it('should filter by type', () => {
      registry.registerModel({
        id: 'ollama-test',
        name: 'Test Ollama',
        type: 'ollama',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const ollamas = registry.listModels({ type: 'ollama' });
      expect(ollamas.every(m => m.type === 'ollama')).toBe(true);
    });

    it('should filter by status', () => {
      const available = registry.listModels({ status: 'available' });
      expect(available.every(m => m.status === 'available')).toBe(true);
    });

    it('should sort alphabetically', () => {
      registry.registerModel({
        id: 'aaa',
        name: 'AAA Model',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      registry.registerModel({
        id: 'zzz',
        name: 'ZZZ Model',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const models = registry.listModels();
      const names = models.map(m => m.name);

      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('updateStatus', () => {
    it('should update model status', () => {
      registry.updateStatus('petra-builtin', 'unavailable');
      const model = registry.getModel('petra-builtin');

      expect(model?.status).toBe('unavailable');
    });

    it('should update lastChecked timestamp', () => {
      const before = new Date();
      registry.updateStatus('petra-builtin', 'available');
      const model = registry.getModel('petra-builtin');

      const checked = model?.lastChecked ? new Date(model.lastChecked) : null;
      expect(checked).not.toBeNull();
      expect(checked! >= before).toBe(true);
    });

    it('should return false for non-existent model', () => {
      const result = registry.updateStatus('nonexistent', 'available');
      expect(result).toBe(false);
    });
  });

  describe('isAvailable', () => {
    it('should return true for available models', () => {
      expect(registry.isAvailable('petra-builtin')).toBe(true);
    });

    it('should return false for unavailable models', () => {
      registry.updateStatus('petra-builtin', 'unavailable');
      expect(registry.isAvailable('petra-builtin')).toBe(false);
    });

    it('should return false for non-existent models', () => {
      expect(registry.isAvailable('nonexistent')).toBe(false);
    });
  });

  describe('unregisterModel', () => {
    it('should remove a model', () => {
      registry.registerModel({
        id: 'to-remove',
        name: 'To Remove',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(registry.getModel('to-remove')).toBeDefined();

      const removed = registry.unregisterModel('to-remove');

      expect(removed).toBe(true);
      expect(registry.getModel('to-remove')).toBeNull();
    });

    it('should return false for non-existent model', () => {
      const removed = registry.unregisterModel('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('getModelsByType', () => {
    it('should return all models of a type', () => {
      registry.registerModel({
        id: 'custom-1',
        name: 'Custom 1',
        type: 'custom',
        status: 'available',
        capabilities: {
          contextWindow: 4096,
          streaming: true,
          functionCalling: false,
          multimodal: false,
        },
        metadata: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const custom = registry.getModelsByType('custom');
      expect(custom.length).toBeGreaterThan(0);
      expect(custom.every(m => m.type === 'custom')).toBe(true);
    });
  });

  describe('registerOpenAIModels', () => {
    it('should register OpenAI models', () => {
      registry.registerOpenAIModels('test-key');

      expect(registry.getModel('gpt-4')).toBeDefined();
      expect(registry.getModel('gpt-3.5-turbo')).toBeDefined();
    });

    it('should mark as available when API key provided', () => {
      registry.registerOpenAIModels('test-key');
      const model = registry.getModel('gpt-4');

      expect(model?.status).toBe('available');
    });

    it('should mark as unavailable without API key', () => {
      registry.registerOpenAIModels();
      const model = registry.getModel('gpt-4');

      expect(model?.status).toBe('unavailable');
    });
  });

  describe('registerClaudeModels', () => {
    it('should register Claude models', () => {
      registry.registerClaudeModels('test-key');

      expect(registry.getModel('claude-opus-4-8')).toBeDefined();
      expect(registry.getModel('claude-haiku-4-5')).toBeDefined();
    });

    it('should set provider as Anthropic', () => {
      registry.registerClaudeModels('test-key');
      const model = registry.getModel('claude-opus-4-8');

      expect(model?.provider).toBe('Anthropic');
    });
  });

  describe('registerGeminiModels', () => {
    it('should register Gemini models', () => {
      registry.registerGeminiModels('test-key');

      expect(registry.getModel('gemini-2.0-flash')).toBeDefined();
      expect(registry.getModel('gemini-2.0-pro')).toBeDefined();
    });

    it('should set provider as Google', () => {
      registry.registerGeminiModels('test-key');
      const model = registry.getModel('gemini-2.0-flash');

      expect(model?.provider).toBe('Google');
    });
  });

  describe('getStatistics', () => {
    it('should return registry statistics', () => {
      registry.registerOpenAIModels('test-key');
      registry.registerClaudeModels();

      const stats = registry.getStatistics();

      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.byType.petra).toBeGreaterThan(0);
      expect(stats.byType.openai).toBeGreaterThan(0);
      expect(stats.byType.claude).toBeGreaterThan(0);
    });

    it('should count available and unavailable', () => {
      registry.registerOpenAIModels('test-key');
      registry.registerClaudeModels(); // No API key

      const stats = registry.getStatistics();

      expect(stats.available).toBeGreaterThan(0);
      expect(stats.unavailable).toBeGreaterThan(0);
    });
  });

  describe('exportRegistry', () => {
    it('should export registry as JSON', () => {
      registry.registerOpenAIModels('test-key');

      const json = registry.exportRegistry();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.exportedAt).toBeDefined();
      expect(Array.isArray(data.models)).toBe(true);
    });

    it('should include all registered models', () => {
      registry.registerOpenAIModels('test-key');

      const json = registry.exportRegistry();
      const data = JSON.parse(json);

      expect(data.models.some((m: any) => m.id === 'petra-builtin')).toBe(true);
      expect(data.models.some((m: any) => m.id === 'gpt-4')).toBe(true);
    });
  });

  describe('importRegistry', () => {
    it('should import registry from JSON', () => {
      registry.registerOpenAIModels('test-key');
      const exported = registry.exportRegistry();

      // Create new registry and import
      const newRegistry = new ModelRegistry(logger);
      newRegistry.registerOpenAIModels('test-key'); // Add something

      const imported = newRegistry.importRegistry(exported);

      expect(imported).toBe(true);
      expect(newRegistry.getModel('petra-builtin')).toBeDefined();
      expect(newRegistry.getModel('gpt-4')).toBeDefined();
    });

    it('should return false for invalid JSON', () => {
      const imported = registry.importRegistry('invalid json');
      expect(imported).toBe(false);
    });

    it('should return false for wrong format', () => {
      const wrongFormat = JSON.stringify({
        version: '2.0',
        models: [],
      });

      const imported = registry.importRegistry(wrongFormat);
      expect(imported).toBe(false);
    });
  });

  describe('Ollama model detection', () => {
    it('should handle unreachable Ollama endpoint', async () => {
      const result = await registry.detectOllamaModels('http://localhost:9999');

      expect(result.found.length).toBe(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return ModelDetectionResult structure', async () => {
      const result = await registry.detectOllamaModels('http://localhost:11434');

      expect(result).toHaveProperty('found');
      expect(result).toHaveProperty('unavailable');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.found)).toBe(true);
    });
  });

  describe('Model capabilities', () => {
    it('should track context window', () => {
      registry.registerOpenAIModels('key');
      const gpt4 = registry.getModel('gpt-4-turbo');

      expect(gpt4?.capabilities.contextWindow).toBe(128000);
    });

    it('should track streaming capability', () => {
      const petra = registry.getModel('petra-builtin');
      expect(petra?.capabilities.streaming).toBe(false);

      registry.registerClaudeModels('key');
      const claude = registry.getModel('claude-opus-4-8');
      expect(claude?.capabilities.streaming).toBe(true);
    });

    it('should track function calling capability', () => {
      registry.registerOpenAIModels('key');
      const gpt4 = registry.getModel('gpt-4');

      expect(gpt4?.capabilities.functionCalling).toBe(true);
    });

    it('should track cost information', () => {
      registry.registerOpenAIModels('key');
      const gpt4 = registry.getModel('gpt-4');

      expect(gpt4?.capabilities.costPerMTok).toBeDefined();
      expect(gpt4?.capabilities.costPerMTok).toBeGreaterThan(0);
    });
  });
});
