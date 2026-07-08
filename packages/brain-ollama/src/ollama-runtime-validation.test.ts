import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateOllamaRuntime,
  isOllamaAvailable,
  listOllamaModels,
  type ValidationResult,
} from './ollama-runtime-validation.js';

describe('Ollama Runtime Validation', () => {
  const mockConfig = {
    endpoint: 'http://localhost:11434',
    model: 'ollama:mistral',
    temperature: 0.7,
    maxRetries: 3,
    timeoutMs: 60000,
  };

  describe('isOllamaAvailable', () => {
    it('should return false when Ollama is unreachable', async () => {
      const result = await isOllamaAvailable('http://localhost:99999');
      expect(result).toBe(false);
    });

    it('should handle timeout gracefully', async () => {
      const result = await isOllamaAvailable('http://invalid.local:11434');
      expect(result).toBe(false);
    });
  });

  describe('listOllamaModels', () => {
    it('should return empty array on connection error', async () => {
      const models = await listOllamaModels('http://localhost:99999');
      expect(models).toEqual([]);
    });

    it('should handle timeout', async () => {
      const models = await listOllamaModels('http://invalid.local:11434');
      expect(models).toEqual([]);
    });
  });

  describe('validateOllamaRuntime', () => {
    it('should return validation result structure', async () => {
      // This test will fail if Ollama isn't running, but structure is correct
      const result = await validateOllamaRuntime(mockConfig);

      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('endpoint');
      expect(result).toHaveProperty('model');
      expect(result).toHaveProperty('isConnected');
      expect(result).toHaveProperty('modelLoaded');
      expect(result).toHaveProperty('concurrencyTest');
      expect(result).toHaveProperty('latencyMs');
      expect(result).toHaveProperty('errorHandling');
      expect(result).toHaveProperty('summary');
    });

    it('should have concurrency test with correct structure', async () => {
      const result = await validateOllamaRuntime(mockConfig);

      expect(result.concurrencyTest).toHaveProperty('success');
      expect(result.concurrencyTest).toHaveProperty('instanceCount');
      expect(result.concurrencyTest).toHaveProperty('totalTime');
      expect(result.concurrencyTest).toHaveProperty('avgTime');
    });

    it('should have error handling tracking', async () => {
      const result = await validateOllamaRuntime(mockConfig);

      expect(result.errorHandling).toHaveProperty('timeoutHandled');
      expect(result.errorHandling).toHaveProperty('retryWorked');
    });

    it('should produce non-empty summary', async () => {
      const result = await validateOllamaRuntime(mockConfig);
      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });
});
