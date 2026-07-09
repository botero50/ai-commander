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
  createPanCommand,
  createFollowUnitCommand,
} from './camera-commands.js';

export { CameraInterestCalculator } from './camera-interest-calculator.js';

export type { CameraInterest } from './camera-interest-calculator.js';

export { SmoothCameraController } from './smooth-camera-controller.js';

export { AutomaticCameraManager } from './automatic-camera-manager.js';
