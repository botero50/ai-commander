export interface CommandBase {
  id: string;
  playerId: number;
  timestamp: number;
}

export interface MoveCommand extends CommandBase {
  type: 'move';
  entityIds: number[];
  targetX: number;
  targetZ: number;
  queued?: boolean;
}

export interface AttackCommand extends CommandBase {
  type: 'attack';
  entityIds: number[];
  targetEntityId: number;
  queued?: boolean;
}

export interface GatherCommand extends CommandBase {
  type: 'gather';
  entityIds: number[];
  targetEntityId: number;
  resourceType?: string;
  queued?: boolean;
}

export interface BuildCommand extends CommandBase {
  type: 'build';
  builderEntityIds: number[];
  templateName: string;
  positionX: number;
  positionZ: number;
  angle?: number;
}

export interface TrainCommand extends CommandBase {
  type: 'train';
  builderEntityId: number;
  templateName: string;
  count?: number;
}

export interface PatrolCommand extends CommandBase {
  type: 'patrol';
  entityIds: number[];
  targetX: number;
  targetZ: number;
  queued?: boolean;
}

export interface RepairCommand extends CommandBase {
  type: 'repair';
  entityIds: number[];
  targetEntityId: number;
  queued?: boolean;
}

export interface StopCommand extends CommandBase {
  type: 'stop';
  entityIds: number[];
}

export type GameCommand =
  | MoveCommand
  | AttackCommand
  | GatherCommand
  | BuildCommand
  | TrainCommand
  | PatrolCommand
  | RepairCommand
  | StopCommand;

export function isValidGameCommand(cmd: unknown): cmd is GameCommand {
  if (!cmd || typeof cmd !== 'object') return false;

  const c = cmd as Record<string, unknown>;
  if (!c.type || typeof c.type !== 'string') return false;
  if (!c.id || typeof c.id !== 'string') return false;
  if (typeof c.playerId !== 'number') return false;
  if (typeof c.timestamp !== 'number') return false;

  const validTypes = [
    'move',
    'attack',
    'gather',
    'build',
    'train',
    'patrol',
    'repair',
    'stop',
  ];
  return validTypes.includes(c.type as string);
}

export function createCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
