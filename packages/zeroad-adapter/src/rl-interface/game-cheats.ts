/**
 * Game Cheats Utility
 *
 * Uses RL Interface /evaluate endpoint to run JavaScript commands in game.
 * This allows us to:
 * - Enable cheat mode
 * - Disable fog of war
 * - Send chat messages
 * - Manipulate game settings
 *
 * Story R3.1: Tournament Setup
 */

import { RLHTTPClient } from './http-client.js';
import { Logger } from '../config/logger.js';

export class GameCheats {
  constructor(private client: RLHTTPClient, private logger: Logger) {}

  /**
   * Enable cheat mode by sending chat command "jam jam"
   * This unlocks god-like abilities in 0 A.D.
   */
  async enableCheats(): Promise<boolean> {
    try {
      this.logger.info('Enabling cheats via chat command...');

      // JavaScript to send chat message
      const code = `
        if (Engine.GetGUIObjectByName) {
          const chatInput = Engine.GetGUIObjectByName("chatInput");
          if (chatInput) {
            Engine.GetGUIObjectByName("chatInput").focus();
            Engine.SetCameraTarget([128, 128, 100]);
          }
        }
        // Try to trigger cheat mode
        const msg = "jam jam";
        if (Engine.PostNetworkCommand) {
          Engine.PostNetworkCommand({
            type: "chat",
            message: msg
          });
        }
        msg;
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Cheat command sent', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to enable cheats', { error: String(error) });
      return false;
    }
  }

  /**
   * Disable fog of war
   * Makes entire map visible to both players
   */
  async disableFogOfWar(): Promise<boolean> {
    try {
      this.logger.info('Disabling fog of war...');

      const code = `
        if (Engine.GetGUIObjectByName) {
          // Try multiple methods to disable FOW
          try {
            const msg = "reveal map";
            if (Engine.PostNetworkCommand) {
              Engine.PostNetworkCommand({
                type: "chat",
                message: msg
              });
            }
          } catch (e) {}

          // Alternative: disable through render settings
          try {
            if (Engine.RenderOptions) {
              Engine.RenderOptions.SilhouettesRendering = true;
            }
          } catch (e) {}
        }
        "fog of war disabled";
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Fog of war disabled', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to disable fog of war', { error: String(error) });
      return false;
    }
  }

  /**
   * Send a chat message to all players
   */
  async sendChatMessage(message: string): Promise<boolean> {
    try {
      this.logger.info('Sending chat message', { message });

      const safeMessage = message.replace(/"/g, '\\"');
      const code = `
        if (Engine.PostNetworkCommand) {
          Engine.PostNetworkCommand({
            type: "chat",
            message: "${safeMessage}"
          });
        }
        "message sent";
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Chat message sent', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to send chat message', { error: String(error) });
      return false;
    }
  }

  /**
   * Set game speed
   */
  async setGameSpeed(speed: number): Promise<boolean> {
    try {
      this.logger.info('Setting game speed', { speed });

      const code = `
        if (Engine.SetSimRate) {
          Engine.SetSimRate(${Math.max(0.1, Math.min(10, speed))});
        }
        "speed set";
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Game speed set', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to set game speed', { error: String(error) });
      return false;
    }
  }

  /**
   * Pause the game
   */
  async pauseGame(): Promise<boolean> {
    try {
      this.logger.info('Pausing game...');

      const code = `
        if (Engine.SetSimRate) {
          Engine.SetSimRate(0);
        }
        "game paused";
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Game paused', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to pause game', { error: String(error) });
      return false;
    }
  }

  /**
   * Resume the game
   */
  async resumeGame(speed: number = 1): Promise<boolean> {
    try {
      this.logger.info('Resuming game', { speed });

      const code = `
        if (Engine.SetSimRate) {
          Engine.SetSimRate(${Math.max(0.1, Math.min(10, speed))});
        }
        "game resumed";
      `;

      const result = await this.client.evaluate(code);
      this.logger.info('Game resumed', { result });
      return true;
    } catch (error) {
      this.logger.error('Failed to resume game', { error: String(error) });
      return false;
    }
  }
}
