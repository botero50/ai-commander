import { describe, it, expect, beforeEach } from 'vitest';
import { BuiltinBrain, globalBrainRegistry, BrainRegistry, type BrainInput } from '../src/world/brain-sdk.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Brain SDK', () => {
  let brain: BuiltinBrain;
  let world = createInitialWorld();

  beforeEach(() => {
    brain = new BuiltinBrain();
    world = createInitialWorld();
  });

  describe('Brain Interface', () => {
    it('has required properties', () => {
      expect(brain.name).toBeDefined();
      expect(brain.version).toBeDefined();
      expect(brain.decide).toBeDefined();
      expect(brain.updateMemory).toBeDefined();
      expect(brain.reset).toBeDefined();
    });

    it('returns builtin-ai-commander name', () => {
      expect(brain.name).toBe('builtin-ai-commander');
    });

    it('has version string', () => {
      expect(brain.version).toMatch(/\d+\.\d+/);
    });
  });

  describe('Decision Making', () => {
    it('makes decision from input', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [
          {
            id: 'gather',
            name: 'gather-resources',
            description: 'Gather resources from deposits',
            priority: 80,
            reward: 50,
          },
          {
            id: 'produce',
            name: 'produce-worker',
            description: 'Produce additional worker',
            priority: 60,
            reward: 30,
          },
        ],
        availableActions: [
          {
            action: 'move',
            description: 'Move unit',
            precondition: 'has-unit',
            estimatedDuration: 10,
          },
          {
            action: 'gather',
            description: 'Gather resources',
            precondition: 'at-resource',
            estimatedDuration: 1,
          },
        ],
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
      expect(output.metadata).toBeDefined();
    });

    it('includes reasoning in output', async () => {
      const input: BrainInput = {
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

      expect(output.reasoning.thought).toBeDefined();
      expect(output.reasoning.analysis).toBeDefined();
      expect(output.reasoning.riskAssessment).toBeDefined();
      expect(output.reasoning.confidence).toBeGreaterThanOrEqual(0);
      expect(output.reasoning.confidence).toBeLessThanOrEqual(100);
    });

    it('returns selected goal', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [
          { id: 'goal1', name: 'goal1', description: 'First goal', priority: 50, reward: 10 },
          { id: 'goal2', name: 'goal2', description: 'Second goal', priority: 80, reward: 20 },
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

      expect(['goal1', 'goal2']).toContain(output.selectedGoal);
    });

    it('includes plan with steps', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [{ id: 'gather', name: 'gather-resources', description: 'Gather', priority: 80, reward: 50 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      expect(output.plan.immediateGoal).toBeDefined();
      expect(output.plan.steps.length).toBeGreaterThan(0);
      expect(output.plan.alternativePlans.length).toBeGreaterThan(0);
      expect(output.plan.estimatedDuration).toBeGreaterThan(0);
    });

    it('returns commands array', async () => {
      const input: BrainInput = {
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

      expect(Array.isArray(output.commands)).toBe(true);
    });

    it('includes metadata', async () => {
      const input: BrainInput = {
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
      expect(output.metadata.modelUsed).toBe('builtin-ai-commander');
      expect(output.metadata.confidence).toBeGreaterThanOrEqual(0);
      expect(output.metadata.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Decision Context', () => {
    it('adapts decision to threat level', async () => {
      const threatWorld = { ...world, knownEnemies: new Array(6) } as any;

      const input: BrainInput = {
        world: threatWorld,
        availableGoals: [
          { id: 'gather', name: 'gather', description: 'Gather', priority: 50, reward: 10 },
          { id: 'defense', name: 'defense', description: 'Defend', priority: 100, reward: 100 },
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

      expect(output.reasoning.riskAssessment).toContain('CRITICAL');
    });

    it('adapts decision to resource shortage', async () => {
      const shortageWorld = {
        ...world,
        playerResources: 20,
        workers: [{ id: 0, x: 0, y: 0, carrying: 0, busy: false }],
      } as any;

      const input: BrainInput = {
        world: shortageWorld,
        availableGoals: [{ id: 'gather', name: 'gather', description: 'Gather', priority: 80, reward: 50 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      expect(output.reasoning.thought).toContain('Resource');
    });

    it('generates gather plan when needed', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [{ id: 'gather', name: 'gather-resources', description: 'Gather', priority: 80, reward: 50 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      // Check that the goal was selected and plan reflects it
      expect(output.selectedGoal).toBe('gather');
      expect(output.plan.steps.some((s) => s.toLowerCase().includes('gather'))).toBe(true);
    });

    it('generates military plan when threats exist', async () => {
      const threatWorld = { ...world, knownEnemies: new Array(3) } as any;

      const input: BrainInput = {
        world: threatWorld,
        availableGoals: [{ id: 'defense', name: 'defense', description: 'Defend', priority: 100, reward: 100 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      const output = await brain.decide(input);

      expect(output.plan.steps.length).toBeGreaterThan(0);
    });
  });

  describe('Memory Management', () => {
    it('updates memory after decision', () => {
      brain.updateMemory(world, [], true);
      // Just verify no error
      expect(true).toBe(true);
    });

    it('accepts execution history', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [
          { tick: 0, commandsIssued: 1, successRate: 0.9 },
          { tick: 1, commandsIssued: 2, successRate: 0.95 },
        ],
      };

      const output = await brain.decide(input);
      expect(output).toBeDefined();
    });

    it('resets on reset call', () => {
      brain.reset();
      // Verify brain is still functional
      expect(brain.name).toBe('builtin-ai-commander');
    });
  });

  describe('Determinism', () => {
    it('produces consistent decisions for same input', async () => {
      const input: BrainInput = {
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

      expect(output1.selectedGoal).toBe(output2.selectedGoal);
      expect(output1.commands.length).toBe(output2.commands.length);
    });
  });

  describe('Brain Registry', () => {
    it('registers brain', () => {
      const registry = new BrainRegistry();
      registry.register('test-brain', brain);

      const retrieved = registry.get('test-brain');
      expect(retrieved).toBe(brain);
    });

    it('retrieves registered brain', () => {
      const registry = new BrainRegistry();
      registry.register('builtin', brain);

      const retrieved = registry.get('builtin');
      expect(retrieved?.name).toBe('builtin-ai-commander');
    });

    it('lists all registered brains', () => {
      const registry = new BrainRegistry();
      registry.register('brain1', brain);

      const brain2 = new BuiltinBrain();
      registry.register('brain2', brain2);

      const list = registry.list();
      expect(list.length).toBe(2);
    });

    it('handles unregistered brain lookup', () => {
      const registry = new BrainRegistry();
      const retrieved = registry.get('nonexistent');

      expect(retrieved).toBeUndefined();
    });

    it('resets all brains', () => {
      const registry = new BrainRegistry();
      registry.register('brain1', brain);

      registry.reset();
      // Verify no error
      expect(true).toBe(true);
    });
  });

  describe('Global Registry', () => {
    it('includes builtin brain', () => {
      const builtin = globalBrainRegistry.get('builtin');
      expect(builtin).toBeDefined();
      expect(builtin?.name).toBe('builtin-ai-commander');
    });

    it('lists available brains', () => {
      const list = globalBrainRegistry.list();
      expect(list.length).toBeGreaterThan(0);
    });
  });

  describe('Command Generation', () => {
    it('generates valid commands', async () => {
      const input: BrainInput = {
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

    it('includes reasoning for goal selection', async () => {
      const input: BrainInput = {
        world,
        availableGoals: [
          { id: 'g1', name: 'gather', description: 'Gather', priority: 60, reward: 30 },
          { id: 'g2', name: 'produce', description: 'Produce', priority: 40, reward: 20 },
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

      expect(output.reasoning.thought).toBeDefined();
      expect(output.reasoning.thought.length).toBeGreaterThan(0);
    });
  });

  describe('Extensibility', () => {
    it('allows custom brain implementation', async () => {
      // Demonstrate that custom brains can implement the Brain interface
      const customBrain = {
        name: 'custom-brain',
        version: '1.0',
        async decide(input: BrainInput) {
          return {
            reasoning: {
              thought: 'Custom thought',
              analysis: 'Custom analysis',
              riskAssessment: 'Low risk',
              confidence: 90,
            },
            selectedGoal: 'custom-goal',
            plan: {
              immediateGoal: 'custom-goal',
              steps: Object.freeze(['Step 1', 'Step 2']),
              alternativePlans: Object.freeze([]),
              estimatedDuration: 100,
            },
            commands: Object.freeze([]),
            metadata: {
              thinkingTimeMs: 10,
              modelUsed: 'custom-brain',
              confidence: 90,
            },
          };
        },
        updateMemory: () => {},
        reset: () => {},
      };

      const registry = new BrainRegistry();
      registry.register('custom', customBrain);

      const output = await customBrain.decide({
        world,
        availableGoals: [],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      });

      expect(output.reasoning.thought).toBe('Custom thought');
    });
  });
});
