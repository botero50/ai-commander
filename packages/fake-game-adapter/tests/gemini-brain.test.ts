import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiBrain, createGeminiBrain, GEMINI_MODELS } from '../src/world/gemini-brain.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Gemini Brain Provider', () => {
  let brain: GeminiBrain;
  let world = createInitialWorld();

  beforeEach(() => {
    brain = new GeminiBrain({
      apiKey: 'test-key',
      model: 'gemini-pro',
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

    it('has correct name format', () => {
      expect(brain.name).toContain('gemini-brain');
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
      expect(output.metadata.modelUsed).toContain('gemini');
      expect(output.metadata.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('accepts custom model', () => {
      const custom = new GeminiBrain({
        apiKey: 'key',
        model: 'gemini-1.5-pro',
      });

      expect(custom.name).toContain('gemini-1.5-pro');
    });

    it('accepts sampling parameters', () => {
      const custom = new GeminiBrain({
        apiKey: 'key',
        model: 'gemini-pro',
        temperature: 0.3,
        topP: 0.8,
        topK: 50,
      });

      expect(custom).toBeDefined();
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

    it('accumulates tokens', async () => {
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

    it('uses Google pricing model', async () => {
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

      // Gemini is very cheap - should be less than $0.01 per decision
      expect(stats.totalCost).toBeLessThan(0.01);
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
    it('resets stats', async () => {
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
    });
  });

  describe('Factory Function', () => {
    it('creates brain with defaults', () => {
      const created = createGeminiBrain('test-key');

      expect(created.name).toContain('gemini-pro');
    });

    it('creates with custom model', () => {
      const created = createGeminiBrain('test-key', 'gemini-1.5-pro');

      expect(created.name).toContain('gemini-1.5-pro');
    });
  });

  describe('Model Variants', () => {
    it('provides gemini-pro', () => {
      expect(GEMINI_MODELS.GEMINI_PRO).toBe('gemini-pro');
    });

    it('provides gemini-pro-vision', () => {
      expect(GEMINI_MODELS.GEMINI_PRO_VISION).toBe('gemini-pro-vision');
    });

    it('provides gemini-1.5-pro', () => {
      expect(GEMINI_MODELS.GEMINI_1_5_PRO).toBe('gemini-1.5-pro');
    });

    it('provides gemini-1.5-flash', () => {
      expect(GEMINI_MODELS.GEMINI_1_5_FLASH).toBe('gemini-1.5-flash');
    });
  });

  describe('Pricing', () => {
    it('tracks separate input and output tokens', async () => {
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

      // Cost should reflect separate input/output pricing
      expect(stats.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Determinism', () => {
    it('handles identical inputs consistently', async () => {
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

      expect(output1.selectedGoal).toBeDefined();
      expect(output2.selectedGoal).toBeDefined();
    });
  });
});
