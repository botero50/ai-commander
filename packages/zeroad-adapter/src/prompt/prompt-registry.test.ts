import { describe, it, expect, beforeEach } from 'vitest';
import { PromptRegistry, type Prompt } from './prompt-registry.js';
import { Logger } from '../config/logger.js';

describe('PromptRegistry', () => {
  let registry: PromptRegistry;
  const logger = new Logger('error');

  beforeEach(() => {
    registry = new PromptRegistry(logger);
  });

  describe('initialization', () => {
    it('should initialize with default prompts', () => {
      const prompts = registry.listPrompts();
      expect(prompts.length).toBeGreaterThan(0);
    });

    it('should have system prompt', () => {
      const prompt = registry.getPrompt('system-rts-default');
      expect(prompt).toBeDefined();
      expect(prompt?.category).toBe('system');
    });

    it('should have decision prompts', () => {
      const prompts = registry.getPromptsByCategory('decision');
      expect(prompts.length).toBeGreaterThan(0);
    });
  });

  describe('createPrompt', () => {
    it('should create a new prompt', () => {
      const prompt = registry.createPrompt({
        id: 'test-prompt',
        name: 'Test Prompt',
        category: 'custom',
        content: 'This is a test prompt',
      });

      expect(prompt.id).toBe('test-prompt');
      expect(prompt.currentVersion).toBe('1.0.0');
      expect(prompt.versions.length).toBe(1);
    });

    it('should calculate content hash', () => {
      const prompt = registry.createPrompt({
        id: 'test-prompt-2',
        name: 'Test Prompt 2',
        category: 'custom',
        content: 'Test content',
      });

      expect(prompt.versions[0].hash).toBeDefined();
      expect(prompt.versions[0].hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should initialize usage count to 0', () => {
      const prompt = registry.createPrompt({
        id: 'test-prompt-3',
        name: 'Test Prompt 3',
        category: 'custom',
        content: 'Test',
      });

      expect(prompt.usageCount).toBe(0);
    });

    it('should support tags and metadata', () => {
      const prompt = registry.createPrompt({
        id: 'test-prompt-4',
        name: 'Test Prompt 4',
        category: 'custom',
        content: 'Test',
        tags: ['test', 'custom'],
        metadata: { author: 'test' },
      });

      expect(prompt.tags).toContain('test');
      expect(prompt.metadata.author).toBe('test');
    });
  });

  describe('getPrompt', () => {
    it('should retrieve prompt by ID', () => {
      registry.createPrompt({
        id: 'retrieve-test',
        name: 'Retrieve Test',
        category: 'custom',
        content: 'Test content',
      });

      const prompt = registry.getPrompt('retrieve-test');
      expect(prompt?.id).toBe('retrieve-test');
      expect(prompt?.content).toBe('Test content');
    });

    it('should return null for non-existent prompt', () => {
      const prompt = registry.getPrompt('nonexistent');
      expect(prompt).toBeNull();
    });
  });

  describe('listPrompts', () => {
    it('should list all prompts', () => {
      const prompts = registry.listPrompts();
      expect(Array.isArray(prompts)).toBe(true);
    });

    it('should filter by category', () => {
      const systemPrompts = registry.listPrompts({ category: 'system' });
      expect(systemPrompts.every(p => p.category === 'system')).toBe(true);
    });

    it('should filter by tag', () => {
      registry.createPrompt({
        id: 'tagged-prompt',
        name: 'Tagged Prompt',
        category: 'custom',
        content: 'Test',
        tags: ['special'],
      });

      const tagged = registry.listPrompts({ tag: 'special' });
      expect(tagged.some(p => p.id === 'tagged-prompt')).toBe(true);
    });

    it('should sort alphabetically', () => {
      const prompts = registry.listPrompts();
      const names = prompts.map(p => p.name);

      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('updatePrompt', () => {
    it('should update prompt content', () => {
      registry.createPrompt({
        id: 'update-test',
        name: 'Update Test',
        category: 'custom',
        content: 'Original content',
      });

      const updated = registry.updatePrompt('update-test', 'New content', 'Updated content');

      expect(updated).toBe(true);

      const prompt = registry.getPrompt('update-test');
      expect(prompt?.content).toBe('New content');
      expect(prompt?.currentVersion).toBe('1.0.1');
    });

    it('should create new version on update', () => {
      registry.createPrompt({
        id: 'version-test',
        name: 'Version Test',
        category: 'custom',
        content: 'v1',
      });

      registry.updatePrompt('version-test', 'v2');
      registry.updatePrompt('version-test', 'v3');

      const prompt = registry.getPrompt('version-test');
      expect(prompt?.versions.length).toBe(3);
      expect(prompt?.currentVersion).toBe('1.0.2');
    });

    it('should return false if content unchanged', () => {
      registry.createPrompt({
        id: 'unchanged-test',
        name: 'Unchanged Test',
        category: 'custom',
        content: 'Same content',
      });

      const updated = registry.updatePrompt('unchanged-test', 'Same content');
      expect(updated).toBe(false);
    });

    it('should return false for non-existent prompt', () => {
      const updated = registry.updatePrompt('nonexistent', 'New content');
      expect(updated).toBe(false);
    });
  });

  describe('recordUsage', () => {
    it('should increment usage count', () => {
      registry.createPrompt({
        id: 'usage-test',
        name: 'Usage Test',
        category: 'custom',
        content: 'Test',
      });

      registry.recordUsage('usage-test');
      registry.recordUsage('usage-test');

      const prompt = registry.getPrompt('usage-test');
      expect(prompt?.usageCount).toBe(2);
    });

    it('should update lastUsedAt timestamp', () => {
      registry.createPrompt({
        id: 'timestamp-test',
        name: 'Timestamp Test',
        category: 'custom',
        content: 'Test',
      });

      registry.recordUsage('timestamp-test');

      const prompt = registry.getPrompt('timestamp-test');
      expect(prompt?.lastUsedAt).toBeDefined();
    });

    it('should return false for non-existent prompt', () => {
      const recorded = registry.recordUsage('nonexistent');
      expect(recorded).toBe(false);
    });
  });

  describe('getPromptsByCategory', () => {
    it('should return prompts of specific category', () => {
      const decisions = registry.getPromptsByCategory('decision');
      expect(decisions.every(p => p.category === 'decision')).toBe(true);
    });
  });

  describe('getPromptsByTag', () => {
    it('should return prompts with specific tag', () => {
      registry.createPrompt({
        id: 'tagged-1',
        name: 'Tagged 1',
        category: 'custom',
        content: 'Test',
        tags: ['mytag'],
      });

      const tagged = registry.getPromptsByTag('mytag');
      expect(tagged.some(p => p.id === 'tagged-1')).toBe(true);
    });
  });

  describe('deletePrompt', () => {
    it('should delete a prompt', () => {
      registry.createPrompt({
        id: 'delete-test',
        name: 'Delete Test',
        category: 'custom',
        content: 'Test',
      });

      expect(registry.getPrompt('delete-test')).toBeDefined();

      const deleted = registry.deletePrompt('delete-test');

      expect(deleted).toBe(true);
      expect(registry.getPrompt('delete-test')).toBeNull();
    });

    it('should return false for non-existent prompt', () => {
      const deleted = registry.deletePrompt('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('getPromptHistory', () => {
    it('should return version history', () => {
      registry.createPrompt({
        id: 'history-test',
        name: 'History Test',
        category: 'custom',
        content: 'v1',
      });

      registry.updatePrompt('history-test', 'v2');
      registry.updatePrompt('history-test', 'v3');

      const history = registry.getPromptHistory('history-test');

      expect(history).toBeDefined();
      expect(history?.length).toBe(3);
      expect(history?.[0].version).toBe('1.0.0');
      expect(history?.[2].version).toBe('1.0.2');
    });

    it('should return null for non-existent prompt', () => {
      const history = registry.getPromptHistory('nonexistent');
      expect(history).toBeNull();
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', () => {
      const stats = registry.getStatistics();

      expect(stats.totalPrompts).toBeGreaterThan(0);
      expect(stats.byCategory.system).toBeGreaterThanOrEqual(0);
      expect(stats.byCategory.decision).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.mostUsed)).toBe(true);
      expect(stats.totalVersions).toBeGreaterThan(0);
    });

    it('should track most used prompts', () => {
      registry.createPrompt({
        id: 'popular-1',
        name: 'Popular 1',
        category: 'custom',
        content: 'Test',
      });

      registry.recordUsage('popular-1');
      registry.recordUsage('popular-1');

      const stats = registry.getStatistics();
      const mostUsed = stats.mostUsed.find(p => p.id === 'popular-1');

      expect(mostUsed).toBeDefined();
      expect(mostUsed?.usageCount).toBe(2);
    });
  });

  describe('exportRegistry', () => {
    it('should export registry as JSON', () => {
      registry.createPrompt({
        id: 'export-test',
        name: 'Export Test',
        category: 'custom',
        content: 'Test',
      });

      const json = registry.exportRegistry();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(Array.isArray(data.prompts)).toBe(true);
      expect(data.prompts.some((p: any) => p.id === 'export-test')).toBe(true);
    });
  });

  describe('importRegistry', () => {
    it('should import registry from JSON', () => {
      registry.createPrompt({
        id: 'import-test',
        name: 'Import Test',
        category: 'custom',
        content: 'Test',
      });

      const exported = registry.exportRegistry();

      const newRegistry = new PromptRegistry(logger);
      const imported = newRegistry.importRegistry(exported);

      expect(imported).toBe(true);
      expect(newRegistry.getPrompt('import-test')).toBeDefined();
    });

    it('should return false for invalid format', () => {
      const imported = registry.importRegistry('invalid json');
      expect(imported).toBe(false);
    });
  });

  describe('comparePrompts', () => {
    it('should compare two prompts', () => {
      registry.createPrompt({
        id: 'prompt-a',
        name: 'Prompt A',
        category: 'custom',
        content: 'Content A',
      });

      registry.createPrompt({
        id: 'prompt-b',
        name: 'Prompt B',
        category: 'custom',
        content: 'Content B',
      });

      const comparison = registry.comparePrompts('prompt-a', 'prompt-b');

      expect(comparison.prompt1).toBeDefined();
      expect(comparison.prompt2).toBeDefined();
      expect(comparison.same).toBe(false);
      expect(comparison.differences.length).toBeGreaterThan(0);
    });

    it('should identify identical prompts', () => {
      registry.createPrompt({
        id: 'identical-1',
        name: 'Identical 1',
        category: 'custom',
        content: 'Same content',
        tags: ['test'],
      });

      registry.createPrompt({
        id: 'identical-2',
        name: 'Identical 2',
        category: 'custom',
        content: 'Same content',
        tags: ['test'],
      });

      const comparison = registry.comparePrompts('identical-1', 'identical-2');

      expect(comparison.same).toBe(true);
      expect(comparison.differences.length).toBe(0);
    });
  });

  describe('Prompt versions', () => {
    it('should maintain version history with hashes', () => {
      registry.createPrompt({
        id: 'versioned',
        name: 'Versioned',
        category: 'custom',
        content: 'Initial',
      });

      registry.updatePrompt('versioned', 'Updated once');
      registry.updatePrompt('versioned', 'Updated twice');

      const prompt = registry.getPrompt('versioned');

      expect(prompt?.versions.length).toBe(3);
      expect(prompt?.versions[0].hash).not.toBe(prompt?.versions[1].hash);
      expect(prompt?.versions[1].hash).not.toBe(prompt?.versions[2].hash);
    });
  });
});
