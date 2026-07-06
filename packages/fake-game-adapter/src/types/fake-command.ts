/**
 * Fake game commands for the minimal adapter.
 *
 * Supported commands:
 * - Move: change agent position
 * - Wait: do nothing for one tick
 * - Gather: collect resources from current location
 * - Deposit: drop resources at base
 */

export interface MoveCommand {
  readonly type: 'move';
  readonly dx: number;
  readonly dy: number;
}

export interface WaitCommand {
  readonly type: 'wait';
}

export interface GatherCommand {
  readonly type: 'gather';
}

export interface DepositCommand {
  readonly type: 'deposit';
}

export type FakeCommand = MoveCommand | WaitCommand | GatherCommand | DepositCommand;

/**
 * Parse a framework Command into a FakeCommand.
 *
 * Maps framework action types to fake game commands.
 * Returns null if command type is not recognized.
 */
export function parseFakeCommand(
  actionType: string,
  params?: Record<string, unknown>
): FakeCommand | null {
  if (actionType === 'move') {
    const dx = typeof params?.dx === 'number' ? params.dx : 1;
    const dy = typeof params?.dy === 'number' ? params.dy : 0;
    return { type: 'move', dx, dy };
  }

  if (actionType === 'wait') {
    return { type: 'wait' };
  }

  if (actionType === 'gather') {
    return { type: 'gather' };
  }

  if (actionType === 'deposit') {
    return { type: 'deposit' };
  }

  return null;
}
