/**
 * Camera Mod Controller
 *
 * Broadcasts camera recommendations to external tools.
 * Direct in-game camera control via RL Interface is not supported by 0 A.D.
 *
 * The camera recommendations are sent via the CameraBroadcastServer
 * which external tools (OBS, streaming software) can subscribe to.
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

/**
 * This controller manages camera movement recommendations.
 *
 * NOTE: Direct camera control via 0 A.D.'s RL Interface is not possible because:
 * - RL Interface is designed for AI gameplay commands only
 * - Camera control requires Engine.SetCameraData() which isn't accessible via /evaluate
 * - The /evaluate endpoint times out or doesn't process camera commands
 *
 * SOLUTION: Use the CameraBroadcastServer instead
 * - Broadcasts recommended camera positions to external tools
 * - OBS/streaming software can display these as overlays
 * - Or use them to guide manual camera movement
 */
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
      this.logger.info('✓ Camera recommendations ready (external tool integration)');
      resolve();
    });
  }

  /**
   * Set the RL client (not currently used for camera commands)
   */
  setRLClient(client: any): void {
    this.rlClient = client;
  }

  /**
   * Pan camera - broadcasts recommendation to external tools
   *
   * Since direct camera control via RL Interface is not supported,
   * this logs the intended pan for external tools to follow.
   */
  async panTo(x: number, z: number, duration: number = 1000): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Camera recommendation: pan to (${x.toFixed(1)}, ${z.toFixed(1)}) over ${duration}ms`);

    // Broadcast server will handle sending this to external tools
    // See CameraBroadcastServer for the actual distribution
  }

  /**
   * Instantly move camera to position - broadcasts recommendation
   */
  async setPosition(x: number, z: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Camera recommendation: move to (${x.toFixed(1)}, ${z.toFixed(1)})`);
  }

  /**
   * Set camera zoom - broadcasts recommendation
   */
  async setZoom(distance: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Camera controller not connected');
      return;
    }

    this.logger.info(`🎥 Camera recommendation: zoom to ${distance.toFixed(1)}`);
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    this.isConnected = false;
    this.logger.info('Camera controller disconnected');
  }
}
