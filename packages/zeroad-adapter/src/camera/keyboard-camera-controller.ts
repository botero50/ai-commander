/**
 * Keyboard-based Camera Controller for 0 A.D.
 *
 * Controls the in-game camera by simulating keyboard input (WASD, arrow keys).
 * This works with any version of 0 A.D. since it just sends key presses to the game window.
 *
 * Limitations:
 * - Cannot set exact position (only relative movement)
 * - Requires game window to be focused
 * - Movement timing is approximate
 */

import { Logger } from '../config/logger.js';

export interface CameraMovement {
  direction: 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out';
  duration: number; // milliseconds to hold key
}

const KEY_CODES = {
  W: 0x57, // Up
  A: 0x41, // Left
  S: 0x53, // Down
  D: 0x44, // Right
  UP: 0x26, // Arrow Up
  DOWN: 0x28, // Arrow Down
  LEFT: 0x25, // Arrow Left
  RIGHT: 0x27, // Arrow Right
  SCROLL_UP: 0x26, // Wheel Up (use arrow up)
  SCROLL_DOWN: 0x28, // Wheel Down (use arrow down)
};

const DIRECTION_KEYS = {
  up: KEY_CODES.W,
  down: KEY_CODES.S,
  left: KEY_CODES.A,
  right: KEY_CODES.D,
  'zoom-in': KEY_CODES.SCROLL_UP,
  'zoom-out': KEY_CODES.SCROLL_DOWN,
};

export class KeyboardCameraController {
  private logger: Logger;
  private gameWindowHandle: number | null = null;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Find and focus 0 A.D. game window
   */
  async focusGameWindow(): Promise<boolean> {
    try {
      // Try to find pyrogenesis process window
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Windows: Use tasklist to find if pyrogenesis is running
      const { stdout } = await execAsync('tasklist', { shell: 'cmd.exe' });
      if (!stdout.includes('pyrogenesis.exe')) {
        this.logger.warn('0 A.D. window not found');
        return false;
      }

      this.logger.debug('0 A.D. window found, focusing...');

      // Use nircmd to focus window (if available)
      try {
        await execAsync('nircmd win activate title "0 A.D."');
        this.logger.debug('Game window focused via nircmd');
        return true;
      } catch {
        this.logger.warn('Could not auto-focus window (nircmd not found)');
        return false;
      }
    } catch (error) {
      this.logger.error('Failed to focus game window', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Simulate keyboard press on Windows
   */
  private async sendKeyPress(keyCode: number, duration: number): Promise<void> {
    try {
      const { execSync } = await import('child_process');

      // Use PowerShell to send key press
      const psCommand = `
        Add-Type @"
          using System;
          using System.Runtime.InteropServices;
          public class Keyboard {
            [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, int dwExtraInfo);
          }
"@
        [Keyboard]::keybd_event(${keyCode}, 0, 0, 0);
        [System.Threading.Thread]::Sleep(${duration});
        [Keyboard]::keybd_event(${keyCode}, 2, 0, 0);
      `;

      execSync(`powershell -Command "${psCommand.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
    } catch (error) {
      this.logger.debug('Failed to send key press', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Move camera in a direction for a duration
   */
  async moveCamera(direction: 'up' | 'down' | 'left' | 'right', durationMs: number): Promise<void> {
    const keyCode = DIRECTION_KEYS[direction];

    if (!keyCode) {
      this.logger.error('Invalid direction', { direction });
      return;
    }

    this.logger.debug('Moving camera', { direction, durationMs });

    try {
      await this.sendKeyPress(keyCode, durationMs);
    } catch (error) {
      this.logger.error('Failed to move camera', {
        direction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Move to approximate position (relative movement chain)
   * This is a workaround - we can't set exact position with keyboard input
   */
  async moveTo(x: number, z: number, approximateCurrentX: number = 512, approximateCurrentZ: number = 512): Promise<void> {
    const dx = x - approximateCurrentX;
    const dz = z - approximateCurrentZ;

    const moveDistance = Math.abs(dx) + Math.abs(dz);
    const estimatedTimePerUnit = 10; // ms per unit of movement (approximate)
    const durationPerAxis = Math.abs(dx) * estimatedTimePerUnit;

    this.logger.info('Moving camera to approximate position', { x, z, dx, dz });

    // Move left/right
    if (dx > 0) {
      await this.moveCamera('right', durationPerAxis);
    } else if (dx < 0) {
      await this.moveCamera('left', durationPerAxis);
    }

    // Wait a bit between movements
    await new Promise(resolve => setTimeout(resolve, 200));

    // Move up/down
    const durationYAxis = Math.abs(dz) * estimatedTimePerUnit;
    if (dz > 0) {
      await this.moveCamera('down', durationYAxis);
    } else if (dz < 0) {
      await this.moveCamera('up', durationYAxis);
    }
  }

  /**
   * Zoom camera in/out
   */
  async zoom(direction: 'in' | 'out', durationMs: number): Promise<void> {
    const key = direction === 'in' ? 'zoom-in' : 'zoom-out';
    const keyCode = DIRECTION_KEYS[key];

    this.logger.debug('Zooming camera', { direction, durationMs });

    try {
      await this.sendKeyPress(keyCode, durationMs);
    } catch (error) {
      this.logger.error('Failed to zoom camera', {
        direction,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
