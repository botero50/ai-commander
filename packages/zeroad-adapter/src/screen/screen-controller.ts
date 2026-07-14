/**
 * Screen Controller
 *
 * Handles screenshot capture, minimap detection, and UI interactions
 * Using Python pynput for cross-platform compatibility
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { Logger } from '../config/logger.js';

export interface MinimapCoordinates {
  x: number;
  z: number;
  screenX: number;
  screenY: number;
}

export interface ScreenCapture {
  path: string;
  timestamp: number;
}

export class ScreenController {
  private logger: Logger;
  private pythonScript: string;

  constructor(logger: Logger) {
    this.logger = logger;
    this.pythonScript = path.join(process.cwd(), 'camera-controller.py');
  }

  /**
   * Take a screenshot of the game screen
   */
  async takeScreenshot(outputPath: string): Promise<ScreenCapture> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn('python', [this.pythonScript, 'screenshot', outputPath], {
          detached: true,
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`📸 Screenshot saved to ${outputPath}`);
            resolve({
              path: outputPath,
              timestamp: Date.now(),
            });
          } else {
            this.logger.error('Failed to take screenshot', { stderr });
            reject(new Error(`Screenshot failed: ${stderr}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Click at specific screen coordinates
   */
  async clickAt(x: number, y: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn('python', [this.pythonScript, 'click', x.toString(), y.toString()], {
          detached: true,
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`🖱️ Clicked at (${x}, ${y})`);
            resolve();
          } else {
            this.logger.error('Failed to click', { stderr });
            reject(new Error(`Click failed: ${stderr}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Detect and click the red base on minimap
   */
  async clickRedBase(): Promise<MinimapCoordinates> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn('python', [this.pythonScript, 'click-red-base'], {
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          const text = data.toString();
          stdout += text;
          this.logger.debug('Python stdout', { output: text });
        });

        proc.stderr?.on('data', (data) => {
          const text = data.toString();
          stderr += text;
          this.logger.debug('Python stderr', { output: text });
        });

        proc.on('close', (code) => {
          this.logger.info('Python process closed', { code, stdout, stderr });

          if (code === 0) {
            // Parse output to extract coordinates
            const minimapMatch = stdout.match(/Minimap coordinates: \((\d+), (\d+)\)/);
            const screenMatch = stdout.match(/Screen coordinates: \((\d+), (\d+)\)/);

            if (minimapMatch && screenMatch) {
              const result: MinimapCoordinates = {
                x: parseInt(minimapMatch[1]),
                z: parseInt(minimapMatch[2]),
                screenX: parseInt(screenMatch[1]),
                screenY: parseInt(screenMatch[2]),
              };
              this.logger.info(`🖱️ Base clicked at screen (${result.screenX}, ${result.screenY})`, result);
              resolve(result);
            } else {
              // If we can't parse, but the process succeeded, just log success
              this.logger.info('✅ Base click command executed successfully');
              // Try to extract screen coordinates from "Screen coordinates: (X, Y)" format
              const fallbackMatch = stdout.match(/Screen coordinates: \((\d+), (\d+)\)/);
              if (fallbackMatch) {
                const screenX = parseInt(fallbackMatch[1]);
                const screenY = parseInt(fallbackMatch[2]);
                this.logger.info(`🖱️ Clicked at screen (${screenX}, ${screenY})`);
                resolve({
                  x: 0,
                  z: 0,
                  screenX,
                  screenY,
                });
              } else {
                resolve({
                  x: 0,
                  z: 0,
                  screenX: 0,
                  screenY: 0,
                });
              }
            }
          } else {
            this.logger.error('Python process failed', { code, stdout, stderr });
            reject(new Error(`Base click failed (code ${code}): ${stdout || stderr}`));
          }
        });

        proc.on('error', (err) => {
          this.logger.error('Python process error', { error: err.message });
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Click at specific world coordinates on the minimap
   * This maps world game coordinates (e.g., battle location) to minimap screen position
   * Uses default calibration points (Acropolis Bay 2P)
   */
  async clickAtWorldCoordinates(worldX: number, worldZ: number): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn('python', [this.pythonScript, 'click-world', worldX.toString(), worldZ.toString()], {
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
          this.logger.debug('Python stdout', { output: data.toString() });
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
          this.logger.debug('Python stderr', { output: data.toString() });
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`🎯 Clicked world coordinates (${worldX}, ${worldZ})`);
            resolve();
          } else {
            this.logger.error('World coordinates click failed', { code, stdout, stderr });
            reject(new Error(`Click at world coordinates failed: ${stdout || stderr}`));
          }
        });

        proc.on('error', (err) => {
          this.logger.error('Python process error', { error: err.message });
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Click at specific world coordinates using map-specific calibration
   * Pass the detected town center coordinates for accurate minimap clicking
   */
  async clickAtWorldCoordinatesWithCalibration(
    worldX: number,
    worldZ: number,
    calibration: { red: { x: number; z: number }; blue: { x: number; z: number } }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const args = [
          this.pythonScript,
          'click-world-calibrated',
          worldX.toString(),
          worldZ.toString(),
          Math.round(calibration.red.x).toString(),
          Math.round(calibration.red.z).toString(),
          Math.round(calibration.blue.x).toString(),
          Math.round(calibration.blue.z).toString(),
        ];

        const proc = spawn('python', args, {
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
          this.logger.debug('Python stdout', { output: data.toString() });
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
          this.logger.debug('Python stderr', { output: data.toString() });
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info(`🎯 Clicked world coordinates (${worldX}, ${worldZ}) with calibration`, {
              redBase: calibration.red,
              blueBase: calibration.blue,
            });
            resolve();
          } else {
            this.logger.error('World coordinates click with calibration failed', { code, stdout, stderr });
            reject(new Error(`Click at world coordinates with calibration failed: ${stdout || stderr}`));
          }
        });

        proc.on('error', (err) => {
          this.logger.error('Python process error', { error: err.message });
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Click the blue base on minimap
   */
  async clickBlueBase(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const proc = spawn('python', [this.pythonScript, 'click-base', 'blue'], {
          stdio: 'pipe',
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        proc.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        proc.on('close', (code) => {
          if (code === 0) {
            this.logger.info('🎯 Blue base clicked');
            resolve();
          } else {
            this.logger.error('Blue base click failed', { code });
            reject(new Error(`Blue base click failed: ${stderr}`));
          }
        });

        proc.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get screen resolution for coordinate calculations
   */
  getScreenResolution(): { width: number; height: number } {
    // This would need to be implemented with proper detection
    // For now return standard values
    return { width: 1920, height: 1080 };
  }
}
