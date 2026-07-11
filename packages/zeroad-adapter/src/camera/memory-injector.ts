/**
 * Memory Injector for Camera Control
 *
 * Uses camera-injector.exe (C++ helper) to directly modify camera position
 * in 0 A.D. process memory, bypassing RL Interface limitations.
 *
 * This approach works like CheatEngine but automated.
 */

import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../config/logger.js';

const execAsync = promisify(exec);

export interface MemoryInjectorConfig {
  injectorPath?: string;  // Path to camera-injector.exe
  enableVerbose?: boolean;
}

export class CameraMemoryInjector {
  private injectorPath: string;
  private isAvailable = false;
  private verbose: boolean;

  constructor(private logger: Logger, config: MemoryInjectorConfig = {}) {
    this.injectorPath = config.injectorPath || 'camera-injector.exe';
    this.verbose = config.enableVerbose || false;
  }

  /**
   * Check if injector is available
   */
  async checkAvailable(): Promise<boolean> {
    try {
      const result = execSync(`${this.injectorPath} --help`, { encoding: 'utf8' });
      this.isAvailable = true;
      this.logger.info('✓ Camera memory injector available');
      return true;
    } catch (error) {
      this.logger.warn('Camera memory injector not available', {
        error: (error as Error).message,
        path: this.injectorPath
      });
      return false;
    }
  }

  /**
   * Find pyrogenesis process ID
   */
  async findGameProcessId(): Promise<number | null> {
    try {
      // Windows: Use tasklist command
      const result = execSync('tasklist /FI "IMAGENAME eq pyrogenesis.exe" /FO CSV', {
        encoding: 'utf8'
      });

      // Parse CSV output: "Image Name","PID"
      const lines = result.split('\n').filter(line => line.trim() && !line.includes('Image Name'));
      if (lines.length === 0) {
        this.logger.warn('No pyrogenesis process found');
        return null;
      }

      // Extract PID from CSV line
      const csvLine = lines[0];
      const match = csvLine.match(/"pyrogenesis.exe","(\d+)"/);
      if (match && match[1]) {
        const pid = parseInt(match[1], 10);
        this.logger.debug('Found pyrogenesis process', { pid });
        return pid;
      }

      return null;
    } catch (error) {
      this.logger.warn('Could not find game process', {
        error: (error as Error).message
      });
      return null;
    }
  }

  /**
   * Inject camera position into game memory
   *
   * This directly modifies the camera struct in pyrogenesis.exe memory,
   * causing the camera to move without going through RL Interface.
   */
  async setPosition(x: number, z: number, zoom?: number): Promise<boolean> {
    if (!this.isAvailable) {
      this.logger.warn('Memory injector not available');
      return false;
    }

    try {
      const pid = await this.findGameProcessId();
      if (!pid) {
        this.logger.warn('Could not find game process to inject into');
        return false;
      }

      this.logger.info(`🎥 Injecting camera position into memory`, { pid, x, z, zoom });

      // Build command
      let command = `${this.injectorPath} --pid ${pid} --x ${x} --z ${z}`;
      if (zoom !== undefined && zoom > 0) {
        command += ` --zoom ${zoom}`;
      }
      if (this.verbose) {
        command += ' --verbose';
      }

      // Execute injector
      const { stdout, stderr } = await execAsync(command);

      if (stdout) {
        this.logger.debug('Injector output', { stdout });
      }

      if (stderr) {
        this.logger.warn('Injector stderr', { stderr });
        return false;
      }

      this.logger.info('✓ Camera position injected successfully', { x, z });
      return true;
    } catch (error) {
      this.logger.error('Memory injection failed', {
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Pan camera to position (smooth interpolation)
   */
  async pan(x: number, z: number, duration: number = 1000): Promise<boolean> {
    // For now, just set position immediately
    // Future: could implement smooth panning by injecting position multiple times
    this.logger.info(`🎥 Pan camera to (${x.toFixed(1)}, ${z.toFixed(1)}) over ${duration}ms`);
    return this.setPosition(x, z);
  }

  /**
   * Get injector status
   */
  getStatus(): {
    available: boolean;
    path: string;
    verbose: boolean;
  } {
    return {
      available: this.isAvailable,
      path: this.injectorPath,
      verbose: this.verbose
    };
  }
}
