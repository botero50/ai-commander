/**
 * Fake game commands for the economy adapter.
 *
 * Supported commands:
 * - Move: change worker position
 * - Wait: do nothing for one tick
 * - Gather: collect resources from current location
 * - Deposit: drop resources at base
 * - Produce: create new worker at base (costs 50 resources)
 */

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

export type FakeCommand =
  | MoveCommand
  | WaitCommand
  | GatherCommand
  | DepositCommand
  | ProduceCommand;

/**
 * Parse a framework Command into a FakeCommand.
 *
 * Maps framework action types to fake game commands.
 * Extracts worker ID from agentId (format: "worker-0", "worker-1", etc).
 * Returns null if command type is not recognized.
 */
export function parseFakeCommand(
  actionType: string,
  params?: Record<string, unknown>,
  agentId?: string
): FakeCommand | null {
  // Extract worker ID from agentId like "worker-0"
  const workerId =
    agentId && agentId.startsWith('worker-')
      ? parseInt(agentId.substring('worker-'.length), 10)
      : 0;

  if (actionType === 'move') {
    const dx = typeof params?.dx === 'number' ? params.dx : 1;
    const dy = typeof params?.dy === 'number' ? params.dy : 0;
    return { type: 'move', workerId, dx, dy };
  }

  if (actionType === 'wait') {
    return { type: 'wait', workerId };
  }

  if (actionType === 'gather') {
    return { type: 'gather', workerId };
  }

  if (actionType === 'deposit') {
    return { type: 'deposit', workerId };
  }

  if (actionType === 'produce') {
    return { type: 'produce' };
  }

  return null;
}
