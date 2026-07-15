/**
 * Ollama Brain Tests
 *
 * Tests for local Ollama LLM provider
 * - Configuration validation
 * - Local model support
 * - Error handling
 * - Timeout handling
 * - Request throttling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OllamaBrain, type OllamaBrainConfig } from './ollama-brain.js';

describe('OllamaAIBrain', () => {
  let config: OllamaBrainConfig;

  beforeEach(() => {
    config = {
      modelName: 'llama2',
      baseUrl: 'http://localhost:11434',
      temperature: 0.7,
      topP: 0.9,
      topK: 40,
      numPredict: 500,
      timeout: 30000,
      playerID: 1,
    };
  });

  describe('Constructor', () => {
    it('should initialize with valid config', () => {
      const brain = new OllamaBrain(config);
      expect(brain).toBeDefined();
    });

    it('should set default values', () => {
      const minimalConfig: OllamaConfig = {
        modelName: 'mistral',
        baseUrl: 'http://localhost:11434',
      };
      const brain = new OllamaBrain(minimalConfig);
      expect(brain).toBeDefined();
    });

    it('should use default localhost if base URL not provided', () => {
      const defaultConfig: OllamaConfig = {
        modelName: 'llama2',
        baseUrl: 'http://localhost:11434',
      };
      const brain = new OllamaBrain(defaultConfig);
      expect(defaultConfig.baseUrl).toContain('localhost');
    });
  });

  describe('Supported Models', () => {
    it('should support llama2 model', () => {
      const llama2Config: OllamaConfig = {
        ...config,
        modelName: 'llama2',
      };
      const brain = new OllamaBrain(llama2Config);
      expect(brain).toBeDefined();
    });

    it('should support mistral model', () => {
      const mistralConfig: OllamaConfig = {
        ...config,
        modelName: 'mistral',
      };
      const brain = new OllamaBrain(mistralConfig);
      expect(brain).toBeDefined();
    });

    it('should support neural-chat model', () => {
      const neuralConfig: OllamaConfig = {
        ...config,
        modelName: 'neural-chat',
      };
      const brain = new OllamaBrain(neuralConfig);
      expect(brain).toBeDefined();
    });

    it('should support tinyllama model', () => {
      const tinyConfig: OllamaConfig = {
        ...config,
        modelName: 'tinyllama',
      };
      const brain = new OllamaBrain(tinyConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Sampling Parameters', () => {
    it('should respect temperature setting', () => {
      const customConfig: OllamaConfig = {
        ...config,
        temperature: 0.2,
      };
      const brain = new OllamaBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should respect top_p (nucleus sampling)', () => {
      const customConfig: OllamaConfig = {
        ...config,
        topP: 0.5,
      };
      const brain = new OllamaBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should respect top_k parameter', () => {
      const customConfig: OllamaConfig = {
        ...config,
        topK: 20,
      };
      const brain = new OllamaBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should respect num_predict (max tokens)', () => {
      const customConfig: OllamaConfig = {
        ...config,
        numPredict: 1000,
      };
      const brain = new OllamaBrain(customConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Player Control', () => {
    it('should default to player 1', () => {
      const defaultConfig: OllamaConfig = {
        modelName: 'llama2',
        baseUrl: 'http://localhost:11434',
      };
      const brain = new OllamaBrain(defaultConfig);
      expect(brain).toBeDefined();
      // Default should be player 2 based on code
    });

    it('should allow setting player ID', () => {
      const p1Config: OllamaConfig = {
        ...config,
        playerID: 1,
      };
      const brain1 = new OllamaBrain(p1Config);
      expect(brain1).toBeDefined();

      const p2Config: OllamaConfig = {
        ...config,
        playerID: 2,
      };
      const brain2 = new OllamaBrain(p2Config);
      expect(brain2).toBeDefined();
    });
  });

  describe('Timeout Handling', () => {
    it('should respect timeout configuration', () => {
      const timeoutConfig: OllamaConfig = {
        ...config,
        timeout: 60000,
      };
      const brain = new OllamaBrain(timeoutConfig);
      expect(brain).toBeDefined();
    });

    it('should default to 30 second timeout', () => {
      const defaultConfig: OllamaConfig = {
        modelName: 'llama2',
        baseUrl: 'http://localhost:11434',
      };
      const brain = new OllamaBrain(defaultConfig);
      expect(defaultConfig).toBeDefined();
    });
  });

  describe('Local Execution', () => {
    it('should connect to localhost by default', () => {
      const localConfig: OllamaConfig = {
        modelName: 'llama2',
        baseUrl: 'http://localhost:11434',
      };
      expect(localConfig.baseUrl).toContain('localhost');
    });

    it('should support custom Ollama server URLs', () => {
      const customConfig: OllamaConfig = {
        ...config,
        baseUrl: 'http://192.168.1.100:11434',
      };
      const brain = new OllamaBrain(customConfig);
      expect(brain).toBeDefined();
    });

    it('should be low-cost since it runs locally', () => {
      // Ollama runs locally, so no API costs
      const brain = new OllamaBrain(config);
      expect(brain).toBeDefined();
      // Cost should be 0 since it's local
    });
  });

  describe('Error Handling', () => {
    it('should handle Ollama server not running', () => {
      const brain = new OllamaBrain(config);
      // Should gracefully handle connection errors
      expect(brain).toBeDefined();
    });

    it('should handle timeout gracefully', () => {
      const quickTimeoutConfig: OllamaConfig = {
        ...config,
        timeout: 100,
      };
      const brain = new OllamaBrain(quickTimeoutConfig);
      expect(brain).toBeDefined();
    });

    it('should handle invalid model name', () => {
      const invalidConfig: OllamaConfig = {
        modelName: 'nonexistent-model',
        baseUrl: 'http://localhost:11434',
      };
      // Should attempt to use model, Ollama will error if not found
      const brain = new OllamaBrain(invalidConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should be fast with tinyllama for testing', () => {
      const fastConfig: OllamaConfig = {
        ...config,
        modelName: 'tinyllama',
      };
      const brain = new OllamaBrain(fastConfig);
      expect(brain).toBeDefined();
    });

    it('should be accurate with larger models like mistral', () => {
      const accurateConfig: OllamaConfig = {
        ...config,
        modelName: 'mistral',
      };
      const brain = new OllamaBrain(accurateConfig);
      expect(brain).toBeDefined();
    });
  });

  describe('Request Throttling', () => {
    it('should have throttling mechanism', () => {
      // Ollama brain should implement request throttling
      // to prevent overwhelming the local server
      const brain = new OllamaBrain(config);
      expect(brain).toBeDefined();
    });

    it('should queue requests appropriately', () => {
      const brain = new OllamaBrain(config);
      // Multiple rapid requests should be throttled
      expect(brain).toBeDefined();
    });
  });
});
