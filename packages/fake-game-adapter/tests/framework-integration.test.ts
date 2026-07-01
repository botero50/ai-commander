import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { FakeGameSession } from '../src/fake-game-session.js';
import { Command } from '@ai-commander/domain';

/**
 * Framework integration tests.
 *
 * Validates that FakeGameAdapter integrates correctly with the framework.
 * These tests demonstrate a complete cycle from adapter creation through
 * command execution with world state updates.
 */
describe('Framework Integration: FakeGame End-to-End', () => {
  let adapter: FakeGameAdapter;
  let session: FakeGameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as FakeGameSession;
    await session.start();
  });

  it('should execute complete lifecycle', async () => {
    // 1. Verify initial state
    const initialState = await session.observationProvider.getWorldState();
    expect(initialState).toBeDefined();
    expect(initialState.agents.length).toBe(1);
    expect(initialState.agents[0].customData.position).toBe('0,0');

    // 2. Execute command
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 1 },
    };
    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(true);

    // 3. Verify state updated
    const updatedState = await session.observationProvider.getWorldState();
    expect(updatedState.agents[0].customData.position).toBe('1,1');

    // 4. Cleanup
    await session.stop();
    expect(await session.isActive()).toBe(false);
  });

  it('should maintain command execution consistency', async () => {
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
    const wait: Command = { agentId: 'agent-0', actionType: 'wait' };

    const commands = [moveRight, moveUp, wait, moveRight];

    for (const cmd of commands) {
      const result = await session.commandExecutor.executeCommand(cmd);
      expect(result.success).toBe(true);
    }

    const finalState = await session.observationProvider.getWorldState();
    expect(finalState.agents[0].customData.position).toBe('2,1');
  });

  it('should support world state observation', async () => {
    const state0 = await session.observationProvider.getWorldState();

    const move: Command = { agentId: 'agent-0', actionType: 'move', parameters: { dx: 1, dy: 1 } };
    await session.commandExecutor.executeCommand(move);

    const state1 = await session.observationProvider.getWorldState();

    // Verify both states are available
    expect(state0.time.currentTick.number).toBe(0);
    expect(state1.customData['commands-executed']).toBe(1);

    // Verify replay capability
    const replayState = await session.observationProvider.getWorldStateAt(0);
    expect(replayState.time.currentTick.number).toBe(0);
  });
});
