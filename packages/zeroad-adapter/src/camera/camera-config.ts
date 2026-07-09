/**
 * Camera Configuration
 *
 * Configurable settings for automatic and cinematic camera behavior.
 */

import { EasingType } from './cinematic-commands.js';

export interface CameraConfig {
  // Zoom settings
  readonly defaultZoom: number; // 1.0 = normal view
  readonly minZoom: number; // Minimum zoom (zoomed in most)
  readonly maxZoom: number; // Maximum zoom (zoomed out most)

  // Pan settings
  readonly defaultPanDuration: number; // milliseconds
  readonly defaultEasing: EasingType;

  // Rotation settings
  readonly defaultRotationDuration: number; // milliseconds
  readonly enableRotation: boolean;

  // Dramatic moments
  readonly dramaticZoom: number; // Zoom level for important events
  readonly dramaticPanDuration: number; // Pan speed for dramatic moments

  // Automatic camera settings
  readonly automaticUpdateInterval: number; // How often to update target (ms)
  readonly automaticCombatDuration: number; // Pan duration for combat
  readonly automaticExpansionDuration: number; // Pan duration for expansion
  readonly automaticGatheringDuration: number; // Pan duration for gathering
  readonly automaticMovementDuration: number; // Pan duration for movement
}

/**
 * Default camera configuration (balanced for spectator experience)
 */
export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  // Zoom settings
  defaultZoom: 1.0,
  minZoom: 0.5, // Zoomed in
  maxZoom: 3.0, // Zoomed out

  // Pan settings
  defaultPanDuration: 1200,
  defaultEasing: 'easeInOut',

  // Rotation settings
  defaultRotationDuration: 1500,
  enableRotation: true,

  // Dramatic moments
  dramaticZoom: 0.7, // Zoom in for drama
  dramaticPanDuration: 800,

  // Automatic camera settings
  automaticUpdateInterval: 500,
  automaticCombatDuration: 800,
  automaticExpansionDuration: 1200,
  automaticGatheringDuration: 1500,
  automaticMovementDuration: 1000,
};

/**
 * Fast-paced configuration (rapid camera changes)
 */
export const FAST_CAMERA_CONFIG: CameraConfig = {
  ...DEFAULT_CAMERA_CONFIG,
  defaultPanDuration: 800,
  defaultRotationDuration: 1000,
  automaticCombatDuration: 600,
  automaticExpansionDuration: 1000,
  automaticGatheringDuration: 1200,
  automaticMovementDuration: 800,
};

/**
 * Cinematic configuration (dramatic, slow movements)
 */
export const CINEMATIC_CONFIG: CameraConfig = {
  ...DEFAULT_CAMERA_CONFIG,
  defaultPanDuration: 2000,
  defaultRotationDuration: 2500,
  dramaticZoom: 0.6,
  dramaticPanDuration: 1200,
  automaticCombatDuration: 1200,
  automaticExpansionDuration: 1800,
  automaticGatheringDuration: 2000,
  automaticMovementDuration: 1500,
};

/**
 * Validate camera configuration
 */
export function validateCameraConfig(config: CameraConfig): boolean {
  return (
    config.defaultZoom > 0 &&
    config.minZoom > 0 &&
    config.maxZoom > config.minZoom &&
    config.defaultPanDuration > 0 &&
    config.dramaticZoom > 0 &&
    config.dramaticPanDuration > 0 &&
    config.automaticUpdateInterval > 0
  );
}

/**
 * Merge configuration with defaults
 */
export function mergeConfig(
  overrides?: Partial<CameraConfig>
): CameraConfig {
  return {
    ...DEFAULT_CAMERA_CONFIG,
    ...overrides,
  };
}

/**
 * Get preset configuration by name
 */
export function getPresetConfig(preset: 'default' | 'fast' | 'cinematic'): CameraConfig {
  switch (preset) {
    case 'fast':
      return FAST_CAMERA_CONFIG;
    case 'cinematic':
      return CINEMATIC_CONFIG;
    case 'default':
    default:
      return DEFAULT_CAMERA_CONFIG;
  }
}
