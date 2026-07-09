/**
 * Cinematic Camera Controller
 *
 * Handles advanced camera movements:
 * - Panning (smooth point-to-point movement)
 * - Zooming (FOV/distance changes)
 * - Rotating (camera angles)
 * - Keyframe sequences (complex paths)
 *
 * All movements are time-based and independent of frame rate.
 */

import { PanCommand, ZoomCommand, RotateCommand, EasingType } from './cinematic-commands.js';

interface Position {
  readonly x: number;
  readonly z: number;
}

interface Rotation {
  readonly yaw: number;
  readonly pitch?: number;
  readonly roll?: number;
}

interface CameraState {
  position: Position;
  zoom: number;
  rotation: Rotation;
}

/**
 * Easing functions for smooth animations
 */
const easing = {
  linear: (t: number) => t,
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => 1 - (1 - t) * (1 - t),
};

export class CinematicCameraController {
  private position: Position = { x: 0, z: 0 };
  private zoom: number = 1.0;
  private rotation: Rotation = { yaw: 0, pitch: 0, roll: 0 };

  // Pan state
  private panStart: Position | null = null;
  private panEnd: Position | null = null;
  private panStartTime: number = 0;
  private panDuration: number = 0;
  private panEasing: EasingType = 'easeInOut';
  private isPanning: boolean = false;

  // Zoom state
  private zoomStart: number = 1.0;
  private zoomEnd: number = 1.0;
  private zoomStartTime: number = 0;
  private zoomDuration: number = 0;
  private zoomEasing: EasingType = 'easeInOut';
  private isZooming: boolean = false;

  // Rotation state
  private rotationStart: Rotation | null = null;
  private rotationEnd: Rotation | null = null;
  private rotationStartTime: number = 0;
  private rotationDuration: number = 0;
  private rotationEasing: EasingType = 'easeInOut';
  private isRotating: boolean = false;

  /**
   * Set initial camera state
   */
  setState(position: Position, zoom: number = 1.0, rotation: Rotation = { yaw: 0 }): void {
    this.position = { ...position };
    this.zoom = zoom;
    this.rotation = { ...rotation, pitch: rotation.pitch ?? 0, roll: rotation.roll ?? 0 };
  }

  /**
   * Pan from one location to another
   */
  pan(from: Position, to: Position, durationMs: number, easingType: EasingType = 'easeInOut'): void {
    this.panStart = { ...from };
    this.panEnd = { ...to };
    this.panStartTime = Date.now();
    this.panDuration = durationMs;
    this.panEasing = easingType;
    this.isPanning = true;
  }

  /**
   * Zoom camera
   */
  zoomTo(targetZoom: number, durationMs: number, easingType: EasingType = 'easeInOut'): void {
    this.zoomStart = this.zoom;
    this.zoomEnd = targetZoom;
    this.zoomStartTime = Date.now();
    this.zoomDuration = durationMs;
    this.zoomEasing = easingType;
    this.isZooming = true;
  }

  /**
   * Rotate camera
   */
  rotate(
    targetYaw: number,
    targetPitch: number = 0,
    targetRoll: number = 0,
    durationMs: number = 1000,
    easingType: EasingType = 'easeInOut'
  ): void {
    this.rotationStart = { ...this.rotation };
    this.rotationEnd = { yaw: targetYaw, pitch: targetPitch, roll: targetRoll };
    this.rotationStartTime = Date.now();
    this.rotationDuration = durationMs;
    this.rotationEasing = easingType;
    this.isRotating = true;
  }

  /**
   * Update camera state (call every frame)
   */
  updateFrame(): void {
    const now = Date.now();

    // Update pan
    if (this.isPanning && this.panStart && this.panEnd) {
      const elapsed = now - this.panStartTime;
      const progress = Math.min(elapsed / this.panDuration, 1.0);
      const eased = easing[this.panEasing](progress);

      this.position = {
        x: this.panStart.x + (this.panEnd.x - this.panStart.x) * eased,
        z: this.panStart.z + (this.panEnd.z - this.panStart.z) * eased,
      };

      if (progress >= 1.0) {
        this.isPanning = false;
      }
    }

    // Update zoom
    if (this.isZooming) {
      const elapsed = now - this.zoomStartTime;
      const progress = Math.min(elapsed / this.zoomDuration, 1.0);
      const eased = easing[this.zoomEasing](progress);

      this.zoom = this.zoomStart + (this.zoomEnd - this.zoomStart) * eased;

      if (progress >= 1.0) {
        this.isZooming = false;
      }
    }

    // Update rotation
    if (this.isRotating && this.rotationStart && this.rotationEnd) {
      const elapsed = now - this.rotationStartTime;
      const progress = Math.min(elapsed / this.rotationDuration, 1.0);
      const eased = easing[this.rotationEasing](progress);

      this.rotation = {
        yaw:
          this.rotationStart.yaw +
          (this.rotationEnd.yaw - this.rotationStart.yaw) * eased,
        pitch:
          (this.rotationStart.pitch ?? 0) +
          ((this.rotationEnd.pitch ?? 0) - (this.rotationStart.pitch ?? 0)) * eased,
        roll:
          (this.rotationStart.roll ?? 0) +
          ((this.rotationEnd.roll ?? 0) - (this.rotationStart.roll ?? 0)) * eased,
      };

      if (progress >= 1.0) {
        this.isRotating = false;
      }
    }
  }

  /**
   * Check if any animation is active
   */
  isMoving(): boolean {
    return this.isPanning || this.isZooming || this.isRotating;
  }

  /**
   * Get overall progress (0-1)
   */
  getProgress(): number {
    const now = Date.now();
    let maxProgress = 0;

    if (this.isPanning && this.panStart) {
      const elapsed = now - this.panStartTime;
      maxProgress = Math.max(maxProgress, Math.min(elapsed / this.panDuration, 1.0));
    }

    if (this.isZooming) {
      const elapsed = now - this.zoomStartTime;
      maxProgress = Math.max(maxProgress, Math.min(elapsed / this.zoomDuration, 1.0));
    }

    if (this.isRotating && this.rotationStart) {
      const elapsed = now - this.rotationStartTime;
      maxProgress = Math.max(maxProgress, Math.min(elapsed / this.rotationDuration, 1.0));
    }

    return maxProgress;
  }

  /**
   * Get current camera state
   */
  getState(): CameraState {
    return {
      position: { ...this.position },
      zoom: this.zoom,
      rotation: { ...this.rotation },
    };
  }

  /**
   * Get current position
   */
  getPosition(): Position {
    return { ...this.position };
  }

  /**
   * Get current zoom level
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * Get current rotation
   */
  getRotation(): Rotation {
    return { ...this.rotation };
  }

  /**
   * Stop all animations
   */
  stop(): void {
    this.isPanning = false;
    this.isZooming = false;
    this.isRotating = false;
  }

  /**
   * Instantly set camera without animation
   */
  setPosition(x: number, z: number): void {
    this.position = { x, z };
    this.isPanning = false;
  }

  /**
   * Instantly set zoom without animation
   */
  setZoom(targetZoom: number): void {
    this.zoom = targetZoom;
    this.isZooming = false;
  }

  /**
   * Instantly set rotation without animation
   */
  setRotation(yaw: number, pitch: number = 0, roll: number = 0): void {
    this.rotation = { yaw, pitch, roll };
    this.isRotating = false;
  }
}
