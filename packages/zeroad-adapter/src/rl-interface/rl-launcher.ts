/**
 * RL Interface Launcher
 *
 * Launches 0 A.D. with RL Interface enabled
 * Minimal launcher - only handles process spawning and HTTP connectivity
 */

import { spawn, ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Logger } from '../config/logger.js';
import { RLHTTPClient } from './http-client.js';
import { RLInterfaceConfig, DEFAULT_RL_CONFIG } from './config.js';

export class RLInterfaceLauncher {
  private gameProcess: ChildProcess | null = null;
  private httpClient: RLHTTPClient | null = null;
  private config: RLInterfaceConfig;

  constructor(
    private logger: Logger,
    configOverrides?: Partial<RLInterfaceConfig>
  ) {
    this.config = { ...DEFAULT_RL_CONFIG, ...configOverrides };
  }

  /**
   * Launch 0 A.D. with RL Interface
   *
   * Steps:
   * 1. Find 0 A.D. executable
   * 2. Spawn process with --rl-interface flag
   * 3. Wait for startup grace period
   * 4. Attempt HTTP connection
   * 5. Call /reset to initialize game
   */
  async launch(): Promise<void> {
    try {
      this.logger.info('Launching 0 A.D. with RL Interface', {
        port: this.config.rlInterfacePort,
        host: this.config.rlInterfaceHost,
      });

      // Find executable
      const executablePath = this.config.gameExecutablePath || this.findZeroADExecutable();
      this.logger.info('Found 0 A.D. executable', { path: executablePath });

      // Spawn process
      const args = [
        `--rl-interface=${this.config.rlInterfaceHost}:${this.config.rlInterfacePort}`,
        `--mod=${this.config.modPath || 'public'}`,
        '--autostart-nonvisual',  // Start without waiting for menu
      ];

      this.logger.info('Spawning process', { executable: executablePath, args });

      this.gameProcess = spawn(executablePath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false,
      });

      if (!this.gameProcess.pid) {
        throw new Error('Failed to spawn 0 A.D. process');
      }

      this.logger.info('Process spawned', { pid: this.gameProcess.pid });

      // Monitor process output
      if (this.gameProcess.stdout) {
        this.gameProcess.stdout.on('data', (data) => {
          const output = data.toString().trim();
          if (output.includes('RL') || output.includes('Interface') || output.includes('Network')) {
            this.logger.debug('[0 A.D.] ' + output);
          }
        });
      }

      if (this.gameProcess.stderr) {
        this.gameProcess.stderr.on('data', (data) => {
          const output = data.toString().trim();
          this.logger.warn('[0 A.D. stderr] ' + output);
        });
      }

      // Wait for startup grace period
      this.logger.info('Waiting for startup grace period', { ms: this.config.startupGrace });
      await this.sleep(this.config.startupGrace);

      // Create HTTP client and attempt connection
      this.httpClient = new RLHTTPClient(
        this.config.rlInterfaceHost,
        this.config.rlInterfacePort,
        this.config.connectionTimeout,
        this.logger
      );

      // Wait for HTTP connection with retries
      const connected = await this.waitForConnection();
      if (!connected) {
        throw new Error('Failed to connect to RL Interface HTTP endpoint');
      }

      this.logger.info('Connected to RL Interface', {
        url: `http://${this.config.rlInterfaceHost}:${this.config.rlInterfacePort}`,
      });

      // Initialize game
      const initialState = await this.httpClient.reset();
      this.logger.info('Game initialized', {
        tick: initialState.tick,
        players: initialState.players?.length,
        entities: initialState.entities?.length,
      });
    } catch (error) {
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Get HTTP client for issuing commands
   */
  getHTTPClient(): RLHTTPClient {
    if (!this.httpClient) {
      throw new Error('HTTP client not initialized - call launch() first');
    }
    return this.httpClient;
  }

  /**
   * Gracefully shutdown game process
   */
  async shutdown(): Promise<void> {
    if (!this.gameProcess) {
      return;
    }

    this.logger.info('Shutting down 0 A.D. process', { pid: this.gameProcess.pid });

    try {
      // Try SIGTERM first
      this.gameProcess.kill('SIGTERM');

      // Wait for process to exit
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill after timeout
          if (this.gameProcess && !this.gameProcess.killed) {
            this.logger.warn('Process did not exit gracefully, force killing', { pid: this.gameProcess.pid });
            this.gameProcess.kill('SIGKILL');
          }
          resolve();
        }, this.config.launchTimeout);

        this.gameProcess!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      this.logger.info('Process shutdown complete');
      this.gameProcess = null;
    } catch (error) {
      this.logger.error('Error during shutdown', { error: String(error) });
    }
  }

  /**
   * Find 0 A.D. executable (Windows/Mac/Linux)
   */
  private findZeroADExecutable(): string {
    const candidates = [
      // Windows
      'C:\\Program Files\\0 A.D.\\pyrogenesis.exe',
      'C:\\Program Files (x86)\\0 A.D.\\pyrogenesis.exe',
      join(homedir(), 'AppData\\Local\\0 A.D. Empires Ascendant\\binaries\\system\\pyrogenesis.exe'),
      join(homedir(), 'AppData\\Roaming\\0 A.D.\\pyrogenesis.exe'),

      // macOS
      '/Applications/0 A.D.app/Contents/MacOS/pyrogenesis',

      // Linux
      '/usr/games/0ad',
      '/usr/bin/0ad',
      '/usr/local/games/0ad',
      '/snap/bin/0ad',
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error('0 A.D. executable not found. Tried: ' + candidates.join(', '));
  }

  /**
   * Wait for HTTP connection with retries
   */
  private async waitForConnection(): Promise<boolean> {
    const maxAttempts = 10;
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        if (await this.httpClient!.isReachable()) {
          return true;
        }
      } catch {
        // Connection attempt failed, will retry
      }

      attempt++;
      if (attempt < maxAttempts) {
        this.logger.debug('Connection attempt failed, retrying', { attempt, maxAttempts });
        await this.sleep(1000);  // Wait 1 second before retrying
      }
    }

    return false;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
