/**
 * Smooth Camera Controller
 *
 * Handles interpolated camera movement from current position to target.
 * Uses easing functions for natural motion.
 * Returns camera commands each frame.
 */

import { createSetTargetCommand, CameraCommand } from './camera-commands.js';

interface Position {
  readonly x: number;
  readonly z: number;
}

/**
 * Quadratic easing function (ease-in-out)
 * Starts slow, speeds up, slows down at end
 */
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export class SmoothCameraController {
  private currentPos: Position = { x: 0, z: 0 };
  private targetPos: Position = { x: 0, z: 0 };
  private startPos: Position = { x: 0, z: 0 };
  private startTime: number = 0;
  private duration: number = 1000; // milliseconds
  private isMoving = false;
  private lastCommandTime = 0;

  /**
   * Initialize camera at starting position
   */
  setStartPosition(x: number, z: number): void {
    this.currentPos = { x, z };
    this.targetPos = { x, z };
    this.startPos = { x, z };
  }

  /**
   * Set new target position
   * Starts interpolation from current position to target
   */
  setTarget(newTarget: Position, durationMs: number = 1000): void {
    this.startPos = this.currentPos;
    this.targetPos = newTarget;
    this.duration = durationMs;
    this.startTime = Date.now();
    this.isMoving = true;
  }

  /**
   * Get camera command to execute this frame
   * Returns null if already at target
   */
  getNextCommand(): CameraCommand | null {
    if (!this.isMoving) {
      return null;
    }

    const elapsed = Date.now() - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1.0);

    // Ease the progress value
    const eased = easeInOutQuad(progress);

    // Interpolate position
    this.currentPos = {
      x: this.startPos.x + (this.targetPos.x - this.startPos.x) * eased,
      z: this.startPos.z + (this.targetPos.z - this.startPos.z) * eased,
    };

    // Check if reached target
    if (progress >= 1.0) {
      this.isMoving = false;
      this.currentPos = this.targetPos;
    }

    return createSetTargetCommand(this.currentPos.x, this.currentPos.z, 100);
  }

  /**
   * Get current camera position
   */
  getCurrentPosition(): Position {
    return { ...this.currentPos };
  }

  /**
   * Check if camera is currently moving
   */
  isMovingToTarget(): boolean {
    return this.isMoving;
  }

  /**
   * Get target position
   */
  getTarget(): Position {
    return { ...this.targetPos };
  }

  /**
   * Get progress of current movement (0-1)
   */
  getProgress(): number {
    if (!this.isMoving) {
      return 0;
    }
    const elapsed = Date.now() - this.startTime;
    return Math.min(elapsed / this.duration, 1.0);
  }

  /**
   * Stop camera at current position
   */
  stop(): void {
    this.isMoving = false;
    this.targetPos = this.currentPos;
  }

  /**
   * Instantly move to position without interpolation
   */
  teleport(x: number, z: number): CameraCommand {
    this.stop();
    this.currentPos = { x, z };
    this.targetPos = { x, z };
    return createSetTargetCommand(x, z, 0);
  }

  /**
   * Get distance to target
   */
  getDistanceToTarget(): number {
    const dx = this.targetPos.x - this.currentPos.x;
    const dz = this.targetPos.z - this.currentPos.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
}
