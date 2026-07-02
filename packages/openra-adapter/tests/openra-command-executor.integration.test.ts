import { describe, it, expect, beforeEach } from 'vitest';
import { OpenRACommandExecutor } from '../src/command/openra-command-executor.js';
import {
  createTestMoveCommand,
  createTestAttackCommand,
  createTestAttackGroundCommand,
  createTestBuildCommand,
  createTestCancelCommand,
  createTestInvalidCommand,
  createTestMoveCommandMissingTarget,
} from './fixtures/command-test-state.js';

describe('OpenRACommandExecutor', () => {
  let submittedOrders: any[] = [];
  let gameAvailable = true;

  const mockOrderSubmitter = async (order: any): Promise<boolean> => {
    submittedOrders.push(order);
    return gameAvailable ? true : false;
  };

  const mockStateChecker = async (): Promise<boolean> => {
    return gameAvailable;
  };

  let executor: OpenRACommandExecutor;

  beforeEach(() => {
    submittedOrders = [];
    gameAvailable = true;
    executor = new OpenRACommandExecutor(0, mockOrderSubmitter, mockStateChecker);
  });

  describe('executeCommand', () => {
    it('executes move command successfully', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Move order executed successfully');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].orderName).toBe('Move');
      expect(submittedOrders[0].targetActor).toBe(1);
      expect(submittedOrders[0].targetPosition).toEqual({ x: 100, y: 200 });
    });

    it('executes attack command successfully', async () => {
      const command = createTestAttackCommand('actor-1', 'actor-2');

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Attack order executed successfully');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].orderName).toBe('Attack');
    });

    it('executes attack-ground command successfully', async () => {
      const command = createTestAttackGroundCommand('actor-1', 150, 250);

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('AttackGround order executed successfully');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].orderName).toBe('AttackGround');
    });

    it('executes build command successfully', async () => {
      const command = createTestBuildCommand('actor-1', 'barracks', 200, 300);

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Build order executed successfully');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].orderName).toBe('Build');
    });

    it('executes cancel command successfully', async () => {
      const command = createTestCancelCommand('actor-1');

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cancel order executed successfully');
      expect(submittedOrders).toHaveLength(1);
      expect(submittedOrders[0].orderName).toBe('Cancel');
    });

    it('rejects invalid command with translation error', async () => {
      const command = createTestInvalidCommand('unknown-action');

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to translate command');
      expect(result.error?.code).toBe('UNSUPPORTED_ACTION');
      expect(submittedOrders).toHaveLength(0);
    });

    it('rejects command with missing target', async () => {
      const command = createTestMoveCommandMissingTarget('actor-1');

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to translate command');
      expect(result.error?.code).toBe('MISSING_TARGET');
      expect(submittedOrders).toHaveLength(0);
    });

    it('returns failure when game is unavailable', async () => {
      gameAvailable = false;
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = await executor.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Game is not available');
      expect(result.error?.code).toBe('GAME_UNAVAILABLE');
      expect(submittedOrders).toHaveLength(0);
    });

    it('returns failure when order submission fails', async () => {
      gameAvailable = false;
      const executor2 = new OpenRACommandExecutor(
        0,
        async () => false, // Submission always fails
        async () => true // But game is available
      );
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = await executor2.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SUBMISSION_FAILED');
    });

    it('handles submission errors gracefully', async () => {
      const executor2 = new OpenRACommandExecutor(
        0,
        async () => {
          throw new Error('Order submission crashed');
        },
        async () => true
      );
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = await executor2.executeCommand(command);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('EXECUTION_ERROR');
      expect(result.message).toContain('Order submission crashed');
    });

    it('includes execution data in success result', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = await executor.executeCommand(command);

      expect(result.data).toBeDefined();
      expect(result.data?.orderName).toBe('Move');
      expect(result.data?.playerIndex).toBe(0);
      expect(result.data?.targetActor).toBe(1);
    });

    it('is deterministic: same command produces consistent result', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result1 = await executor.executeCommand(command);
      submittedOrders = [];
      const result2 = await executor.executeCommand(command);

      expect(result1.success).toBe(result2.success);
      expect(result1.message).toBe(result2.message);
      expect(submittedOrders).toHaveLength(1);
    });
  });

  describe('executeCommands', () => {
    it('executes multiple commands in sequence', async () => {
      const commands = [
        createTestMoveCommand('actor-1', 100, 200),
        createTestAttackCommand('actor-1', 'actor-2'),
        createTestCancelCommand('actor-1'),
      ];

      const results = await executor.executeCommands(commands);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
      expect(submittedOrders).toHaveLength(3);
      expect(submittedOrders[0].orderName).toBe('Move');
      expect(submittedOrders[1].orderName).toBe('Attack');
      expect(submittedOrders[2].orderName).toBe('Cancel');
    });

    it('handles mixed success and failure in batch', async () => {
      const commands = [
        createTestMoveCommand('actor-1', 100, 200),
        createTestInvalidCommand('unknown'),
        createTestAttackCommand('actor-1', 'actor-2'),
      ];

      const results = await executor.executeCommands(commands);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
      expect(submittedOrders).toHaveLength(2);
    });

    it('stops on critical error and skips remaining commands', async () => {
      gameAvailable = false;
      const commands = [
        createTestMoveCommand('actor-1', 100, 200),
        createTestMoveCommand('actor-2', 150, 250),
        createTestMoveCommand('actor-3', 200, 300),
      ];

      const results = await executor.executeCommands(commands);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.code).toBe('GAME_UNAVAILABLE');
      expect(results[1].success).toBe(false);
      expect(results[1].error?.code).toBe('SKIPPED');
      expect(results[2].success).toBe(false);
      expect(results[2].error?.code).toBe('SKIPPED');
      expect(submittedOrders).toHaveLength(0);
    });

    it('returns empty result for empty command list', async () => {
      const results = await executor.executeCommands([]);

      expect(results).toHaveLength(0);
      expect(submittedOrders).toHaveLength(0);
    });
  });

  describe('canExecuteCommand', () => {
    it('returns true for valid command when game available', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const canExecute = await executor.canExecuteCommand(command);

      expect(canExecute).toBe(true);
    });

    it('returns false for invalid command', async () => {
      const command = createTestInvalidCommand('unknown');

      const canExecute = await executor.canExecuteCommand(command);

      expect(canExecute).toBe(false);
    });

    it('returns false when game unavailable', async () => {
      gameAvailable = false;
      const command = createTestMoveCommand('actor-1', 100, 200);

      const canExecute = await executor.canExecuteCommand(command);

      expect(canExecute).toBe(false);
    });

    it('returns false for command missing target', async () => {
      const command = createTestMoveCommandMissingTarget('actor-1');

      const canExecute = await executor.canExecuteCommand(command);

      expect(canExecute).toBe(false);
    });

    it('validates without submitting order', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const canExecute = await executor.canExecuteCommand(command);

      expect(canExecute).toBe(true);
      expect(submittedOrders).toHaveLength(0);
    });
  });

  describe('isExecutionAvailable', () => {
    it('returns true when game available', async () => {
      gameAvailable = true;

      const available = await executor.isExecutionAvailable();

      expect(available).toBe(true);
    });

    it('returns false when game unavailable', async () => {
      gameAvailable = false;

      const available = await executor.isExecutionAvailable();

      expect(available).toBe(false);
    });

    it('catches errors from state checker', async () => {
      const executor2 = new OpenRACommandExecutor(0, mockOrderSubmitter, async () => {
        throw new Error('State checker crashed');
      });

      const available = await executor2.isExecutionAvailable();

      expect(available).toBe(false);
    });
  });

  describe('Determinism and Consistency', () => {
    it('produces identical order translation across executions', async () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      await executor.executeCommand(command);
      const order1 = submittedOrders[0];

      submittedOrders = [];

      await executor.executeCommand(command);
      const order2 = submittedOrders[0];

      expect(order1.orderName).toBe(order2.orderName);
      expect(order1.targetActor).toBe(order2.targetActor);
      expect(order1.targetPosition).toEqual(order2.targetPosition);
      expect(order1.playerIndex).toBe(order2.playerIndex);
    });

    it('uses correct player index in all commands', async () => {
      const executor1 = new OpenRACommandExecutor(0, mockOrderSubmitter, mockStateChecker);
      const executor2 = new OpenRACommandExecutor(1, mockOrderSubmitter, mockStateChecker);

      const command = createTestMoveCommand('actor-1', 100, 200);

      await executor1.executeCommand(command);
      await executor2.executeCommand(command);

      expect(submittedOrders[0].playerIndex).toBe(0);
      expect(submittedOrders[1].playerIndex).toBe(1);
    });
  });
});
