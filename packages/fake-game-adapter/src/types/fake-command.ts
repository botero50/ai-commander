/**
 * Fake game commands for the economy and military adapter.
 *
 * Worker Commands:
 * - Move: change worker position
 * - Wait: do nothing
 * - Gather: collect resources
 * - Deposit: return resources to base
 * - Produce: create new worker (50 resources)
 *
 * Military Commands:
 * - Train: create military unit (100 resources)
 * - Scout: detect enemies in range
 * - MoveMilitary: move unit by offset
 * - Attack: damage enemy unit
 */

// Worker commands
export interface MoveCommand {
  readonly type: 'move';
  readonly workerId: number;
  readonly dx: number;
  readonly dy: number;
}

export interface WaitCommand {
  readonly type: 'wait';
  readonly workerId: number;
}

export interface GatherCommand {
  readonly type: 'gather';
  readonly workerId: number;
}

export interface DepositCommand {
  readonly type: 'deposit';
  readonly workerId: number;
}

export interface ProduceCommand {
  readonly type: 'produce';
}

// Military commands
export interface TrainCommand {
  readonly type: 'train';
  readonly unitType: 'infantry' | 'ranged' | 'tank';
}

export interface ScoutCommand {
  readonly type: 'scout';
  readonly unitId: number;
}

export interface MoveMilitaryCommand {
  readonly type: 'move-military';
  readonly unitId: number;
  readonly dx: number;
  readonly dy: number;
}

export interface AttackCommand {
  readonly type: 'attack';
  readonly attackerId: number;
  readonly targetId: number;
}

export type FakeCommand =
  | MoveCommand
  | WaitCommand
  | GatherCommand
  | DepositCommand
  | ProduceCommand
  | TrainCommand
  | ScoutCommand
  | MoveMilitaryCommand
  | AttackCommand;

/**
 * Parse a framework Command into a FakeCommand.
 *
 * Maps framework action types to fake game commands.
 * Extracts unit ID from agentId (format: "worker-0", "unit-5", etc).
 * Returns null if command type is not recognized.
 */
export function parseFakeCommand(
  actionType: string,
  params?: Record<string, unknown>,
  agentId?: string
): FakeCommand | null {
  // Extract ID from agentId like "worker-0" or "unit-5"
  const unitId =
    agentId && (agentId.startsWith('worker-') || agentId.startsWith('unit-'))
      ? parseInt(agentId.split('-')[1] || '0', 10)
      : 0;

  if (actionType === 'move') {
    const dx = typeof params?.dx === 'number' ? params.dx : 1;
    const dy = typeof params?.dy === 'number' ? params.dy : 0;
    return { type: 'move', workerId: unitId, dx, dy };
  }

  if (actionType === 'wait') {
    return { type: 'wait', workerId: unitId };
  }

  if (actionType === 'gather') {
    return { type: 'gather', workerId: unitId };
  }

  if (actionType === 'deposit') {
    return { type: 'deposit', workerId: unitId };
  }

  if (actionType === 'produce') {
    return { type: 'produce' };
  }

  if (actionType === 'train') {
    const unitType = (params?.unitType as string) || 'infantry';
    if (unitType === 'infantry' || unitType === 'ranged' || unitType === 'tank') {
      return { type: 'train', unitType };
    }
  }

  if (actionType === 'scout') {
    return { type: 'scout', unitId };
  }

  if (actionType === 'move-military') {
    const dx = typeof params?.dx === 'number' ? params.dx : 1;
    const dy = typeof params?.dy === 'number' ? params.dy : 0;
    return { type: 'move-military', unitId, dx, dy };
  }

  if (actionType === 'attack') {
    const targetId = typeof params?.targetId === 'number' ? params.targetId : 0;
    return { type: 'attack', attackerId: unitId, targetId };
  }

  return null;
}
