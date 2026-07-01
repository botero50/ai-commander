import type { Command } from '@ai-commander/domain';
import {
  createCommand,
  createAgent,
  createActionId,
  createTick,
} from '@ai-commander/domain';

/**
 * Create test commands for various action types.
 */

export function createTestMoveCommand(agentId: string = 'actor-1', targetX: number = 100, targetY: number = 200): Command {
  return createCommand(
    createActionId('move-1'),
    createAgent(agentId),
    'move',
    {
      targetPosition: { x: targetX, y: targetY },
    },
    createTick(0),
    0
  );
}

export function createTestAttackCommand(
  agentId: string = 'actor-1',
  targetAgent: string = 'actor-2'
): Command {
  return createCommand(
    createActionId('attack-1'),
    createAgent(agentId),
    'attack',
    {
      targetAgent,
    },
    createTick(0),
    0
  );
}

export function createTestAttackGroundCommand(
  agentId: string = 'actor-1',
  targetX: number = 150,
  targetY: number = 250
): Command {
  return createCommand(
    createActionId('attack-ground-1'),
    createAgent(agentId),
    'attack-ground',
    {
      targetPosition: { x: targetX, y: targetY },
    },
    createTick(0),
    0
  );
}

export function createTestBuildCommand(
  agentId: string = 'actor-1',
  targetType: string = 'barracks',
  targetX: number = 200,
  targetY: number = 300
): Command {
  return createCommand(
    createActionId('build-1'),
    createAgent(agentId),
    'build',
    {
      targetType,
      targetPosition: { x: targetX, y: targetY },
    },
    createTick(0),
    0
  );
}

export function createTestCancelCommand(agentId: string = 'actor-1'): Command {
  return createCommand(
    createActionId('cancel-1'),
    createAgent(agentId),
    'cancel',
    {},
    createTick(0),
    0
  );
}

export function createTestInvalidCommand(actionType: string = 'unknown'): Command {
  return createCommand(
    createActionId('invalid-1'),
    createAgent('actor-1'),
    actionType,
    {},
    createTick(0),
    0
  );
}

export function createTestMoveCommandMissingTarget(agentId: string = 'actor-1'): Command {
  return createCommand(
    createActionId('move-invalid'),
    createAgent(agentId),
    'move',
    {}, // Missing targetPosition
    createTick(0),
    0
  );
}

export function createTestAttackCommandMissingTarget(agentId: string = 'actor-1'): Command {
  return createCommand(
    createActionId('attack-invalid'),
    createAgent(agentId),
    'attack',
    {}, // Missing targetAgent
    createTick(0),
    0
  );
}

export function createTestCommandWithInvalidAgentId(actionType: string = 'move'): Command {
  return createCommand(
    createActionId('invalid-agent'),
    createAgent('invalid-format'),
    actionType,
    {
      targetPosition: { x: 100, y: 200 },
    },
    createTick(0),
    0
  );
}

export function createTestMoveCommandWithInvalidPosition(agentId: string = 'actor-1'): Command {
  return createCommand(
    createActionId('move-bad-pos'),
    createAgent(agentId),
    'move',
    {
      targetPosition: { x: 'not a number', y: 200 }, // Invalid position
    } as any,
    createTick(0),
    0
  );
}
