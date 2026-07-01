import { describe, it, expect, beforeEach } from 'vitest';
import { FakeGameAdapter } from '../src/fake-game-adapter.js';
import { FakeGameSession } from '../src/fake-game-session.js';
import { Command } from '@ai-commander/domain';

describe('FakeGameAdapter Integration', () => {
  let adapter: FakeGameAdapter;
  let session: FakeGameSession;

  beforeEach(async () => {
    adapter = new FakeGameAdapter();
    await adapter.initialize();
    session = (await adapter.createSession()) as FakeGameSession;
  });

  it('should complete full lifecycle', async () => {
    // Initialize
    await session.start();
    expect(await session.isActive()).toBe(true);

    // Observe initial state
    const state0 = await session.observationProvider.getWorldState();
    expect(state0.time.currentTick.number).toBe(0);

    // Execute command
    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 1 },
    };
    const result = await session.commandExecutor.executeCommand(command);
    expect(result.success).toBe(true);

    // Observe updated state
    const state1 = await session.observationProvider.getWorldState();
    expect(state1.agents[0].customData.position).toBe('1,1');

    // Cleanup
    await session.stop();
    expect(await session.isActive()).toBe(false);
  });

  it('should support pause and resume', async () => {
    await session.start();

    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    // Execute before pause
    await session.commandExecutor.executeCommand(command);
    const state1 = await session.observationProvider.getWorldState();
    expect(state1.agents[0].customData.position).toBe('1,0');

    // Pause
    await session.pause();

    // Resume and continue
    await session.resume();
    await session.commandExecutor.executeCommand(command);
    const state2 = await session.observationProvider.getWorldState();
    expect(state2.agents[0].customData.position).toBe('2,0');
  });

  it('should support save and restore', async () => {
    await session.start();

    // Execute first command
    const move1: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };
    await session.commandExecutor.executeCommand(move1);
    const state1 = await session.observationProvider.getWorldState();

    // Save state
    const snapshot = await session.saveState();

    // Execute second command
    const move2: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };
    await session.commandExecutor.executeCommand(move2);
    const state2 = await session.observationProvider.getWorldState();

    // Verify divergence
    expect(state2.agents[0].customData.position).not.toBe(state1.agents[0].customData.position);

    // Restore to saved state
    await session.restoreState(snapshot);
    const restored = await session.observationProvider.getWorldState();

    // Verify restoration
    expect(restored.agents[0].customData.position).toBe(state1.agents[0].customData.position);
  });

  it('should be deterministic: same sequence = same result', async () => {
    const commands = [
      { agentId: 'agent-0', actionType: 'move', parameters: { dx: 1, dy: 0 } } as Command,
      { agentId: 'agent-0', actionType: 'move', parameters: { dx: 0, dy: 1 } } as Command,
      { agentId: 'agent-0', actionType: 'wait' } as Command,
      { agentId: 'agent-0', actionType: 'move', parameters: { dx: -1, dy: 0 } } as Command,
    ];

    // Run 1
    await session.start();
    for (const cmd of commands) {
      await session.commandExecutor.executeCommand(cmd);
    }
    const state1 = await session.observationProvider.getWorldState();
    await session.stop();

    // Run 2
    session = (await adapter.createSession()) as FakeGameSession;
    await session.start();
    for (const cmd of commands) {
      await session.commandExecutor.executeCommand(cmd);
    }
    const state2 = await session.observationProvider.getWorldState();

    // Verify determinism
    expect(state1.agents[0].customData.position).toBe(state2.agents[0].customData.position);
  });

  it('should track command execution count', async () => {
    await session.start();

    const state0 = await session.observationProvider.getWorldState();
    expect(state0.customData['commands-executed']).toBe(0);

    const command: Command = {
      agentId: 'agent-0',
      actionType: 'move',
      parameters: { dx: 1, dy: 0 },
    };

    await session.commandExecutor.executeCommand(command);
    const state1 = await session.observationProvider.getWorldState();
    expect(state1.customData['commands-executed']).toBe(1);

    await session.commandExecutor.executeCommand(command);
    const state2 = await session.observationProvider.getWorldState();
    expect(state2.customData['commands-executed']).toBe(2);
  });

  it('should provide complete world state', async () => {
    await session.start();
    const state = await session.observationProvider.getWorldState();

    expect(state.time).toBeDefined();
    expect(state.time.currentTick).toBeDefined();
    expect(state.time.currentTick.number).toBeDefined();

    expect(state.agents).toBeDefined();
    expect(state.agents.length).toBeGreaterThan(0);

    expect(state.players).toBeDefined();
    expect(Array.isArray(state.players)).toBe(true);

    expect(state.customData).toBeDefined();
  });

  it('should not support multiple agents', () => {
    expect(adapter.capabilities.supportsMultipleAgents).toBe(false);
  });

  it('should support deterministic mode', () => {
    expect(adapter.capabilities.supportsDeterministicMode).toBe(true);
  });
});
