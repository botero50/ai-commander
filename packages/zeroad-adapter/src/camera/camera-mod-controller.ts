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
  private rlClient: any = null;
  private isConnected = false;
  private commandQueue: CameraCommand[] = [];

  constructor(private logger: Logger, rlClient?: any) {
    this.rlClient = rlClient;
  }

  /**
   * Connect to camera controller
   */
  connect(): Promise<void> {
    return new Promise((resolve) => {
      this.isConnected = true;
      this.logger.info('✓ Camera controller ready');
      resolve();
    });
  }

  /**
   * Set the RL client for executing camera commands
   */
  setRLClient(client: any): void {
    this.rlClient = client;
  }

  /**
   * Pan camera to position
   */
  async panTo(x: number, z: number, duration: number = 1000): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Pan camera to (${x.toFixed(1)}, ${z.toFixed(1)}) over ${duration}ms`);

    // If we have an RL client, send the command through evaluate
    if (this.rlClient) {
      try {
        const code = `
          let cam = Engine.GetCameraData ? Engine.GetCameraData() : null;
          if (cam) {
            Engine.SetCameraData(${x}, ${z}, cam.zoom, cam.rotX, cam.rotY, cam.zoom);
            print("[Camera] Panned to ${x}, ${z}");
          }
        `;
        await this.rlClient.evaluate(code);
      } catch (error) {
        this.logger.debug('Camera pan via evaluate failed (expected)', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    const command: CameraCommand = {
      action: 'pan',
      x,
      z,
      duration,
    };

    this.commandQueue.push(command);
  }

  /**
   * Instantly move camera to position
   */
  async setPosition(x: number, z: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Set camera to (${x.toFixed(1)}, ${z.toFixed(1)})`);

    const command: CameraCommand = {
      action: 'set',
      x,
      z,
    };

    this.commandQueue.push(command);
  }

  /**
   * Set camera zoom distance
   */
  async setZoom(distance: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Set zoom to ${distance.toFixed(1)}`);

    const command: CameraCommand = {
      action: 'zoom',
      distance,
    };

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
