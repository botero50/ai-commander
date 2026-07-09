/**
 * Cinematic Camera Commands
 *
 * Advanced camera operations for spectator experience:
 * - Panning (smooth point-to-point movement)
 * - Zooming (FOV/distance changes)
 * - Rotating (camera angle changes)
 * - Keyframe sequences (complex paths)
 */

export type EasingType = 'linear' | 'easeInOut' | 'easeIn' | 'easeOut';
export type CinematicActionType =
  | 'camera:pan'
  | 'camera:zoom'
  | 'camera:rotate'
  | 'camera:orbit'
  | 'camera:keyframe';

/**
 * Pan command: Smooth movement from one point to another
 */
export interface PanCommand {
  readonly from: { readonly x: number; readonly z: number };
  readonly to: { readonly x: number; readonly z: number };
  readonly durationMs: number;
  readonly easing?: EasingType;
}

/**
 * Zoom command: Change camera FOV/distance
 * 0.5 = zoomed in (close)
 * 1.0 = normal view
 * 2.0 = zoomed out (far)
 */
export interface ZoomCommand {
  readonly targetZoom: number;
  readonly durationMs: number;
  readonly easing?: EasingType;
}

/**
 * Rotate command: Change camera angle
 */
export interface RotateCommand {
  readonly yaw: number; // -180 to 180 degrees
  readonly pitch?: number; // -90 to 90 degrees
  readonly roll?: number; // -180 to 180 degrees
  readonly durationMs: number;
  readonly easing?: EasingType;
}

/**
 * Orbit command: Rotate around a target point
 */
export interface OrbitCommand {
  readonly centerX: number;
  readonly centerZ: number;
  readonly radius: number;
  readonly startAngle: number; // degrees
  readonly endAngle: number; // degrees
  readonly durationMs: number;
  readonly easing?: EasingType;
}

/**
 * Keyframe sequence: Complex multi-point path with parameters
 */
export interface Keyframe {
  readonly position: { readonly x: number; readonly z: number };
  readonly zoom?: number;
  readonly rotation?: {
    readonly yaw: number;
    readonly pitch?: number;
    readonly roll?: number;
  };
  readonly duration: number; // Time to reach this keyframe
}

export interface KeyframeCommand {
  readonly keyframes: readonly Keyframe[];
  readonly easing?: EasingType;
}

/**
 * Union of all cinematic commands
 */
export interface CinematicCommand {
  readonly actionType: CinematicActionType;
  readonly parameters: PanCommand | ZoomCommand | RotateCommand | OrbitCommand | KeyframeCommand;
}

/**
 * Create a pan command
 */
export function createPanCommand(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  durationMs: number,
  easing: EasingType = 'easeInOut'
): CinematicCommand {
  return {
    actionType: 'camera:pan',
    parameters: {
      from: { x: fromX, z: fromZ },
      to: { x: toX, z: toZ },
      durationMs,
      easing,
    },
  };
}

/**
 * Create a zoom command
 */
export function createZoomCommand(
  targetZoom: number,
  durationMs: number,
  easing: EasingType = 'easeInOut'
): CinematicCommand {
  return {
    actionType: 'camera:zoom',
    parameters: {
      targetZoom,
      durationMs,
      easing,
    },
  };
}

/**
 * Create a rotate command
 */
export function createRotateCommand(
  yaw: number,
  pitch: number | undefined,
  roll: number | undefined,
  durationMs: number,
  easing: EasingType = 'easeInOut'
): CinematicCommand {
  return {
    actionType: 'camera:rotate',
    parameters: {
      yaw,
      pitch,
      roll,
      durationMs,
      easing,
    },
  };
}

/**
 * Create an orbit command
 */
export function createOrbitCommand(
  centerX: number,
  centerZ: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  durationMs: number,
  easing: EasingType = 'easeInOut'
): CinematicCommand {
  return {
    actionType: 'camera:orbit',
    parameters: {
      centerX,
      centerZ,
      radius,
      startAngle,
      endAngle,
      durationMs,
      easing,
    },
  };
}

/**
 * Create a keyframe sequence command
 */
export function createKeyframeCommand(
  keyframes: readonly Keyframe[],
  easing: EasingType = 'easeInOut'
): CinematicCommand {
  if (keyframes.length < 2) {
    throw new Error('Keyframe sequence requires at least 2 keyframes');
  }

  return {
    actionType: 'camera:keyframe',
    parameters: {
      keyframes,
      easing,
    },
  };
}

/**
 * Validate cinematic command
 */
export function validateCinematicCommand(cmd: CinematicCommand): boolean {
  switch (cmd.actionType) {
    case 'camera:pan': {
      const pan = cmd.parameters as PanCommand;
      return (
        pan.durationMs > 0 &&
        Number.isFinite(pan.from.x) &&
        Number.isFinite(pan.from.z) &&
        Number.isFinite(pan.to.x) &&
        Number.isFinite(pan.to.z)
      );
    }
    case 'camera:zoom': {
      const zoom = cmd.parameters as ZoomCommand;
      return zoom.durationMs > 0 && zoom.targetZoom > 0 && zoom.targetZoom < 10;
    }
    case 'camera:rotate': {
      const rot = cmd.parameters as RotateCommand;
      return (
        rot.durationMs > 0 &&
        Number.isFinite(rot.yaw) &&
        (rot.pitch === undefined || Number.isFinite(rot.pitch)) &&
        (rot.roll === undefined || Number.isFinite(rot.roll))
      );
    }
    case 'camera:orbit': {
      const orb = cmd.parameters as OrbitCommand;
      return (
        orb.durationMs > 0 &&
        Number.isFinite(orb.centerX) &&
        Number.isFinite(orb.centerZ) &&
        orb.radius > 0 &&
        Number.isFinite(orb.startAngle) &&
        Number.isFinite(orb.endAngle)
      );
    }
    case 'camera:keyframe': {
      const kf = cmd.parameters as KeyframeCommand;
      return kf.keyframes.length >= 2;
    }
    default:
      return false;
  }
}
