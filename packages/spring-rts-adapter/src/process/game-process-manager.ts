import { spawn, type ChildProcess } from 'child_process';
import type { GameProcessOptions, GameProcess } from '../types/game-process.js';

export class GameProcessManager implements GameProcess {
  private process: ChildProcess | null = null;
  private readonly options: GameProcessOptions;
  private messageCallbacks: Set<(message: string) => void> = new Set();
  private bufferedOutput = '';

  constructor(options: GameProcessOptions) {
    this.options = options;
  }

  get isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Game process already running');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.process) {
          this.process.kill();
          this.process = null;
        }
        reject(new Error(`Game process failed to start within ${this.options.launchTimeout}ms`));
      }, this.options.launchTimeout);

      try {
        this.process = spawn(this.options.executablePath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.process.stdout?.on('data', (data) => {
          this.handleOutput(data.toString());
        });

        this.process.stderr?.on('data', (data) => {
          this.handleOutput(`[ERROR] ${data.toString()}`);
        });

        this.process.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });

        this.process.on('exit', (code) => {
          this.process = null;
          this.messageCallbacks.clear();
        });

        // Wait for ready signal or timeout
        const readyCheck = setInterval(() => {
          if (this.bufferedOutput.includes('ready') || this.bufferedOutput.includes('started')) {
            clearInterval(readyCheck);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);

        // Fallback: resolve after half the timeout
        setTimeout(() => {
          if (this.isRunning) {
            clearInterval(readyCheck);
            clearTimeout(timeout);
            resolve();
          }
        }, Math.max(1000, this.options.launchTimeout / 2));
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.process) {
      return;
    }

    return new Promise((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
        this.process = null;
        this.messageCallbacks.clear();
        resolve();
      }, this.options.shutdownTimeout);

      this.process.once('exit', () => {
        clearTimeout(timeout);
        this.process = null;
        this.messageCallbacks.clear();
        resolve();
      });

      if (this.process.stdin) {
        this.process.stdin.write('quit\n');
      } else {
        this.process?.kill('SIGTERM');
      }
    });
  }

  async send(message: string): Promise<void> {
    if (!this.process || !this.process.stdin) {
      throw new Error('Game process not running');
    }

    return new Promise((resolve, reject) => {
      this.process!.stdin!.write(message + '\n', (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  onMessage(callback: (message: string) => void): void {
    this.messageCallbacks.add(callback);
  }

  getProcessId(): number | null {
    return this.process?.pid ?? null;
  }

  private handleOutput(output: string): void {
    this.bufferedOutput += output;
    // Keep buffer size manageable
    if (this.bufferedOutput.length > 10000) {
      this.bufferedOutput = this.bufferedOutput.slice(-5000);
    }

    // Parse lines and emit messages
    const lines = this.bufferedOutput.split('\n');
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        this.messageCallbacks.forEach(cb => cb(line));
      }
    }
    // Keep incomplete line in buffer
    this.bufferedOutput = lines[lines.length - 1];
  }
}
