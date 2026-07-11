/**
 * Camera Mod Controller
 *
 * Sends camera movement commands to 0 A.D. via /step endpoint.
 * 0 A.D. processes camera commands as game actions.
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
   * Pan camera to position via game command
   *
   * Sends camera pan command through /step endpoint.
   * 0 A.D. will smoothly interpolate camera to target.
   */
  async panTo(x: number, z: number, duration: number = 1000): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Pan camera to (${x.toFixed(1)}, ${z.toFixed(1)}) over ${duration}ms`);

    // If we have an RL client, send the command through /step
    if (this.rlClient) {
      try {
        // Send camera pan command via /step endpoint (player 0 = gaia/system command)
        // Command format: playerID;{"type": "camera-pan", "x": x, "z": z, "duration": duration}
        const command = {
          type: 'camera-pan',
          x: Math.round(x * 100) / 100,  // Round to 2 decimal places
          z: Math.round(z * 100) / 100,
          duration: Math.round(duration),
        };

        this.logger.debug('Sending camera pan command', command);

        // Use step with camera command (send as gaia player 0)
        await this.rlClient.step([
          {
            playerID: 0,  // Gaia/system player for camera commands
            json_cmd: command,
          }
        ]);

        this.logger.debug('Camera pan command sent successfully', { x, z });
      } catch (error) {
        this.logger.debug('Camera pan command failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
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

    if (this.rlClient) {
      try {
        const command = {
          type: 'camera-set',
          x: Math.round(x * 100) / 100,
          z: Math.round(z * 100) / 100,
        };

        await this.rlClient.step([
          {
            playerID: 0,
            json_cmd: command,
          }
        ]);
      } catch (error) {
        this.logger.debug('Camera set command failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
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

    if (this.rlClient) {
      try {
        const command = {
          type: 'camera-zoom',
          distance: Math.round(distance * 100) / 100,
        };

        await this.rlClient.step([
          {
            playerID: 0,
            json_cmd: command,
          }
        ]);
      } catch (error) {
        this.logger.debug('Camera zoom command failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected = false;
    this.logger.info('Camera controller disconnected');
  }
}
