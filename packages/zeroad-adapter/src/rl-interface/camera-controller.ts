/**
 * Camera Controller via RL Interface
 *
 * Controls camera position using the camera_control mod and RL Interface.
 * Provides smooth camera transitions and bounds checking.
 */

import { RLHTTPClient } from './http-client.js';
import { Logger } from '../config/logger.js';

export interface CameraPosition {
  x: number;
  y: number; // height
  z: number;
  rotX: number; // pitch
  rotY: number; // roll (usually 0)
  rotZ: number; // yaw
}

export interface CameraTarget {
  x: number;
  z: number;
  height?: number;
  pitch?: number;
  yaw?: number;
}

export class CameraController {
  private logger: Logger;
  private client: RLHTTPClient;
  private currentPosition: CameraPosition | null = null;

  constructor(client: RLHTTPClient, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  /**
   * Get current camera position
   */
  async getPosition(): Promise<CameraPosition | null> {
    try {
      const code = `JSON.stringify(Engine.GetCameraData());`;
      const result = await this.client.evaluate(code);

      if (typeof result === 'string') {
        try {
          this.currentPosition = JSON.parse(result);
          return this.currentPosition;
        } catch (e) {
          // result might not be JSON
          this.logger.debug('Could not parse camera position', { result });
          return null;
        }
      }

      return null;
    } catch (error) {
      this.logger.debug('Failed to get camera position', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Move camera to target position
   */
  async moveToTarget(target: CameraTarget, duration?: number): Promise<boolean> {
    try {
      // Use sensible defaults
      const x = target.x;
      const z = target.z;
      const y = target.height ?? 100;
      const rotX = target.pitch ?? 45;
      const rotY = 0; // Roll - rarely changed
      const rotZ = target.yaw ?? 0;

      this.logger.debug('Moving camera to target', { x, z, y, rotX, rotZ });

      const code = `
        try {
          Engine.SetCameraData(${x}, ${y}, ${z}, ${rotX}, ${rotY}, ${rotZ});
          "camera moved to (" + ${x} + ", " + ${z} + ")";
        } catch(e) {
          "error: " + e;
        }
      `;

      const result = await this.client.evaluate(code);
      this.logger.debug('Camera move result', { result });

      // Update local cache
      this.currentPosition = { x, y, z, rotX, rotY, rotZ };
      return true;
    } catch (error) {
      this.logger.debug('Failed to move camera', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Move camera relative to current position
   */
  async moveRelative(dx: number, dz: number, dyHeight?: number): Promise<boolean> {
    if (!this.currentPosition) {
      const pos = await this.getPosition();
      if (!pos) {
        this.logger.warn('Cannot move camera relatively - unknown current position');
        return false;
      }
    }

    if (!this.currentPosition) return false;

    return this.moveToTarget({
      x: this.currentPosition.x + dx,
      z: this.currentPosition.z + dz,
      height: dyHeight !== undefined ? this.currentPosition.y + dyHeight : this.currentPosition.y,
      pitch: this.currentPosition.rotX,
      yaw: this.currentPosition.rotZ,
    });
  }

  /**
   * Pan camera to look at target
   */
  async lookAt(targetX: number, targetZ: number): Promise<boolean> {
    try {
      if (!this.currentPosition) {
        const pos = await this.getPosition();
        if (!pos) {
          this.logger.warn('Cannot look at target - unknown current position');
          return false;
        }
      }

      if (!this.currentPosition) return false;

      // Calculate yaw to face target
      const dx = targetX - this.currentPosition.x;
      const dz = targetZ - this.currentPosition.z;
      const yaw = (Math.atan2(dx, dz) * 180) / Math.PI;

      return this.moveToTarget({
        x: this.currentPosition.x,
        z: this.currentPosition.z,
        height: this.currentPosition.y,
        pitch: this.currentPosition.rotX,
        yaw,
      });
    } catch (error) {
      this.logger.debug('Failed to look at target', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Reset camera to default view
   */
  async reset(): Promise<boolean> {
    return this.moveToTarget({
      x: 512,
      z: 512,
      height: 150,
      pitch: 45,
      yaw: 0,
    });
  }

  /**
   * Get cached camera position (may be stale)
   */
  getCachedPosition(): CameraPosition | null {
    return this.currentPosition;
  }
}
