import { spawn, ChildProcess } from 'child_process';
import { Logger } from '../config/logger.js';
import { GameProcess } from '../types/game-process.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface GameProcessConfig {
  executablePath: string;
  launchTimeout: number;
  shutdownTimeout: number;
}

export class GameProcessManager implements GameProcess {
  pid: number = -1;
  isRunning: boolean = false;

  private process: ChildProcess | null = null;
  private logger: Logger;
  private config: GameProcessConfig;

  constructor(config: GameProcessConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Process already running', { pid: this.pid });
      return;
    }

    this.logger.info('Starting game process', { executable: this.config.executablePath });

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(
          new ZeroADAdapterError(
            ZeroADAdapterErrorCode.LAUNCH_FAILED,
            `Game process failed to launch within ${this.config.launchTimeout}ms`
          )
        );
      }, this.config.launchTimeout);

      try {
        this.process = spawn(this.config.executablePath, ['-editor'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false,
        });

        if (!this.process.pid) {
          throw new Error('Process spawned but no PID assigned');
        }

        this.pid = this.process.pid;
        this.isRunning = true;

        this.logger.info('Game process started', { pid: this.pid });

        this.process.on('exit', (code, signal) => {
          this.handleProcessExit(code, signal);
        });

        this.process.on('error', (err) => {
          this.handleProcessError(err);
        });

        clearTimeout(timeout);
        resolve();
      } catch (err) {
        clearTimeout(timeout);
        this.cleanup();
        reject(
          new ZeroADAdapterError(
            ZeroADAdapterErrorCode.LAUNCH_FAILED,
            `Failed to spawn game process: ${err instanceof Error ? err.message : String(err)}`,
            err
          )
        );
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      this.logger.debug('Process not running, skipping stop');
      return;
    }

    this.logger.info('Stopping game process', { pid: this.pid });

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn('Process did not stop gracefully, killing', { pid: this.pid });
        this.process?.kill('SIGKILL');
        this.cleanup();
        resolve();
      }, this.config.shutdownTimeout);

      this.process!.on('exit', () => {
        clearTimeout(timeout);
        this.cleanup();
        resolve();
      });

      this.process!.kill('SIGTERM');
    });
  }

  async restart(): Promise<void> {
    this.logger.info('Restarting game process', { pid: this.pid });
    await this.stop();
    await this.start();
  }

  async health(): Promise<boolean> {
    if (!this.isRunning) {
      return false;
    }

    if (!this.process) {
      this.logger.warn('Process marked as running but no ChildProcess object');
      this.isRunning = false;
      return false;
    }

    // Check if process is still alive by testing if we can get its exit code
    // If exitCode is not null, process has exited
    const hasExited = this.process.exitCode !== null || this.process.signalCode !== null;

    if (hasExited) {
      this.isRunning = false;
      this.pid = -1;
      return false;
    }

    return true;
  }

  private handleProcessExit(code: number | null, signal: string | null): void {
    this.logger.warn('Game process exited', { pid: this.pid, code, signal });
    this.isRunning = false;
    this.pid = -1;
    this.process = null;
  }

  private handleProcessError(err: Error): void {
    this.logger.error('Game process error', err);
    this.isRunning = false;
    this.pid = -1;
  }

  private cleanup(): void {
    if (this.process) {
      this.process.removeAllListeners();
      if (!this.process.killed) {
        this.process.kill('SIGKILL');
      }
    }
    this.process = null;
    this.isRunning = false;
    this.pid = -1;
  }
}
