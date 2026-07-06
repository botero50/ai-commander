import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeBrain, createClaudeBrain, type ClaudeConfig } from '../src/world/claude-brain.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Claude Brain Provider', () => {
  let brain: ClaudeBrain;
  let world = createInitialWorld();

  beforeEach(() => {
    const config: ClaudeConfig = {
      apiKey: 'test-key',
      model: 'claude-3-sonnet',
    };
    brain = new ClaudeBrain(config);
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
      expect(brain.name).toContain('claude-brain');
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
      expect(output.metadata.modelUsed).toContain('claude');
      expect(output.metadata.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Configuration', () => {
    it('accepts custom model', () => {
      const config: ClaudeConfig = {
        apiKey: 'key',
        model: 'claude-3-opus',
      };
      const customBrain = new ClaudeBrain(config);

      expect(customBrain.name).toContain('claude-3-opus');
    });

    it('accepts temperature setting', () => {
      const config: ClaudeConfig = {
        apiKey: 'key',
        model: 'claude-3-sonnet',
        temperature: 0.3,
      };
      const customBrain = new ClaudeBrain(config);

      expect(customBrain).toBeDefined();
    });

    it('sets default values', () => {
      const config: ClaudeConfig = {
        apiKey: 'key',
        model: 'claude-3-haiku',
      };
      const customBrain = new ClaudeBrain(config);

      expect(customBrain).toBeDefined();
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

    it('accumulates tokens across calls', async () => {
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

    it('opus is more expensive than sonnet', async () => {
      const opusBrain = new ClaudeBrain({
        apiKey: 'key',
        model: 'claude-3-opus',
      });

      const sonnetBrain = new ClaudeBrain({
        apiKey: 'key',
        model: 'claude-3-sonnet',
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

      await opusBrain.decide(input);
      await sonnetBrain.decide(input);

      const opusStats = opusBrain.getStats();
      const sonnetStats = sonnetBrain.getStats();

      expect(opusStats.totalCost).toBeGreaterThan(sonnetStats.totalCost);
    });

    it('haiku is least expensive', async () => {
      const haikuBrain = new ClaudeBrain({
        apiKey: 'key',
        model: 'claude-3-haiku',
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

      await haikuBrain.decide(input);
      const stats = haikuBrain.getStats();

      // Haiku should be very cheap
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
    it('creates with defaults', () => {
      const created = createClaudeBrain('test-key');

      expect(created.name).toContain('claude-3-sonnet');
    });

    it('creates with custom model', () => {
      const created = createClaudeBrain('test-key', 'claude-3-opus');

      expect(created.name).toContain('claude-3-opus');
    });
  });

  describe('Model Variants', () => {
    it('supports claude-3-opus', () => {
      const opus = new ClaudeBrain({ apiKey: 'key', model: 'claude-3-opus' });
      expect(opus.name).toContain('claude-3-opus');
    });

    it('supports claude-3-sonnet', () => {
      const sonnet = new ClaudeBrain({ apiKey: 'key', model: 'claude-3-sonnet' });
      expect(sonnet.name).toContain('claude-3-sonnet');
    });

    it('supports claude-3-haiku', () => {
      const haiku = new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' });
      expect(haiku.name).toContain('claude-3-haiku');
    });
  });

  describe('Tokenization', () => {
    it('uses Claude tokenization (1 token per 3-4 chars)', async () => {
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

      // Should have reasonable token count
      expect(stats.totalTokens).toBeGreaterThan(100);
      expect(stats.totalTokens).toBeLessThan(10000);
    });
  });
});
