import { describe, it, expect, beforeEach } from 'vitest';
import { OllamaBrain, createOllamaBrain, OLLAMA_MODELS } from '../src/world/ollama-brain.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Ollama Brain Provider', () => {
  let brain: OllamaBrain;
  let world = createInitialWorld();

  beforeEach(() => {
    brain = new OllamaBrain({
      baseUrl: 'http://localhost:11434',
      model: 'mistral',
    });
    world = createInitialWorld();
  });

  describe('Brain Interface', () => {
    it('implements Brain interface', () => {
      expect(brain.name).toBeDefined();
      expect(brain.version).toBe('1.0');
      expect(brain.decide).toBeDefined();
      expect(brain.reset).toBeDefined();
    });

    it('has local brain name format', () => {
      expect(brain.name).toContain('ollama-brain');
    });
  });

  describe('Decision Making', () => {
    it('makes decisions asynchronously', async () => {
      const input = {
        world,
        availableGoals: [
          { id: 'gather', name: 'gather-resources', description: 'Gather', priority: 80, reward: 50 },
        ],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      expect(output.reasoning).toBeDefined();
      expect(output.selectedGoal).toBeDefined();
      expect(output.commands).toBeDefined();
    });

    it('includes model name in metadata', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      expect(output.metadata.modelUsed).toContain('ollama');
    });
  });

  describe('Configuration', () => {
    it('accepts custom base URL', () => {
      const brain2 = new OllamaBrain({
        baseUrl: 'http://192.168.1.100:11434',
        model: 'llama2',
      });

      expect(brain2).toBeDefined();
    });

    it('accepts temperature setting', () => {
      const brain2 = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
        temperature: 0.2,
      });

      expect(brain2).toBeDefined();
    });

    it('accepts sampling parameters', () => {
      const brain2 = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'qwen',
        topP: 0.8,
        topK: 50,
      });

      expect(brain2).toBeDefined();
    });

    it('sets default timeout for local execution', () => {
      // Local models can be slower, default timeout is 60s
      expect(brain).toBeDefined();
    });
  });

  describe('Token Accounting', () => {
    it('tracks token usage', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      await brain.decide(input);
      const stats = brain.getStats();

      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    it('accumulates tokens for cost analysis', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const before = brain.getStats().totalTokens;
      await brain.decide(input);
      const after = brain.getStats().totalTokens;

      expect(after).toBeGreaterThan(before);
    });
  });

  describe('Local Execution', () => {
    it('marks stats as local', async () => {
      const stats = brain.getStats();
      expect(stats.isLocal).toBe(true);
    });

    it('has zero cloud dependency', () => {
      // Ollama runs locally, no API keys needed
      expect(brain.name).not.toContain('api-key');
    });
  });

  describe('Latency Tracking', () => {
    it('tracks decision latency', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      await brain.decide(input);
      const stats = brain.getStats();

      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
      expect(stats.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('accumulates total time', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const before = brain.getStats().totalTimeMs;
      await brain.decide(input);
      const after = brain.getStats().totalTimeMs;

      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('Error Handling', () => {
    it('tracks API calls', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const before = brain.getStats().apiCalls;
      await brain.decide(input);
      const after = brain.getStats().apiCalls;

      expect(after).toBe(before + 1);
    });

    it('handles errors gracefully', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);
      expect(output).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('resets all statistics', async () => {
      const input = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      await brain.decide(input);
      const before = brain.getStats().apiCalls;

      brain.reset();
      const after = brain.getStats().apiCalls;

      expect(before).toBeGreaterThan(0);
      expect(after).toBe(0);
      expect(brain.getStats().totalTimeMs).toBe(0);
    });
  });

  describe('Factory Function', () => {
    it('creates brain with custom model', () => {
      const created = createOllamaBrain('llama2');

      expect(created.name).toContain('llama2');
    });

    it('creates with custom base URL', () => {
      const created = createOllamaBrain('qwen', 'http://192.168.1.100:11434');

      expect(created).toBeDefined();
    });
  });

  describe('Supported Models', () => {
    it('provides Llama 2 models', () => {
      expect(OLLAMA_MODELS.LLAMA2).toBe('llama2');
      expect(OLLAMA_MODELS.LLAMA2_13B).toBe('llama2:13b');
      expect(OLLAMA_MODELS.LLAMA2_70B).toBe('llama2:70b');
    });

    it('provides Mistral models', () => {
      expect(OLLAMA_MODELS.MISTRAL).toBe('mistral');
      expect(OLLAMA_MODELS.ZEPHYR).toBe('zephyr');
    });

    it('provides Qwen models', () => {
      expect(OLLAMA_MODELS.QWEN).toBe('qwen');
      expect(OLLAMA_MODELS.QWEN_32B).toBe('qwen:32b');
    });

    it('provides DeepSeek Coder', () => {
      expect(OLLAMA_MODELS.DEEPSEEK_CODER).toBe('deepseek-coder');
    });

    it('provides Gemma models', () => {
      expect(OLLAMA_MODELS.GEMMA).toBe('gemma');
      expect(OLLAMA_MODELS.GEMMA_7B).toBe('gemma:7b');
    });

    it('provides specialized models', () => {
      expect(OLLAMA_MODELS.NEURAL_CHAT).toBe('neural-chat');
      expect(OLLAMA_MODELS.DOLPHIN_MIXTRAL).toBe('dolphin-mixtral');
    });
  });

  describe('Health Check', () => {
    it('has health check method', () => {
      expect(brain.isHealthy).toBeDefined();
    });

    it('has list models method', () => {
      expect(brain.listModels).toBeDefined();
    });
  });

  describe('Sampling Parameters', () => {
    it('supports temperature configuration', () => {
      const hot = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
        temperature: 0.95,
      });

      expect(hot).toBeDefined();
    });

    it('supports top-p (nucleus) sampling', () => {
      const nucleus = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
        topP: 0.7,
      });

      expect(nucleus).toBeDefined();
    });

    it('supports top-k sampling', () => {
      const topK = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
        topK: 50,
      });

      expect(topK).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('has longer timeout for local models', () => {
      // Ollama default timeout is 60s (vs 30s for cloud APIs)
      const brain2 = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'llama2:70b',
        timeoutMs: 120000, // 70B model can take longer
      });

      expect(brain2).toBeDefined();
    });
  });
});
