import { spawn } from 'child_process';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
export class GameProcessManager {
    pid = -1;
    isRunning = false;
    process = null;
    logger;
    config;
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }
    async start() {
        if (this.isRunning) {
            this.logger.warn('Process already running', { pid: this.pid });
            return;
        }
        this.logger.info('Starting game process', { executable: this.config.executablePath });
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.cleanup();
                reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.LAUNCH_FAILED, `Game process failed to launch within ${this.config.launchTimeout}ms`));
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
            }
            catch (err) {
                clearTimeout(timeout);
                this.cleanup();
                reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.LAUNCH_FAILED, `Failed to spawn game process: ${err instanceof Error ? err.message : String(err)}`, err));
            }
        });
    }
    async stop() {
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
            this.process.on('exit', () => {
                clearTimeout(timeout);
                this.cleanup();
                resolve();
            });
            this.process.kill('SIGTERM');
        });
    }
    async restart() {
        this.logger.info('Restarting game process', { pid: this.pid });
        await this.stop();
        await this.start();
    }
    async health() {
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
    handleProcessExit(code, signal) {
        this.logger.warn('Game process exited', { pid: this.pid, code, signal });
        this.isRunning = false;
        this.pid = -1;
        this.process = null;
    }
    handleProcessError(err) {
        this.logger.error('Game process error', err);
        this.isRunning = false;
        this.pid = -1;
    }
    cleanup() {
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
//# sourceMappingURL=game-process-manager.js.map