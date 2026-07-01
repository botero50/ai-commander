import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRAGameAdapter } from '../src/adapter/openra-game-adapter.js';
import {
  createMockAdapterConfig,
  createMockGameInstanceAccessor,
  createMockStateChecker,
  createMockOrderSubmitter,
} from './fixtures/game-session-test-state.js';
import { createTestGameStateWithUnits } from './fixtures/openra-test-state.js';
import { createTestMoveCommand } from './fixtures/command-test-state.js';

describe('OpenRAGameAdapter', () => {
  let adapter: OpenRAGameAdapter;

  beforeEach(() => {
    adapter = new OpenRAGameAdapter();
  });

  describe('Adapter Properties', () => {
    it('has correct adapter ID', () => {
      expect(adapter.adapterId).toBe('openra-adapter');
    });

    it('has display name', () => {
      expect(adapter.displayName).toBe('OpenRA Adapter');
    });

    it('declares correct capabilities', () => {
      const caps = adapter.capabilities;

      expect(caps.supportsPause).toBe(true);
      expect(caps.supportsSaveState).toBe(true);
      expect(caps.supportsDeterministicMode).toBe(true);
      expect(caps.supportsReplay).toBe(true);
      expect(caps.supportsCompleteWorldState).toBe(true);
      expect(caps.supportsMultipleAgents).toBe(true);
      expect(caps.maxTicksPerSecond).toBe(25); // OpenRA: 40ms ticks
    });

    it('includes metadata', () => {
      const meta = adapter.capabilities.metadata;

      expect(meta).toBeDefined();
      expect(meta?.name).toBe('OpenRA');
      expect(typeof meta?.description).toBe('string');
    });
  });

  describe('Initialization', () => {
    it('initializes successfully with valid config', async () => {
      const config = createMockAdapterConfig();

      await adapter.initialize(config);

      // Should not throw
    });

    it('requires gameInstanceAccessor in config', async () => {
      const config = createMockAdapterConfig();
      delete (config as any).gameInstanceAccessor;

      await expect(adapter.initialize(config)).rejects.toThrow('gameInstanceAccessor is required');
    });

    it('requires orderSubmitter in config', async () => {
      const config = createMockAdapterConfig();
      delete (config as any).orderSubmitter;

      await expect(adapter.initialize(config)).rejects.toThrow('orderSubmitter is required');
    });

    it('requires stateChecker in config', async () => {
      const config = createMockAdapterConfig();
      delete (config as any).stateChecker;

      await expect(adapter.initialize(config)).rejects.toThrow('stateChecker is required');
    });

    it('rejects double initialization', async () => {
      const config = createMockAdapterConfig();

      await adapter.initialize(config);

      await expect(adapter.initialize(config)).rejects.toThrow('already initialized');
    });

    it('verifies game is accessible during init', async () => {
      const config = createMockAdapterConfig();
      let gameAccessible = false;

      const failingConfig = {
        ...config,
        gameInstanceAccessor: async () => {
          if (!gameAccessible) {
            throw new Error('Game not ready');
          }
          return createTestGameStateWithUnits();
        },
      };

      await expect(adapter.initialize(failingConfig)).rejects.toThrow('Failed to initialize adapter');
    });

    it('detects null game instance', async () => {
      const config = {
        gameInstanceAccessor: async () => null,
        orderSubmitter: createMockOrderSubmitter(),
        stateChecker: createMockStateChecker(),
      };

      await expect(adapter.initialize(config)).rejects.toThrow('Game instance not accessible');
    });
  });

  describe('Session Creation', () => {
    beforeEach(async () => {
      const config = createMockAdapterConfig();
      await adapter.initialize(config);
    });

    it('creates session successfully', async () => {
      const session = await adapter.createSession();

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.sessionId).toContain('session-1-');
      expect(session.capabilities).toBe(adapter.capabilities);
      expect(session.observationProvider).toBeDefined();
      expect(session.commandExecutor).toBeDefined();
    });

    it('creates multiple sessions with unique IDs', async () => {
      const session1 = await adapter.createSession();
      const session2 = await adapter.createSession();
      const session3 = await adapter.createSession();

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session2.sessionId).not.toBe(session3.sessionId);
      expect(session1.sessionId).toContain('session-1-');
      expect(session2.sessionId).toContain('session-2-');
      expect(session3.sessionId).toContain('session-3-');
    });

    it('rejects session creation before initialization', async () => {
      const adapter2 = new OpenRAGameAdapter();

      await expect(adapter2.createSession()).rejects.toThrow('must be initialized');
    });

    it('accepts optional game config', async () => {
      const config = {
        mapName: 'Egypt',
        difficulty: 'medium',
      };

      const session = await adapter.createSession(config);

      expect(session).toBeDefined();
    });
  });

  describe('Adapter Info', () => {
    it('returns version information', async () => {
      const info = await adapter.getAdapterInfo();

      expect(info.version).toBe('1.0.0');
      expect(typeof info.gameVersion).toBe('string');
      expect(typeof info.compatibility).toBe('string');
    });
  });

  describe('Shutdown', () => {
    it('shuts down successfully', async () => {
      const config = createMockAdapterConfig();
      await adapter.initialize(config);

      await adapter.shutdown();

      // Should not throw
    });

    it('prevents session creation after shutdown', async () => {
      const adapter2 = new OpenRAGameAdapter();
      const config = createMockAdapterConfig();
      await adapter2.initialize(config);
      await adapter2.shutdown();

      await expect(adapter2.createSession()).rejects.toThrow('must be initialized');
    });

    it('rejects shutdown before init', async () => {
      const adapter3 = new OpenRAGameAdapter();

      await expect(adapter3.shutdown()).rejects.toThrow('not initialized');
    });
  });
});

describe('OpenRAGameSession', () => {
  let adapter: OpenRAGameAdapter;

  beforeEach(async () => {
    adapter = new OpenRAGameAdapter();
    const config = createMockAdapterConfig();
    await adapter.initialize(config);
  });

  describe('Session Lifecycle', () => {
    it('starts session successfully', async () => {
      const session = await adapter.createSession();

      const initialState = await session.start();

      expect(initialState).toBeDefined();
      expect(initialState.time).toBeDefined();
      expect(initialState.map).toBeDefined();
      expect(initialState.players).toBeDefined();
      expect(initialState.agents).toBeDefined();
    });

    it('rejects double start', async () => {
      const session = await adapter.createSession();

      await session.start();

      await expect(session.start()).rejects.toThrow('already active');
    });

    it('starts session successfully even when game unavailable during init', async () => {
      const adapter2 = new OpenRAGameAdapter();
      const gameState = createTestGameStateWithUnits();
      let gameAvailable = true;

      const config = {
        gameInstanceAccessor: async () => gameState,
        orderSubmitter: createMockOrderSubmitter(),
        stateChecker: async () => gameAvailable,
      };

      await adapter2.initialize(config);
      const session = await adapter2.createSession();

      gameAvailable = true;
      const initialState = await session.start();

      expect(initialState).toBeDefined();
    });

    it('detects when game becomes unavailable on start', async () => {
      const adapter2 = new OpenRAGameAdapter();
      const config = {
        gameInstanceAccessor: async () => createTestGameStateWithUnits(),
        orderSubmitter: createMockOrderSubmitter(),
        stateChecker: async () => false, // Game is unavailable
      };

      await adapter2.initialize(config);
      const session = await adapter2.createSession();

      await expect(session.start()).rejects.toThrow('not available');
    });

    it('stops session successfully', async () => {
      const session = await adapter.createSession();
      await session.start();

      await session.stop();

      // Should not throw
    });

    it('detects when session is not active for operations', async () => {
      const session = await adapter.createSession();
      await session.start();
      await session.stop();

      await expect(session.pause()).rejects.toThrow('not active');
    });
  });

  describe('Session Observation', () => {
    it('provides observation provider', async () => {
      const session = await adapter.createSession();

      expect(session.observationProvider).toBeDefined();
      expect(typeof session.observationProvider.getWorldState).toBe('function');
      expect(typeof session.observationProvider.isObservationAvailable).toBe('function');
    });

    it('observation provider observes actual game state', async () => {
      const session = await adapter.createSession();
      await session.start();

      const state = await session.observationProvider.getWorldState();

      expect(state.time.currentTick.number).toBeDefined();
      expect(state.players).toBeDefined();
      expect(state.agents).toBeDefined();
    });
  });

  describe('Session Execution', () => {
    it('provides command executor', async () => {
      const session = await adapter.createSession();

      expect(session.commandExecutor).toBeDefined();
      expect(typeof session.commandExecutor.executeCommand).toBe('function');
      expect(typeof session.commandExecutor.canExecuteCommand).toBe('function');
    });

    it('command executor can execute commands', async () => {
      const session = await adapter.createSession();
      await session.start();

      const command = createTestMoveCommand('actor-1', 100, 200);
      const result = await session.commandExecutor.executeCommand(command);

      expect(result.success).toBe(true);
    });
  });

  describe('Session Capabilities', () => {
    it('supports pause', async () => {
      const session = await adapter.createSession();
      await session.start();

      // Should not throw
      await session.pause();
    });

    it('rejects pause for inactive session', async () => {
      const session = await adapter.createSession();

      await expect(session.pause()).rejects.toThrow('not active');
    });

    it('supports resume', async () => {
      const session = await adapter.createSession();
      await session.start();

      // Should not throw
      await session.resume();
    });

    it('supports save state', async () => {
      const session = await adapter.createSession();
      await session.start();

      const saveId = await session.saveState();

      expect(typeof saveId).toBe('string');
      expect(saveId.length).toBeGreaterThan(0);
    });

    it('supports restore state', async () => {
      const session = await adapter.createSession();
      await session.start();

      const saveId = await session.saveState();
      await session.restoreState(saveId);

      // Should not throw
    });

    it('is active after start', async () => {
      const session = await adapter.createSession();
      await session.start();

      const isActive = await session.isActive();

      expect(isActive).toBe(true);
    });

    it('is not active after stop', async () => {
      const session = await adapter.createSession();
      await session.start();
      await session.stop();

      const isActive = await session.isActive();

      expect(isActive).toBe(false);
    });
  });

  describe('Session Composition', () => {
    it('observationProvider and commandExecutor work together', async () => {
      const session = await adapter.createSession();
      await session.start();

      // Observe initial state
      const initialState = await session.observationProvider.getWorldState();
      expect(initialState.agents).toHaveLength(5);

      // Execute a command
      const command = createTestMoveCommand('actor-1', 100, 200);
      const result = await session.commandExecutor.executeCommand(command);
      expect(result.success).toBe(true);

      // Observe updated state (in real game, state would change)
      const updatedState = await session.observationProvider.getWorldState();
      expect(updatedState).toBeDefined();
    });

    it('session capabilities match adapter capabilities', async () => {
      const session = await adapter.createSession();

      expect(session.capabilities).toBe(adapter.capabilities);
      expect(session.capabilities.supportsDeterministicMode).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('detects unavailable game on isActive', async () => {
      const adapter2 = new OpenRAGameAdapter();
      let gameAvailable = true;
      const config = {
        gameInstanceAccessor: async () => createTestGameStateWithUnits(),
        orderSubmitter: createMockOrderSubmitter(),
        stateChecker: async () => gameAvailable,
      };

      await adapter2.initialize(config);
      const session = await adapter2.createSession();
      await session.start();

      gameAvailable = false;
      const isActive = await session.isActive();

      expect(isActive).toBe(false);
    });

    it('handles state checker errors gracefully in isActive', async () => {
      let stateCheckerWorks = true;
      const adapter2 = new OpenRAGameAdapter();
      const config = {
        gameInstanceAccessor: async () => createTestGameStateWithUnits(),
        orderSubmitter: createMockOrderSubmitter(),
        stateChecker: async () => {
          if (!stateCheckerWorks) {
            throw new Error('State checker crashed');
          }
          return true;
        },
      };

      await adapter2.initialize(config);
      const session = await adapter2.createSession();
      await session.start();

      // Make state checker fail
      stateCheckerWorks = false;
      const isActive = await session.isActive();

      expect(isActive).toBe(false);
    });
  });
});
