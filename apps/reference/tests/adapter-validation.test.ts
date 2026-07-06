import { describe, it, expect } from 'vitest';
import { FakeGameAdapter } from '@ai-commander/fake-game-adapter';
import { createCommand, createActionId } from '@ai-commander/domain';

describe('Adapter Validation - Milestone A', () => {
  describe('Fake Game Adapter', () => {
    it('should initialize adapter', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const info = await adapter.getAdapterInfo();
      expect(info.version).toBe('0.1.0');
    });

    it('should create session', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      expect(session.sessionId).toBeDefined();
      expect(session.observationProvider).toBeDefined();
      expect(session.commandExecutor).toBeDefined();
    });

    it('should start session and get world state', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      const worldState = await session.start();

      expect(worldState).toBeDefined();
      expect(worldState.agents).toBeDefined();
    });

    it('should execute move command', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      await session.start();

      const command = createCommand(
        createActionId('move'),
        'worker-0',
        'move',
        {
          dx: 1,
          dy: 0,
        }
      );

      const result = await session.commandExecutor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Executed');
    });

    it('should execute wait command', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      await session.start();

      const command = createCommand(
        createActionId('wait'),
        'worker-0',
        'wait',
        {}
      );

      const result = await session.commandExecutor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Executed');
    });

    it('should reject unknown command', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      await session.start();

      const command = createCommand(
        createActionId('unknown'),
        'worker-0',
        'unknown-action',
        {}
      );

      const result = await session.commandExecutor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown');
    });

    it('should track command execution', async () => {
      const adapter = new FakeGameAdapter();
      await adapter.initialize();

      const session = await adapter.createSession();
      const initialState = await session.start();

      const initialTick = (initialState as any).tick || 0;

      const moveCmd = createCommand(
        createActionId('move'),
        'worker-0',
        'move',
        {
          dx: 1,
          dy: 0,
        }
      );

      const result = await session.commandExecutor.executeCommand(moveCmd);
      expect(result.success).toBe(true);

      const newState = await session.observationProvider.getWorldState();
      const newTick = (newState as any).tick || 0;

      expect(newTick).toBeGreaterThanOrEqual(initialTick);
    });
  });
});
