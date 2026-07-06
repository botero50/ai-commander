import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { FakeGameSession } from '../src/fake-game-session.js';
import { Command } from '@ai-commander/domain';

describe('FakeCommandExecutor', () => {
  let adapter: FakeGameAdapter;
  let session: FakeGameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as FakeGameSession;
    await session.start();
  });

  it('should report execution available when active', async () => {
    const available = await session.commandExecutor.isExecutionAvailable();
    expect(available).toBe(true);
  });

  it('should report execution unavailable when inactive', async () => {
    await session.stop();
    const available = await session.commandExecutor.isExecutionAvailable();
    expect(available).toBe(false);
  });

  it('should validate move command', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    const canExecute = await session.commandExecutor.canExecuteCommand(command);
    expect(canExecute).toBe(true);
  });

  it('should validate wait command', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'wait',
    };

    const canExecute = await session.commandExecutor.canExecuteCommand(command);
    expect(canExecute).toBe(true);
  });

  it('should reject unknown command', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'invalid-action-type',
    };

    const canExecute = await session.commandExecutor.canExecuteCommand(command);
    expect(canExecute).toBe(false);
  });

  it('should execute move command', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(true);
    expect(result.message).toBeDefined();
  });

  it('should execute wait command', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'wait',
    };

    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(true);
  });

  it('should update world state after command', async () => {
    const state0 = await session.observationProvider.getWorldState();
    expect(state0.agents[0].customData.position).toBe('0,0');

    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 3, dy: 2 },
    };

    await session.commandExecutor.executeCommand(command);

    const state1 = await session.observationProvider.getWorldState();
    expect(state1.agents[0].customData.position).toBe('3,2');
  });

  it('should fail to execute when inactive', async () => {
    await session.stop();

    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject unknown command type', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'unknown',
    };

    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should support multiple sequential commands', async () => {
    const moveRight: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    const moveUp: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 0, dy: 1 },
    };

    await session.commandExecutor.executeCommand(moveRight);
    await session.commandExecutor.executeCommand(moveUp);

    const state = await session.observationProvider.getWorldState();
    expect(state.agents[0].customData.position).toBe('1,1');
  });

  it('should support move with default parameters', async () => {
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
    };

    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(true);

    const state = await session.observationProvider.getWorldState();
    expect(state.agents[0].customData.position).toBe('1,0'); // Default dx=1, dy=0
  });
});
