/**
 * Camera Control Module
 *
 * Exports camera controller components for 0 A.D. spectator experience.
 */

export type {
  CameraCommand,
  CameraActionType,
  CameraCommandData,
  CameraFollowUnitData,
  CameraPanData,
} from './camera-commands.js';

export {
  createSetTargetCommand,
  createLookAtCommand,
  createFollowUnitCommand,
} from './camera-commands.js';

export { CameraInterestCalculator } from './camera-interest-calculator.js';

export type { CameraInterest } from './camera-interest-calculator.js';

export { SmoothCameraController } from './smooth-camera-controller.js';

export { AutomaticCameraManager } from './automatic-camera-manager.js';

export type {
  EasingType,
  CinematicActionType,
  PanCommand,
  ZoomCommand,
  RotateCommand,
  OrbitCommand,
  Keyframe,
  KeyframeCommand,
  CinematicCommand,
} from './cinematic-commands.js';

export {
  createPanCommand,
  createZoomCommand,
  createRotateCommand,
  createOrbitCommand,
  createKeyframeCommand,
  validateCinematicCommand,
} from './cinematic-commands.js';

export { CinematicCameraController } from './cinematic-camera-controller.js';

export type { CameraMode, CinematicState } from './cinematic-mode-manager.js';

export { CinematicModeManager } from './cinematic-mode-manager.js';

export type { CameraConfig } from './camera-config.js';

export {
  DEFAULT_CAMERA_CONFIG,
  FAST_CAMERA_CONFIG,
  CINEMATIC_CONFIG,
  validateCameraConfig,
  mergeConfig,
  getPresetConfig,
} from './camera-config.js';
