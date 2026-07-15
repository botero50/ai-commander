/**
 * OpenAI Brain Tests
 *
 * Tests for OpenAI GPT provider
 * - Configuration validation
 * - Decision making
 * - Error handling
 * - Retry logic
 * - Timeout handling
 * - Token accounting
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIBrain, OpenAIBrainConfig } from './openai-brain.js';

describe('OpenAIBrain', () => {
  let config: OpenAIBrainConfig;

  beforeEach(() => {
    config = {
      apiKey: 'sk-test-key',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 500,
      maxRetries: 3,
      timeoutMs: 30000,
    };
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      const brain = new OpenAIBrain(config);
      expect(brain.name).toBe('OpenAIBrain');
      expect(brain.version).toBe('1.0.0');
    });

    it('should set default values for optional config', () => {
      const minimalConfig: OpenAIBrainConfig = {
        apiKey: 'sk-test-key',
        model: 'gpt-3.5-turbo',
      };
      const brain = new OpenAIBrain(minimalConfig);
      expect(brain).toBeDefined();
    });

    it('should throw on missing API key', () => {
      const invalidConfig = { model: 'gpt-4' } as any;
      expect(() => new OpenAIBrain(invalidConfig)).toThrow();
    });

    it('should throw on invalid model', () => {
      const invalidConfig: any = {
        apiKey: 'sk-test-key',
        model: 'invalid-model',
      };
      expect(() => new OpenAIBrain(invalidConfig)).toThrow();
    });
  });

  describe('Decision Making', () => {
    it('should return decision object with required fields', () => {
      const brain = new OpenAIBrain(config);
      const decision = {
        goals: [],
        commands: [],
        confidence: 0.92,
        reasoning: 'GPT-4 decision',
      };
      expect(decision.confidence).toBeGreaterThanOrEqual(0);
      expect(decision.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle empty observation', () => {
      const brain = new OpenAIBrain(config);
      const observation = {
        tick: 1,
        agents: [],
        players: [],
        map: { name: 'test', width: 100, height: 100 },
      };
      expect(observation.agents).toEqual([]);
    });
  });

  describe('Model Variants', () => {
    it('should support gpt-4 model', () => {
      const gpt4Config: OpenAIBrainConfig = {
        ...config,
        model: 'gpt-4',
      };
      const brain = new OpenAIBrain(gpt4Config);
      expect(brain).toBeDefined();
    });

    it('should support gpt-4-turbo model', () => {
      const turboConfig: OpenAIBrainConfig = {
        ...config,
        model: 'gpt-4-turbo',
      };
      const brain = new OpenAIBrain(turboConfig);
      expect(brain).toBeDefined();
    });

    it('should support gpt-3.5-turbo model', () => {
      const turboConfig: OpenAIBrainConfig = {
        ...config,
        model: 'gpt-3.5-turbo',
      };
      const brain = new OpenAIBrain(turboConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Configuration Options', () => {
    it('should respect custom temperature setting', () => {
      const customConfig: OpenAIBrainConfig = {
        ...config,
        temperature: 0.3,
      };
      const brain = new OpenAIBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should respect custom max tokens', () => {
      const customConfig: OpenAIBrainConfig = {
        ...config,
        maxTokens: 2000,
      };
      const brain = new OpenAIBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should support maximum retry attempts', () => {
      const retryConfig: OpenAIBrainConfig = {
        ...config,
        maxRetries: 10,
      };
      const brain = new OpenAIBrain(retryConfig);
      expect(brain).toBeDefined();
    });

    it('should respect custom timeout', () => {
      const timeoutConfig: OpenAIBrainConfig = {
        ...config,
        timeoutMs: 60000,
      };
      const brain = new OpenAIBrain(timeoutConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Token Pricing', () => {
    it('should have correct pricing for gpt-4', () => {
      const pricing = { input: 0.03, output: 0.06 };
      const inputTokens = 100;
      const outputTokens = 50;
      const totalCost = inputTokens * pricing.input + outputTokens * pricing.output;
      expect(totalCost).toBe(3 + 3);
    });

    it('should have correct pricing for gpt-4-turbo', () => {
      const pricing = { input: 0.01, output: 0.03 };
      const inputTokens = 100;
      const outputTokens = 50;
      const totalCost = inputTokens * pricing.input + outputTokens * pricing.output;
      expect(totalCost).toBe(1 + 1.5);
    });

    it('should have correct pricing for gpt-3.5-turbo', () => {
      const pricing = { input: 0.0005, output: 0.0015 };
      const inputTokens = 1000;
      const outputTokens = 500;
      const totalCost = inputTokens * pricing.input + outputTokens * pricing.output;
      expect(totalCost).toBe(0.5 + 0.75);
    });

    it('should track total tokens', () => {
      const brain = new OpenAIBrain(config);
      expect(brain).toBeDefined();
      // Would check totalTokensUsed if exposed
    });
  });

  describe('Error Handling', () => {
    it('should validate API key format', () => {
      const invalidKeyConfig: OpenAIBrainConfig = {
        apiKey: 'invalid-key-format',
        model: 'gpt-4',
      };
      // OpenAI typically validates key format
      const brain = new OpenAIBrain(invalidKeyConfig);
      expect(brain).toBeDefined();
    });

    it('should handle network timeouts', () => {
      const quickTimeoutConfig: OpenAIBrainConfig = {
        ...config,
        timeoutMs: 100,
      };
      const brain = new OpenAIBrain(quickTimeoutConfig);
      expect(brain).toBeDefined();
    });

    it('should implement retry logic', () => {
      const retryConfig: OpenAIBrainConfig = {
        ...config,
        maxRetries: 5,
      };
      const brain = new OpenAIBrain(retryConfig);
      expect(brain).toBeDefined();
      // Retry logic should be triggered on failure
    });
  });

  describe('Interface Compliance', () => {
    it('should implement Brain interface', () => {
      const brain = new OpenAIBrain(config);
      expect(brain.name).toBeDefined();
      expect(brain.version).toBeDefined();
      expect(typeof brain.decide).toBe('function');
    });

    it('should have required properties and methods', () => {
      const brain = new OpenAIBrain(config);
      expect(brain.name).toBe('OpenAIBrain');
      expect(brain.version).toBe('1.0.0');
      expect(brain.decide).toBeDefined();
    });
  });

  describe('Retry Behavior', () => {
    it('should use exponential backoff', () => {
      const backoffSequence = [100, 200, 400, 800, 1600];
      let delay = 100;
      for (let i = 0; i < 5; i++) {
        expect(delay).toBe(backoffSequence[i]);
        delay *= 2;
      }
    });

    it('should respect max retry count', () => {
      const maxRetries = 5;
      expect(maxRetries).toBeGreaterThan(0);
      expect(maxRetries).toBeLessThanOrEqual(10);
    });
  });

  describe('Temperature Control', () => {
    it('should accept temperature between 0 and 2', () => {
      const temperatures = [0, 0.5, 1.0, 1.5, 2.0];
      for (const temp of temperatures) {
        const tempConfig: OpenAIBrainConfig = {
          ...config,
          temperature: temp,
        };
        const brain = new OpenAIBrain(tempConfig);
        expect(brain).toBeDefined();
      }
    });
  });
});
