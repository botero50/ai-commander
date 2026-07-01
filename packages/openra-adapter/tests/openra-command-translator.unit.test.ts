import { describe, it, expect } from 'vitest';
import { OpenRACommandTranslator } from '../src/command/openra-command-translator.js';
import {
  createTestMoveCommand,
  createTestAttackCommand,
  createTestAttackGroundCommand,
  createTestBuildCommand,
  createTestCancelCommand,
  createTestInvalidCommand,
  createTestMoveCommandMissingTarget,
  createTestAttackCommandMissingTarget,
  createTestCommandWithInvalidAgentId,
  createTestMoveCommandWithInvalidPosition,
} from './fixtures/command-test-state.js';

describe('OpenRACommandTranslator', () => {
  const translator = new OpenRACommandTranslator();
  const playerIndex = 0;

  describe('translateCommand - Movement', () => {
    it('translates move command to Move order', () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.orderName).toBe('Move');
      expect(result.order!.targetActor).toBe(1);
      expect(result.order!.targetPosition).toEqual({ x: 100, y: 200 });
      expect(result.order!.playerIndex).toBe(playerIndex);
    });

    it('rounds floating point positions to integers', () => {
      const command = createTestMoveCommand('actor-1', 100.7, 200.3);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order!.targetPosition).toEqual({ x: 100, y: 200 });
    });

    it('rejects move command without target position', () => {
      const command = createTestMoveCommandMissingTarget('actor-1');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TARGET');
      expect(result.error?.reason).toContain('targetPosition');
    });

    it('rejects move command with invalid position format', () => {
      const command = createTestMoveCommandWithInvalidPosition('actor-1');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_POSITION');
    });
  });

  describe('translateCommand - Combat', () => {
    it('translates attack command to Attack order', () => {
      const command = createTestAttackCommand('actor-1', 'actor-2');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.orderName).toBe('Attack');
      expect(result.order!.targetActor).toBe(1);
      expect(result.order!.targetString).toBe('2');
    });

    it('rejects attack command without target agent', () => {
      const command = createTestAttackCommandMissingTarget('actor-1');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TARGET');
      expect(result.error?.reason).toContain('targetAgent');
    });

    it('translates attack-ground command to AttackGround order', () => {
      const command = createTestAttackGroundCommand('actor-1', 150, 250);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order!.orderName).toBe('AttackGround');
      expect(result.order!.targetActor).toBe(1);
      expect(result.order!.targetPosition).toEqual({ x: 150, y: 250 });
    });

    it('rejects attack with invalid target agent format', () => {
      const command = createTestAttackCommand('actor-1', 'invalid-format');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_TARGET_AGENT');
    });
  });

  describe('translateCommand - Construction', () => {
    it('translates build command to Build order', () => {
      const command = createTestBuildCommand('actor-1', 'barracks', 200, 300);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.orderName).toBe('Build');
      expect(result.order!.targetActor).toBe(1);
      expect(result.order!.targetString).toBe('barracks');
      expect(result.order!.targetPosition).toEqual({ x: 200, y: 300 });
    });

    it('rejects build command without target type', () => {
      const command = createTestBuildCommand('actor-1', '', 200, 300);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_TARGET_TYPE');
    });

    it('rejects build command without target position', () => {
      const buildCmd = createTestBuildCommand('actor-1', 'barracks', 200, 300);
      const invalidBuildCmd = {
        ...buildCmd,
        parameters: { targetType: 'barracks' }, // Missing targetPosition
      };

      const result = translator.translateCommand(invalidBuildCmd, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MISSING_POSITION');
    });
  });

  describe('translateCommand - Cancel', () => {
    it('translates cancel command to Cancel order', () => {
      const command = createTestCancelCommand('actor-1');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(result.order!.orderName).toBe('Cancel');
      expect(result.order!.targetActor).toBe(1);
    });
  });

  describe('translateCommand - Unsupported', () => {
    it('rejects unsupported action type', () => {
      const command = createTestInvalidCommand('unknown-action');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('UNSUPPORTED_ACTION');
      expect(result.error?.reason).toContain('unknown-action');
    });
  });

  describe('translateCommand - Invalid Input', () => {
    it('rejects command with invalid agent ID format', () => {
      const command = createTestCommandWithInvalidAgentId('move');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toMatch(/INVALID_AGENT_ID|INVALID_POSITION/);
    });

    it('rejects command with empty agent ID', () => {
      const moveCmd = createTestMoveCommand('actor-1');
      const emptyAgentCmd = {
        ...moveCmd,
        agentId: '', // Empty agent ID
      } as any;

      const result = translator.translateCommand(emptyAgentCmd, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AGENT_ID');
    });

    it('rejects command with empty action type', () => {
      const moveCmd = createTestMoveCommand('actor-1');
      const emptyActionCmd = {
        ...moveCmd,
        actionType: '', // Empty action type
      };

      const result = translator.translateCommand(emptyActionCmd, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_ACTION_TYPE');
    });
  });

  describe('translateCommand - Actor ID Extraction', () => {
    it('correctly extracts numeric actor ID from agent ID', () => {
      const command = createTestMoveCommand('actor-123', 100, 200);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order!.targetActor).toBe(123);
    });

    it('handles large actor IDs', () => {
      const command = createTestMoveCommand('actor-999999', 100, 200);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(true);
      expect(result.order!.targetActor).toBe(999999);
    });

    it('rejects agent ID with non-numeric suffix', () => {
      const command = createTestMoveCommand('actor-abc', 100, 200);

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_AGENT_ID_FORMAT');
    });

    it('rejects agent ID not starting with actor-', () => {
      const command = createTestCommandWithInvalidAgentId('move');

      const result = translator.translateCommand(command, playerIndex);

      expect(result.success).toBe(false);
    });
  });

  describe('translateCommand - Player Index', () => {
    it('sets correct player index in translated order', () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result1 = translator.translateCommand(command, 0);
      const result2 = translator.translateCommand(command, 1);
      const result3 = translator.translateCommand(command, 3);

      expect(result1.order!.playerIndex).toBe(0);
      expect(result2.order!.playerIndex).toBe(1);
      expect(result3.order!.playerIndex).toBe(3);
    });
  });

  describe('translateCommand - Determinism', () => {
    it('produces consistent output for same command', () => {
      const command = createTestMoveCommand('actor-1', 100, 200);

      const result1 = translator.translateCommand(command, playerIndex);
      const result2 = translator.translateCommand(command, playerIndex);

      expect(result1.success).toBe(result2.success);
      expect(result1.order?.orderName).toBe(result2.order?.orderName);
      expect(result1.order?.targetActor).toBe(result2.order?.targetActor);
      expect(result1.order?.targetPosition).toEqual(result2.order?.targetPosition);
    });

    it('produces identical orders across different translator instances', () => {
      const translator1 = new OpenRACommandTranslator();
      const translator2 = new OpenRACommandTranslator();
      const command = createTestAttackCommand('actor-1', 'actor-2');

      const result1 = translator1.translateCommand(command, playerIndex);
      const result2 = translator2.translateCommand(command, playerIndex);

      expect(result1.order?.orderName).toBe(result2.order?.orderName);
      expect(result1.order?.targetActor).toBe(result2.order?.targetActor);
      expect(result1.order?.targetString).toBe(result2.order?.targetString);
    });
  });
});
