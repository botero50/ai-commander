/**
 * Camera Mod Controller
 *
 * Communicates with the camera_commander mod running in 0 A.D.
 * Sends commands to move the camera to interesting game locations.
 */

import { Logger } from '../config/logger.js';

export interface CameraPosition {
  x: number;
  z: number;
}

export interface CameraCommand {
  action: 'pan' | 'set' | 'zoom';
  x?: number;
  z?: number;
  duration?: number;
  distance?: number;
}

export class CameraModController {
  private modSocket: any = null;
  private isConnected = false;
  private commandQueue: CameraCommand[] = [];

  constructor(private logger: Logger) {}

  /**
   * Connect to camera mod (when game starts)
   */
  connect(): Promise<void> {
    return new Promise((resolve) => {
      // For now, just resolve - actual connection happens when game starts
      // The mod will be loaded with the game, so we don't need to connect separately
      this.isConnected = true;
      this.logger.info('✓ Camera mod controller ready');
      resolve();
    });
  }

  /**
   * Pan camera to position
   */
  async panTo(x: number, z: number, duration: number = 1000): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera mod not connected');
      return;
    }

    const command: CameraCommand = {
      action: 'pan',
      x,
      z,
      duration,
    };

    this.logger.debug('Camera: pan to', { x, z, duration });
    this.commandQueue.push(command);
  }

  /**
   * Instantly move camera to position
   */
  async setPosition(x: number, z: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera mod not connected');
      return;
    }

    const command: CameraCommand = {
      action: 'set',
      x,
      z,
    };

    this.logger.debug('Camera: set position', { x, z });
    this.commandQueue.push(command);
  }

  /**
   * Set camera zoom distance
   */
  async setZoom(distance: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera mod not connected');
      return;
    }

    const command: CameraCommand = {
      action: 'zoom',
      distance,
    };

    this.logger.debug('Camera: set zoom', { distance });
    this.commandQueue.push(command);
  }

  /**
   * Get pending commands (called by arena loop)
   */
  getPendingCommands(): CameraCommand[] {
    const commands = this.commandQueue;
    this.commandQueue = [];
    return commands;
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected = false;
    this.logger.info('Camera mod controller disconnected');
  }
}
