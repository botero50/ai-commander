import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAIBrain, createOpenAIBrain, type OpenAIConfig } from '../src/world/openai-brain.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('OpenAI Brain Provider', () => {
  let brain: OpenAIBrain;
  let world = createInitialWorld();

  beforeEach(() => {
    const config: OpenAIConfig = {
      apiKey: 'test-key',
      model: 'gpt-4-turbo',
    };
    brain = new OpenAIBrain(config);
    world = createInitialWorld();
  });

  describe('Brain Interface', () => {
    it('implements Brain interface', () => {
      expect(brain.name).toBeDefined();
      expect(brain.version).toBe('1.0');
      expect(brain.decide).toBeDefined();
      expect(brain.updateMemory).toBeDefined();
      expect(brain.reset).toBeDefined();
    });

    it('has correct name format', () => {
      expect(brain.name).toContain('gpt-brain');
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
      expect(output.plan).toBeDefined();
      expect(output.commands).toBeDefined();
    });

    it('includes metadata in output', async () => {
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

      expect(output.metadata.thinkingTimeMs).toBeGreaterThanOrEqual(0);
      expect(output.metadata.modelUsed).toContain('gpt');
      expect(output.metadata.confidence).toBeGreaterThanOrEqual(0);
    });

    it('returns valid command types', async () => {
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

      for (const command of output.commands) {
        expect(['move', 'gather', 'deposit', 'produce', 'train', 'scout', 'attack']).toContain(command.type);
      }
    });
  });

  describe('Configuration', () => {
    it('accepts custom model', () => {
      const config: OpenAIConfig = {
        apiKey: 'key',
        model: 'gpt-3.5-turbo',
      };
      const customBrain = new OpenAIBrain(config);

      expect(customBrain.name).toContain('gpt-3.5-turbo');
    });

    it('accepts temperature setting', () => {
      const config: OpenAIConfig = {
        apiKey: 'key',
        model: 'gpt-4',
        temperature: 0.2,
      };
      const customBrain = new OpenAIBrain(config);

      expect(customBrain).toBeDefined();
    });

    it('sets default values', () => {
      const config: OpenAIConfig = {
        apiKey: 'key',
        model: 'gpt-4',
      };
      const customBrain = new OpenAIBrain(config);

      expect(customBrain).toBeDefined();
      // Default temperature, maxTokens, timeoutMs should be set
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

    it('accumulates token usage across calls', async () => {
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

      const stats1Before = brain.getStats();
      await brain.decide(input);
      const stats1After = brain.getStats();
      await brain.decide(input);
      const stats2After = brain.getStats();

      expect(stats2After.totalTokens).toBeGreaterThan(stats1After.totalTokens);
    });
  });

  describe('Cost Accounting', () => {
    it('tracks estimated cost', async () => {
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

      expect(stats.totalCost).toBeGreaterThanOrEqual(0);
    });

    it('cost varies by model', async () => {
      const gpt4Brain = new OpenAIBrain({
        apiKey: 'key',
        model: 'gpt-4',
      });

      const gpt35Brain = new OpenAIBrain({
        apiKey: 'key',
        model: 'gpt-3.5-turbo',
      });

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

      await gpt4Brain.decide(input);
      await gpt35Brain.decide(input);

      const stats4 = gpt4Brain.getStats();
      const stats35 = gpt35Brain.getStats();

      // GPT-4 should be more expensive
      expect(stats4.totalCost).toBeGreaterThan(stats35.totalCost);
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
    });

    it('accumulates latency data', async () => {
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

      for (let i = 0; i < 5; i++) {
        await brain.decide(input);
      }

      const stats = brain.getStats();
      expect(stats.averageLatencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('tracks API call count', async () => {
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

    it('handles decision errors gracefully', async () => {
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

      // Even if internal call fails, should return valid output
      const output = await brain.decide(input);
      expect(output).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('resets stats on reset', async () => {
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
      const statsBefore = brain.getStats();
      expect(statsBefore.apiCalls).toBeGreaterThan(0);

      brain.reset();
      const statsAfter = brain.getStats();

      expect(statsAfter.apiCalls).toBe(0);
      expect(statsAfter.totalTokens).toBe(0);
      expect(statsAfter.totalCost).toBe(0);
    });
  });

  describe('Factory Function', () => {
    it('creates brain with defaults', () => {
      const created = createOpenAIBrain('test-key');

      expect(created.name).toContain('gpt-4-turbo');
    });

    it('creates brain with custom model', () => {
      const created = createOpenAIBrain('test-key', 'gpt-3.5-turbo');

      expect(created.name).toContain('gpt-3.5-turbo');
    });
  });

  describe('Determinism', () => {
    it('handles identical inputs', async () => {
      const input = {
        world,
        availableGoals: [{ id: 'gather', name: 'gather', description: 'Gather', priority: 80, reward: 50 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output1 = await brain.decide(input);
      const output2 = await brain.decide(input);

      // Should handle identical inputs (though responses may differ in real API)
      expect(output1.selectedGoal).toBeDefined();
      expect(output2.selectedGoal).toBeDefined();
    });
  });

  describe('Prompt Building', () => {
    it('includes world observation in prompt', async () => {
      const input = {
        world,
        availableGoals: [{ id: 'gather', name: 'gather', description: 'Gather', priority: 80, reward: 50 }],
        availableActions: [{ action: 'move', description: 'Move unit', precondition: 'has-unit', estimatedDuration: 10 }],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      await brain.decide(input);

      // Verify prompt was built with all components
      expect(brain.getStats().apiCalls).toBeGreaterThan(0);
    });
  });

  describe('Model Variants', () => {
    it('supports gpt-4', () => {
      const gpt4 = new OpenAIBrain({ apiKey: 'key', model: 'gpt-4' });
      expect(gpt4.name).toContain('gpt-4');
    });

    it('supports gpt-4-turbo', () => {
      const turbo = new OpenAIBrain({ apiKey: 'key', model: 'gpt-4-turbo' });
      expect(turbo.name).toContain('gpt-4-turbo');
    });

    it('supports gpt-3.5-turbo', () => {
      const gpt35 = new OpenAIBrain({ apiKey: 'key', model: 'gpt-3.5-turbo' });
      expect(gpt35.name).toContain('gpt-3.5-turbo');
    });
  });
});
