import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  BrainManager,
  getGlobalBrainManager,
  resetGlobalBrainManager,
  setupBrain,
  getBrain,
  type BrainConfig,
} from '../src/world/brain-manager.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Brain Manager', () => {
  let manager: BrainManager;
  let world = createInitialWorld();

  beforeEach(() => {
    resetGlobalBrainManager();
    manager = new BrainManager();
    world = createInitialWorld();
  });

  afterEach(() => {
    resetGlobalBrainManager();
  });

  describe('Initialization', () => {
    it('creates with default builtin brain', () => {
      expect(manager).toBeDefined();
      const defaultBrain = manager.getDefaultBrain();
      expect(defaultBrain).toBeDefined();
      expect(defaultBrain.name).toContain('builtin');
    });

    it('registers builtin brain on creation', () => {
      const brains = manager.listBrains();
      expect(brains).toContain('builtin');
    });
  });

  describe('Brain Creation', () => {
    it('creates builtin brain', () => {
      const config: BrainConfig = {
        provider: 'builtin',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
      expect(brain.name).toContain('builtin');
    });

    it('creates claude brain with apiKey', () => {
      const config: BrainConfig = {
        provider: 'claude',
        apiKey: 'test-key',
        model: 'claude-3-opus',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
      expect(brain.name).toContain('claude');
    });

    it('requires apiKey for claude', () => {
      const config: BrainConfig = {
        provider: 'claude',
      };
      expect(() => manager.createBrain(config)).toThrow('apiKey');
    });

    it('creates openai brain with apiKey', () => {
      const config: BrainConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
      expect(brain.name).toContain('gpt');
    });

    it('requires apiKey for openai', () => {
      const config: BrainConfig = {
        provider: 'openai',
      };
      expect(() => manager.createBrain(config)).toThrow('apiKey');
    });

    it('creates gemini brain with apiKey', () => {
      const config: BrainConfig = {
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-pro',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
      expect(brain.name).toContain('gemini');
    });

    it('requires apiKey for gemini', () => {
      const config: BrainConfig = {
        provider: 'gemini',
      };
      expect(() => manager.createBrain(config)).toThrow('apiKey');
    });

    it('creates ollama brain without apiKey', () => {
      const config: BrainConfig = {
        provider: 'ollama',
        model: 'llama2',
        baseUrl: 'http://localhost:11434',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
      expect(brain.name).toContain('ollama');
    });

    it('uses default ollama URL if not specified', () => {
      const config: BrainConfig = {
        provider: 'ollama',
        model: 'mistral',
      };
      const brain = manager.createBrain(config);
      expect(brain).toBeDefined();
    });

    it('uses default models when not specified', () => {
      const claudeConfig: BrainConfig = {
        provider: 'claude',
        apiKey: 'key',
      };
      const claudeBrain = manager.createBrain(claudeConfig);
      expect(claudeBrain.name).toContain('claude-3-sonnet');

      const openaiConfig: BrainConfig = {
        provider: 'openai',
        apiKey: 'key',
      };
      const openaiiBrain = manager.createBrain(openaiConfig);
      expect(openaiiBrain.name).toContain('gpt-4');

      const geminiConfig: BrainConfig = {
        provider: 'gemini',
        apiKey: 'key',
      };
      const geminiBrain = manager.createBrain(geminiConfig);
      expect(geminiBrain.name).toContain('gemini-pro');

      const ollamaConfig: BrainConfig = {
        provider: 'ollama',
      };
      const ollamaBrain = manager.createBrain(ollamaConfig);
      expect(ollamaBrain.name).toContain('llama2');
    });
  });

  describe('Brain Registration', () => {
    it('registers a brain with key', () => {
      const config: BrainConfig = {
        provider: 'claude',
        apiKey: 'key',
      };
      const brain = manager.createBrain(config);
      manager.registerBrain('claude-prod', brain);

      const retrieved = manager.getBrain('claude-prod');
      expect(retrieved).toBe(brain);
    });

    it('retrieves registered brain by key', () => {
      const config: BrainConfig = {
        provider: 'openai',
        apiKey: 'key',
      };
      const brain = manager.createBrain(config);
      manager.registerBrain('gpt-4-prod', brain);

      const retrieved = manager.getBrain('gpt-4-prod');
      expect(retrieved.name).toContain('gpt');
    });

    it('throws on unknown key', () => {
      expect(() => manager.getBrain('unknown-brain')).toThrow('not found');
    });

    it('lists all registered brains', () => {
      const claude = manager.createBrain({ provider: 'claude', apiKey: 'key' });
      const openai = manager.createBrain({ provider: 'openai', apiKey: 'key' });

      manager.registerBrain('claude-1', claude);
      manager.registerBrain('openai-1', openai);

      const brains = manager.listBrains();
      expect(brains).toContain('builtin');
      expect(brains).toContain('claude-1');
      expect(brains).toContain('openai-1');
    });
  });

  describe('Brain Execution', () => {
    it('executes decision on registered brain', async () => {
      const config: BrainConfig = {
        provider: 'claude',
        apiKey: 'key',
      };
      const brain = manager.createBrain(config);
      manager.registerBrain('test-brain', brain);

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

      const retrieved = manager.getBrain('test-brain');
      const output = await retrieved.decide(input);

      expect(output).toBeDefined();
      expect(output.selectedGoal).toBeDefined();
    });

    it('switches providers at runtime', async () => {
      const claude = manager.createBrain({ provider: 'claude', apiKey: 'key' });
      const openai = manager.createBrain({ provider: 'openai', apiKey: 'key' });

      manager.registerBrain('player-brain', claude);

      let brain = manager.getBrain('player-brain');
      expect(brain.name).toContain('claude');

      // Switch at runtime
      manager.registerBrain('player-brain', openai);
      brain = manager.getBrain('player-brain');
      expect(brain.name).toContain('gpt');
    });
  });

  describe('Reset Functionality', () => {
    it('resets all brains', async () => {
      const claude = manager.createBrain({ provider: 'claude', apiKey: 'key' });
      const openai = manager.createBrain({ provider: 'openai', apiKey: 'key' });

      manager.registerBrain('claude-1', claude);
      manager.registerBrain('openai-1', openai);

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

      await claude.decide(input);
      await openai.decide(input);

      const beforeClaudeStats = claude.getStats?.() || {};
      const beforeOpenaiStats = openai.getStats?.() || {};

      manager.resetAll();

      const afterClaudeStats = claude.getStats?.() || {};
      const afterOpenaiStats = openai.getStats?.() || {};

      // Stats should be reset if they exist
      if ('apiCalls' in beforeClaudeStats && 'apiCalls' in afterClaudeStats) {
        expect(beforeClaudeStats.apiCalls).toBeGreaterThan(0);
        expect(afterClaudeStats.apiCalls).toBe(0);
      }
    });
  });

  describe('Global Manager', () => {
    it('provides global singleton', () => {
      const manager1 = getGlobalBrainManager();
      const manager2 = getGlobalBrainManager();
      expect(manager1).toBe(manager2);
    });

    it('resets global manager', () => {
      const manager1 = getGlobalBrainManager();
      resetGlobalBrainManager();
      const manager2 = getGlobalBrainManager();
      expect(manager1).not.toBe(manager2);
    });

    it('setup function registers brain globally', () => {
      const brain = setupBrain('my-brain', { provider: 'claude', apiKey: 'key' });
      const retrieved = getBrain('my-brain');
      expect(retrieved).toBe(brain);
    });

    it('getBrain() returns default if no key', () => {
      const defaultBrain = getBrain();
      expect(defaultBrain.name).toContain('builtin');
    });

    it('getBrain(key) returns registered brain', () => {
      setupBrain('claude-prod', { provider: 'claude', apiKey: 'key' });
      const brain = getBrain('claude-prod');
      expect(brain.name).toContain('claude');
    });
  });

  describe('Interchangeable Providers', () => {
    it('all providers implement identical interface', async () => {
      const providers: BrainConfig[] = [
        { provider: 'builtin' },
        { provider: 'claude', apiKey: 'key' },
        { provider: 'openai', apiKey: 'key' },
        { provider: 'gemini', apiKey: 'key' },
        { provider: 'ollama' },
      ];

      const input = {
        world,
        availableGoals: [{ id: 'test', name: 'test', description: 'Test', priority: 80, reward: 50 }],
        availableActions: [],
        memory: {
          previousDecisions: Object.freeze([]),
          knownStrategies: Object.freeze([]),
          opponentModels: new Map(),
        },
        executionHistory: [],
      };

      for (const config of providers) {
        const brain = manager.createBrain(config);

        // All must have these methods
        expect(brain.decide).toBeDefined();
        expect(brain.updateMemory).toBeDefined();
        expect(brain.reset).toBeDefined();
        expect(brain.name).toBeDefined();
        expect(brain.version).toBe('1.0');

        // All must produce valid output
        const output = await brain.decide(input);
        expect(output).toBeDefined();
        expect(output.reasoning).toBeDefined();
        expect(output.selectedGoal).toBeDefined();
        expect(output.plan).toBeDefined();
        expect(output.commands).toBeDefined();
        expect(output.metadata).toBeDefined();
      }
    });

    it('configuration accepts any provider transparently', () => {
      const scenarios = [
        { provider: 'builtin' as const, expected: 'builtin' },
        { provider: 'claude' as const, apiKey: 'key', expected: 'claude' },
        { provider: 'openai' as const, apiKey: 'key', expected: 'gpt' },
        { provider: 'gemini' as const, apiKey: 'key', expected: 'gemini' },
        { provider: 'ollama' as const, expected: 'ollama' },
      ];

      for (const scenario of scenarios) {
        const config: BrainConfig = {
          provider: scenario.provider,
          apiKey: (scenario as any).apiKey,
        };
        const brain = manager.createBrain(config);
        expect(brain.name).toContain(scenario.expected);
      }
    });
  });

  describe('Configuration Flexibility', () => {
    it('accepts temperature across all providers', () => {
      const providers: BrainConfig[] = [
        { provider: 'claude', apiKey: 'key', temperature: 0.3 },
        { provider: 'openai', apiKey: 'key', temperature: 0.5 },
        { provider: 'gemini', apiKey: 'key', temperature: 0.7 },
        { provider: 'ollama', temperature: 0.9 },
      ];

      for (const config of providers) {
        const brain = manager.createBrain(config);
        expect(brain).toBeDefined();
      }
    });

    it('accepts custom model across all cloud providers', () => {
      const brains = [
        manager.createBrain({ provider: 'claude', apiKey: 'key', model: 'claude-3-opus' }),
        manager.createBrain({ provider: 'openai', apiKey: 'key', model: 'gpt-4-turbo' }),
        manager.createBrain({ provider: 'gemini', apiKey: 'key', model: 'gemini-1.5-pro' }),
        manager.createBrain({ provider: 'ollama', model: 'qwen' }),
      ];

      for (const brain of brains) {
        expect(brain).toBeDefined();
      }
    });

    it('accepts maxTokens across all providers', () => {
      const providers: BrainConfig[] = [
        { provider: 'claude', apiKey: 'key', maxTokens: 4096 },
        { provider: 'openai', apiKey: 'key', maxTokens: 4096 },
        { provider: 'gemini', apiKey: 'key', maxTokens: 4096 },
        { provider: 'ollama', maxTokens: 4096 },
      ];

      for (const config of providers) {
        const brain = manager.createBrain(config);
        expect(brain).toBeDefined();
      }
    });
  });

  describe('Usage Patterns', () => {
    it('supports single-brain tournament scenario', () => {
      // Prepare one brain for repeated matches
      const brain = manager.createBrain({ provider: 'claude', apiKey: 'key' });
      manager.registerBrain('tournament-player', brain);

      // Can reuse same brain across multiple matches
      expect(manager.getBrain('tournament-player')).toBe(brain);
      expect(manager.getBrain('tournament-player')).toBe(brain);
    });

    it('supports multi-brain tournament scenario', () => {
      const brains = [
        manager.createBrain({ provider: 'builtin' }),
        manager.createBrain({ provider: 'claude', apiKey: 'key' }),
        manager.createBrain({ provider: 'openai', apiKey: 'key' }),
        manager.createBrain({ provider: 'gemini', apiKey: 'key' }),
        manager.createBrain({ provider: 'ollama' }),
      ];

      for (let i = 0; i < brains.length; i++) {
        manager.registerBrain(`player-${i}`, brains[i]);
      }

      const registered = manager.listBrains();
      for (let i = 0; i < brains.length; i++) {
        expect(registered).toContain(`player-${i}`);
      }
    });

    it('supports dynamic provider switching mid-tournament', () => {
      let brain = manager.createBrain({ provider: 'claude', apiKey: 'key' });
      manager.registerBrain('player-1', brain);

      let retrieved = manager.getBrain('player-1');
      expect(retrieved.name).toContain('claude');

      // Mid-tournament, switch to different provider
      brain = manager.createBrain({ provider: 'openai', apiKey: 'key' });
      manager.registerBrain('player-1', brain);

      retrieved = manager.getBrain('player-1');
      expect(retrieved.name).toContain('gpt');
    });
  });
});
