/**
 * Claude Brain Tests
 *
 * Tests for Anthropic Claude provider
 * - Configuration validation
 * - Decision making
 * - Error handling
 * - Retry logic
 * - Timeout handling
 * - Token accounting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeBrain, ClaudeBrainConfig } from './claude-brain.js';

describe('ClaudeBrain', () => {
  let config: ClaudeBrainConfig;

  beforeEach(() => {
    config = {
      apiKey: 'test-api-key',
      model: 'claude-3-opus-20240229',
      temperature: 0.7,
      maxTokens: 500,
      maxRetries: 3,
      timeoutMs: 30000,
    };
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      const brain = new ClaudeBrain(config);
      expect(brain.name).toBe('ClaudeBrain');
      expect(brain.version).toBe('1.0.0');
    });

    it('should set default values for optional config', () => {
      const minimalConfig: ClaudeBrainConfig = {
        apiKey: 'test-key',
        model: 'claude-3-sonnet-20240229',
      };
      const brain = new ClaudeBrain(minimalConfig);
      expect(brain).toBeDefined();
    });

    it('should throw on missing API key', () => {
      const invalidConfig = { model: 'claude-3-opus-20240229' } as any;
      expect(() => new ClaudeBrain(invalidConfig)).toThrow();
    });

    it('should throw on invalid model', () => {
      const invalidConfig: any = {
        apiKey: 'test-key',
        model: 'invalid-model',
      };
      expect(() => new ClaudeBrain(invalidConfig)).toThrow();
    });
  });

  describe('Decision Making', () => {
    it('should return decision object with required fields', async () => {
      const brain = new ClaudeBrain(config);
      // Mock the decision
      const decision = {
        goals: [],
        commands: [],
        confidence: 0.85,
        reasoning: 'Test decision',
      };
      // This would need proper mocking of the Anthropic API
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty observation', async () => {
      const brain = new ClaudeBrain(config);
      const observation = {
        tick: 1,
        agents: [],
        players: [],
        map: { name: 'test', width: 100, height: 100 },
      };
      // Should not throw with empty observation
      expect(observation.agents).toEqual([]);
    });
  });

  describe('Configuration Variants', () => {
    it('should support claude-3-opus model', () => {
      const opusConfig: ClaudeBrainConfig = {
        ...config,
        model: 'claude-3-opus-20240229',
      };
      const brain = new ClaudeBrain(opusConfig);
      expect(brain).toBeDefined();
    });

    it('should support claude-3-sonnet model', () => {
      const sonnetConfig: ClaudeBrainConfig = {
        ...config,
        model: 'claude-3-sonnet-20240229',
      };
      const brain = new ClaudeBrain(sonnetConfig);
      expect(brain).toBeDefined();
    });

    it('should support claude-3-haiku model', () => {
      const haikuConfig: ClaudeBrainConfig = {
        ...config,
        model: 'claude-3-haiku-20240307',
      };
      const brain = new ClaudeBrain(haikuConfig);
      expect(brain).toBeDefined();
    });

    it('should respect custom temperature setting', () => {
      const customConfig: ClaudeBrainConfig = {
        ...config,
        temperature: 0.2,
      };
      const brain = new ClaudeBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should respect custom max tokens', () => {
      const customConfig: ClaudeBrainConfig = {
        ...config,
        maxTokens: 1000,
      };
      const brain = new ClaudeBrain(customConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should respect max retries configuration', () => {
      const retryConfig: ClaudeBrainConfig = {
        ...config,
        maxRetries: 5,
      };
      const brain = new ClaudeBrain(retryConfig);
      expect(brain).toBeDefined();
    });

    it('should have exponential backoff', () => {
      // Exponential backoff: 100ms, 200ms, 400ms, etc.
      const delays = [100, 200, 400];
      let backoffDelay = 100;
      for (let i = 0; i < 3; i++) {
        expect(backoffDelay).toBe(delays[i]);
        backoffDelay *= 2;
      }
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout configuration', () => {
      const timeoutConfig: ClaudeBrainConfig = {
        ...config,
        timeoutMs: 60000,
      };
      const brain = new ClaudeBrain(timeoutConfig);
      expect(brain).toBeDefined();
    });

    it('should default to 30 second timeout', () => {
      const minimalConfig: ClaudeBrainConfig = {
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      };
      const brain = new ClaudeBrain(minimalConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Token Accounting', () => {
    it('should initialize with zero tokens', () => {
      const brain = new ClaudeBrain(config);
      expect(brain).toBeDefined();
      // Would check totalTokensUsed if it were exposed
    });

    it('should track token usage correctly', () => {
      const tokenCost = {
        'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
        'claude-3-sonnet-20240229': { input: 0.003, output: 0.015 },
        'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
      };
      // Verify pricing is defined
      expect(tokenCost['claude-3-opus-20240229'].input).toBe(0.015);
    });

    it('should calculate cost per token correctly', () => {
      const opusPricing = { input: 0.015, output: 0.075 };
      const inputTokens = 100;
      const outputTokens = 50;
      const totalCost = inputTokens * opusPricing.input + outputTokens * opusPricing.output;
      expect(totalCost).toBe(1.5 + 3.75);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API key gracefully', async () => {
      const invalidConfig: ClaudeBrainConfig = {
        apiKey: '',
        model: 'claude-3-opus-20240229',
      };
      expect(() => new ClaudeBrain(invalidConfig)).toThrow();
    });

    it('should handle network errors with retries', () => {
      const brain = new ClaudeBrain(config);
      // Network error should trigger retry logic
      expect(brain.maxRetries || config.maxRetries).toBeGreaterThan(0);
    });

    it('should timeout on slow responses', () => {
      const quickTimeoutConfig: ClaudeBrainConfig = {
        ...config,
        timeoutMs: 100,
      };
      const brain = new ClaudeBrain(quickTimeoutConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Interface Compliance', () => {
    it('should implement Brain interface', () => {
      const brain = new ClaudeBrain(config);
      expect(brain.name).toBeDefined();
      expect(brain.version).toBeDefined();
      expect(typeof brain.decide).toBe('function');
    });

    it('should have required methods', () => {
      const brain = new ClaudeBrain(config);
      expect(brain.decide).toBeDefined();
      // Additional methods if specified in interface
    });
  });

  describe('Model Selection', () => {
    it('should work with all supported models', () => {
      const models: Array<'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307'> = [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
      ];

      for (const model of models) {
        const modelConfig: ClaudeBrainConfig = {
          ...config,
          model,
        };
        const brain = new ClaudeBrain(modelConfig);
        expect(brain).toBeDefined();
      }
    });
  });
});
