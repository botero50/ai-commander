/**
 * Camera Command Definitions
 *
 * Defines the camera control commands that can be sent to 0 A.D.
 * These are translated from framework Commands to IPC messages.
 */

export interface CameraCommandData {
  readonly x: number;
  readonly z: number;
  readonly duration?: number; // milliseconds
}

export interface CameraFollowUnitData {
  readonly unitId: string;
  readonly leadDistance?: number;
}

export interface CameraPanData {
  readonly fromX: number;
  readonly fromZ: number;
  readonly toX: number;
  readonly toZ: number;
  readonly durationMs: number;
}

export type CameraActionType =
  | 'camera:set-target'
  | 'camera:look-at'
  | 'camera:pan'
  | 'camera:follow-unit';

export interface CameraCommand {
  readonly actionType: CameraActionType;
  readonly parameters: Record<string, unknown>;
}

/**
 * Create a camera set-target command
 * Moves camera to position over specified duration
 */
export function createSetTargetCommand(
  x: number,
  z: number,
  durationMs: number = 1000
): CameraCommand {
  return {
    actionType: 'camera:set-target',
    parameters: {
      x,
      z,
      duration: durationMs,
    },
  };
}

/**
 * Create a camera look-at command
 * Instantly looks at position
 */
export function createLookAtCommand(x: number, z: number): CameraCommand {
  return {
    actionType: 'camera:look-at',
    parameters: {
      x,
      z,
    },
  };
}

/**
 * Create a camera pan command
 * Smoothly pans from one position to another
 */
export function createPanCommand(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  durationMs: number = 1500
): CameraCommand {
  return {
    actionType: 'camera:pan',
    parameters: {
      fromX,
      fromZ,
      toX,
      toZ,
      durationMs,
    },
  };
}

/**
 * Create a camera follow-unit command
 * Keeps camera focused on a moving unit
 */
export function createFollowUnitCommand(
  unitId: string,
  leadDistance: number = 0
): CameraCommand {
  return {
    actionType: 'camera:follow-unit',
    parameters: {
      unitId,
      leadDistance,
    },
  };
}
