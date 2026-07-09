/**
 * Cinematic Mode Manager
 *
 * Orchestrates cinematic camera features and mode transitions.
 * - Manage camera modes (automatic, cinematic, free)
 * - Handle cinematic operations (pan, zoom, rotate)
 * - Queue and execute operations
 * - Broadcast cinematic events
 */

import { CinematicCameraController } from './cinematic-camera-controller.js';
import { CameraConfig, DEFAULT_CAMERA_CONFIG } from './camera-config.js';

export type CameraMode = 'automatic' | 'cinematic' | 'free';

export interface CinematicState {
  readonly mode: CameraMode;
  readonly isMoving: boolean;
  readonly progress: number;
  readonly position: { readonly x: number; readonly z: number };
  readonly zoom: number;
  readonly rotation: {
    readonly yaw: number;
    readonly pitch?: number;
    readonly roll?: number;
  };
}

interface PendingOperation {
  readonly type: 'pan' | 'zoom' | 'rotate';
  readonly execute: () => void;
}

export class CinematicModeManager {
  private mode: CameraMode = 'automatic';
  private controller: CinematicCameraController;
  private config: CameraConfig;
  private pendingOperations: PendingOperation[] = [];
  private isExecutingOperation: boolean = false;
  private eventCallbacks: Array<(event: string, data: any) => void> = [];

  constructor(config: Partial<CameraConfig> = {}) {
    this.controller = new CinematicCameraController();
    this.config = { ...DEFAULT_CAMERA_CONFIG, ...config };
  }

  /**
   * Set camera mode
   */
  setMode(newMode: CameraMode): void {
    if (this.mode === newMode) {
      return;
    }

    const oldMode = this.mode;
    this.mode = newMode;

    this.broadcast('mode_changed', {
      from: oldMode,
      to: newMode,
    });
  }

  /**
   * Get current mode
   */
  getMode(): CameraMode {
    return this.mode;
  }

  /**
   * Pan camera from one position to another
   */
  async pan(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    durationMs?: number
  ): Promise<void> {
    const duration = durationMs ?? this.config.defaultPanDuration;

    return this.queueOperation({
      type: 'pan',
      execute: () => {
        this.controller.pan({ x: fromX, z: fromZ }, { x: toX, z: toZ }, duration, this.config.defaultEasing);
        this.broadcast('pan_started', {
          from: { x: fromX, z: fromZ },
          to: { x: toX, z: toZ },
          duration,
        });
      },
    });
  }

  /**
   * Zoom camera
   */
  async zoom(targetZoom: number, durationMs?: number): Promise<void> {
    const duration = durationMs ?? this.config.defaultPanDuration;

    return this.queueOperation({
      type: 'zoom',
      execute: () => {
        // Clamp zoom to valid range
        const clampedZoom = Math.max(this.config.minZoom, Math.min(this.config.maxZoom, targetZoom));
        this.controller.zoomTo(clampedZoom, duration, this.config.defaultEasing);
        this.broadcast('zoom_started', {
          targetZoom: clampedZoom,
          duration,
        });
      },
    });
  }

  /**
   * Rotate camera
   */
  async rotate(
    yaw: number,
    pitch: number = 0,
    roll: number = 0,
    durationMs?: number
  ): Promise<void> {
    if (!this.config.enableRotation) {
      this.broadcast('rotation_disabled', {});
      return;
    }

    const duration = durationMs ?? this.config.defaultRotationDuration;

    return this.queueOperation({
      type: 'rotate',
      execute: () => {
        this.controller.rotate(yaw, pitch, roll, duration, this.config.defaultEasing);
        this.broadcast('rotate_started', {
          yaw,
          pitch,
          roll,
          duration,
        });
      },
    });
  }

  /**
   * Focus on a location with optional zoom
   */
  async focusOnLocation(x: number, z: number, zoomLevel: number = 1.0): Promise<void> {
    const state = this.controller.getState();

    // Pan to location
    await this.pan(state.position.x, state.position.z, x, z, this.config.defaultPanDuration);

    // Zoom if specified
    if (zoomLevel !== state.zoom) {
      await this.zoom(zoomLevel, this.config.defaultPanDuration);
    }

    this.broadcast('focus_location', {
      x,
      z,
      zoom: zoomLevel,
    });
  }

  /**
   * Trigger dramatic zoom (for important moments)
   */
  async dramaticZoom(): Promise<void> {
    return this.zoom(this.config.dramaticZoom, this.config.dramaticPanDuration);
  }

  /**
   * Update camera (call every frame)
   */
  update(): void {
    this.controller.updateFrame();

    // Process pending operations
    if (!this.isExecutingOperation && this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      if (operation) {
        this.isExecutingOperation = true;
        operation.execute();
      }
    }

    // Check if current operation is complete
    if (this.isExecutingOperation && !this.controller.isMoving()) {
      this.isExecutingOperation = false;
      this.broadcast('operation_complete', {});
    }
  }

  /**
   * Get current cinematic state
   */
  getState(): CinematicState {
    const controllerState = this.controller.getState();
    return {
      mode: this.mode,
      isMoving: this.controller.isMoving() || this.isExecutingOperation,
      progress: this.controller.getProgress(),
      position: controllerState.position,
      zoom: controllerState.zoom,
      rotation: controllerState.rotation,
    };
  }

  /**
   * Subscribe to cinematic events
   */
  subscribe(callback: (event: string, data: any) => void): () => void {
    this.eventCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Broadcast event to subscribers
   */
  private broadcast(event: string, data: any): void {
    for (const callback of this.eventCallbacks) {
      try {
        callback(event, data);
      } catch (err) {
        console.error(`Error in cinematic event subscriber: ${err}`);
      }
    }
  }

  /**
   * Queue cinematic operation
   */
  private queueOperation(operation: PendingOperation): Promise<void> {
    return new Promise((resolve) => {
      this.pendingOperations.push(operation);

      // Subscribe to operation completion
      const unsubscribe = this.subscribe((event) => {
        if (event === 'operation_complete') {
          unsubscribe();
          resolve();
        }
      });

      // Start processing if not already doing so
      if (!this.isExecutingOperation && this.pendingOperations.length === 1) {
        const nextOp = this.pendingOperations.shift();
        if (nextOp) {
          this.isExecutingOperation = true;
          nextOp.execute();
        }
      }
    });
  }

  /**
   * Clear all pending operations
   */
  clear(): void {
    this.pendingOperations = [];
    this.isExecutingOperation = false;
    this.controller.stop();
    this.broadcast('cleared', {});
  }

  /**
   * Get configuration
   */
  getConfig(): CameraConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(updates: Partial<CameraConfig>): void {
    this.config = { ...this.config, ...updates };
    this.broadcast('config_changed', {
      config: this.config,
    });
  }
}
