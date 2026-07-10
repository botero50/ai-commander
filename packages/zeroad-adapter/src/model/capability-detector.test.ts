import { describe, it, expect, beforeEach } from 'vitest';
import { CapabilityDetector, type DetectionResult } from './capability-detector.js';
import { Logger } from '../config/logger.js';

describe('CapabilityDetector', () => {
  let detector: CapabilityDetector;
  const logger = new Logger('error');

  beforeEach(() => {
    detector = new CapabilityDetector(logger);
  });

  describe('detectOllama', () => {
    it('should handle unreachable endpoint gracefully', async () => {
      const results = await detector.detectOllama('http://localhost:9999', 500);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should return DetectionResult structure', async () => {
      const results = await detector.detectOllama('http://localhost:11434', 5000);

      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty('provider');
        expect(result).toHaveProperty('modelId');
        expect(result).toHaveProperty('detected');
        expect(result).toHaveProperty('available');
        expect(result).toHaveProperty('capabilities');
        expect(result).toHaveProperty('timestamp');
      }
    });

    it('should detect vision capability in model names', async () => {
      // Mock test (actual detection depends on real Ollama)
      const results = await detector.detectOllama('http://localhost:11434', 5000);

      for (const result of results) {
        if (result.modelName.includes('vision') || result.modelName.includes('llava')) {
          expect(result.capabilities.vision).toBe(true);
        }
      }
    });
  });

  describe('detectOpenAI', () => {
    it('should detect known OpenAI models', async () => {
      // Use fake key for testing (won't actually call API)
      const results = await detector.detectOpenAI('fake-key-for-testing', 1000);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.modelId === 'gpt-4')).toBe(true);
      expect(results.some(r => r.modelId === 'gpt-4-turbo')).toBe(true);
      expect(results.some(r => r.modelId === 'gpt-3.5-turbo')).toBe(true);
    });

    it('should mark models as unavailable without valid API key', async () => {
      const results = await detector.detectOpenAI('invalid-key', 1000);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => !r.available)).toBe(true);
    });

    it('should include cost information', async () => {
      const results = await detector.detectOpenAI('fake-key', 1000);

      expect(results.some(r => r.capabilities.costPerMTok !== undefined)).toBe(true);
    });

    it('should detect multimodal capability in GPT-4o', async () => {
      const results = await detector.detectOpenAI('fake-key', 1000);
      const gpt4o = results.find(r => r.modelId === 'gpt-4o');

      if (gpt4o) {
        expect(gpt4o.capabilities.multimodal).toBe(true);
        expect(gpt4o.capabilities.vision).toBe(true);
      }
    });
  });

  describe('detectClaude', () => {
    it('should detect known Claude models', async () => {
      const results = await detector.detectClaude('fake-key-for-testing', 1000);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.modelId === 'claude-opus-4-8')).toBe(true);
      expect(results.some(r => r.modelId === 'claude-sonnet-5')).toBe(true);
      expect(results.some(r => r.modelId === 'claude-haiku-4-5')).toBe(true);
    });

    it('should mark as multimodal and vision-capable', async () => {
      const results = await detector.detectClaude('fake-key', 1000);

      expect(results.every(r => r.capabilities.multimodal)).toBe(true);
      expect(results.every(r => r.capabilities.vision)).toBe(true);
    });

    it('should include cost information', async () => {
      const results = await detector.detectClaude('fake-key', 1000);

      expect(results.some(r => r.capabilities.costPerMTok !== undefined)).toBe(true);
    });

    it('should have large context windows', async () => {
      const results = await detector.detectClaude('fake-key', 1000);

      expect(results.every(r => r.capabilities.contextWindow >= 200000)).toBe(true);
    });
  });

  describe('detectGemini', () => {
    it('should detect known Gemini models', async () => {
      const results = await detector.detectGemini('fake-key-for-testing', 1000);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.modelId === 'gemini-2.0-flash')).toBe(true);
      expect(results.some(r => r.modelId === 'gemini-2.0-pro')).toBe(true);
    });

    it('should mark as multimodal with audio capability', async () => {
      const results = await detector.detectGemini('fake-key', 1000);

      expect(results.every(r => r.capabilities.multimodal)).toBe(true);
      expect(results.every(r => r.capabilities.audio)).toBe(true);
    });

    it('should have very large context windows', async () => {
      const results = await detector.detectGemini('fake-key', 1000);

      expect(results.every(r => r.capabilities.contextWindow >= 1000000)).toBe(true);
    });
  });

  describe('detectAll', () => {
    it('should return empty array with no options', async () => {
      const results = await detector.detectAll({});
      expect(Array.isArray(results)).toBe(true);
    });

    it('should combine results from multiple providers', async () => {
      const results = await detector.detectAll({
        openaiKey: 'fake-key',
        claudeKey: 'fake-key',
        timeout: 1000,
      });

      expect(results.length).toBeGreaterThan(0);

      const providers = new Set(results.map(r => r.provider));
      expect(providers.has('OpenAI')).toBe(true);
      expect(providers.has('Anthropic')).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache detection results', async () => {
      const results1 = await detector.detectOpenAI('fake-key', 1000);
      const stats1 = detector.getCacheStats();

      expect(stats1.cached).toBeGreaterThan(0);

      // Second call should use cache
      const results2 = await detector.detectOpenAI('fake-key', 1000);

      expect(results1).toEqual(results2);
    });

    it('should return cached result', async () => {
      await detector.detectOpenAI('fake-key', 1000);

      const cached = detector.getCached('gpt-4@openai');
      expect(cached).toBeDefined();
      expect(cached?.modelId).toBe('gpt-4');
    });

    it('should return null for non-cached item', () => {
      const cached = detector.getCached('nonexistent@provider');
      expect(cached).toBeNull();
    });

    it('should clear cache', async () => {
      await detector.detectOpenAI('fake-key', 1000);
      const statsBefore = detector.getCacheStats();
      expect(statsBefore.cached).toBeGreaterThan(0);

      detector.clearCache();
      const statsAfter = detector.getCacheStats();

      expect(statsAfter.cached).toBe(0);
    });
  });

  describe('summarizeResults', () => {
    it('should summarize detection results', async () => {
      const results = await detector.detectOpenAI('fake-key', 1000);

      const summary = detector.summarizeResults(results);

      expect(summary.total).toBe(results.length);
      expect(summary.byProvider['OpenAI']).toBeGreaterThan(0);
      expect(summary.available + summary.unavailable).toBe(summary.total);
    });

    it('should count models by provider', async () => {
      const results = await detector.detectAll({
        openaiKey: 'fake-key',
        claudeKey: 'fake-key',
        timeout: 1000,
      });

      const summary = detector.summarizeResults(results);

      if (results.some(r => r.provider === 'OpenAI')) {
        expect(summary.byProvider['OpenAI']).toBeGreaterThan(0);
      }

      if (results.some(r => r.provider === 'Anthropic')) {
        expect(summary.byProvider['Anthropic']).toBeGreaterThan(0);
      }
    });

    it('should count errors', async () => {
      const results = await detector.detectOpenAI('invalid-key', 1000);

      const summary = detector.summarizeResults(results);

      // Invalid key should mark models as unavailable
      expect(summary.unavailable).toBeGreaterThan(0);
    });
  });

  describe('DetectionResult structure', () => {
    it('should have required fields', async () => {
      const results = await detector.detectOpenAI('fake-key', 1000);

      if (results.length > 0) {
        const result = results[0];

        expect(result.provider).toBeDefined();
        expect(result.modelId).toBeDefined();
        expect(result.modelName).toBeDefined();
        expect(result.detected).toBeDefined();
        expect(result.available).toBeDefined();
        expect(result.capabilities).toBeDefined();
        expect(result.timestamp).toBeDefined();

        // Capabilities
        expect(result.capabilities.contextWindow).toBeDefined();
        expect(result.capabilities.streaming).toBeDefined();
        expect(result.capabilities.functionCalling).toBeDefined();
        expect(result.capabilities.multimodal).toBeDefined();
      }
    });

    it('should have optional capability fields', async () => {
      const results = await detector.detectGemini('fake-key', 1000);

      if (results.length > 0) {
        const result = results[0];

        // These are optional
        expect(result.capabilities).toHaveProperty('vision');
        expect(result.capabilities).toHaveProperty('audio');
        expect(result.capabilities).toHaveProperty('costPerMTok');
      }
    });
  });

  describe('Provider-specific capabilities', () => {
    it('Ollama should not support function calling', async () => {
      const results = await detector.detectOllama('http://localhost:11434', 1000);

      for (const result of results) {
        expect(result.capabilities.functionCalling).toBe(false);
      }
    });

    it('OpenAI should support function calling', async () => {
      const results = await detector.detectOpenAI('fake-key', 1000);

      expect(results.every(r => r.capabilities.functionCalling)).toBe(true);
    });

    it('Claude should support vision', async () => {
      const results = await detector.detectClaude('fake-key', 1000);

      expect(results.every(r => r.capabilities.vision)).toBe(true);
    });

    it('Gemini should support audio', async () => {
      const results = await detector.detectGemini('fake-key', 1000);

      expect(results.every(r => r.capabilities.audio)).toBe(true);
    });
  });

  describe('Timeout handling', () => {
    it('should respect timeout setting', async () => {
      const start = Date.now();
      await detector.detectOllama('http://192.0.2.1:11434', 500); // Non-routable IP
      const duration = Date.now() - start;

      // Should timeout around 500ms (allow some overhead)
      expect(duration).toBeLessThan(2000);
    });
  });
});
