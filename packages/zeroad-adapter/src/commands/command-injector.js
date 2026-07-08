import { CommandConverter } from './command-converter.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
export class CommandInjector {
    constructor(ipcBridge, config = {}, logger) {
        this.commandHistory = new Map();
        this.totalCommands = 0;
        this.successfulCommands = 0;
        this.failedCommands = 0;
        this.ipcBridge = ipcBridge;
        this.logger = logger;
        this.converter = new CommandConverter(logger);
        this.config = {
            maxRetries: config.maxRetries || 3,
            retryDelayMs: config.retryDelayMs || 100,
        };
    }
    async inject(command) {
        const startTime = Date.now();
        this.totalCommands++;
        try {
            if (!this.ipcBridge.isConnected()) {
                throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'IPC bridge not connected');
            }
            // Convert command to 0 A.D. format
            const rawCommand = this.converter.convert(command);
            // Create IPC message
            const message = {
                command: 'inject_command',
                data: {
                    ...rawCommand,
                    playerId: command.playerId,
                },
            };
            // Send with retries
            let lastError = null;
            for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
                try {
                    await this.ipcBridge.sendMessage(message);
                    const latency = Date.now() - startTime;
                    const result = {
                        commandId: command.id,
                        success: true,
                        latencyMs: latency,
                    };
                    this.commandHistory.set(command.id, result);
                    this.successfulCommands++;
                    if (latency > 50) {
                        this.logger.warn('Slow command injection', {
                            commandId: command.id,
                            type: command.type,
                            latency,
                        });
                    }
                    return result;
                }
                catch (err) {
                    lastError = err;
                    if (attempt < this.config.maxRetries) {
                        this.logger.debug('Command injection retry', {
                            commandId: command.id,
                            attempt,
                            maxAttempts: this.config.maxRetries,
                            error: lastError.message,
                        });
                        await this.delay(this.config.retryDelayMs);
                    }
                }
            }
            // All retries exhausted
            const latency = Date.now() - startTime;
            const result = {
                commandId: command.id,
                success: false,
                latencyMs: latency,
                error: lastError?.message || 'Unknown error',
            };
            this.commandHistory.set(command.id, result);
            this.failedCommands++;
            this.logger.error('Command injection failed after retries', {
                commandId: command.id,
                type: command.type,
                attempts: this.config.maxRetries,
                error: result.error,
            });
            return result;
        }
        catch (err) {
            const latency = Date.now() - startTime;
            const errorMessage = err instanceof Error ? err.message : String(err);
            const result = {
                commandId: command.id,
                success: false,
                latencyMs: latency,
                error: errorMessage,
            };
            this.commandHistory.set(command.id, result);
            this.failedCommands++;
            this.logger.error('Unexpected command injection error', err);
            return result;
        }
    }
    async injectBatch(commands) {
        const startTime = Date.now();
        const results = await Promise.all(commands.map((cmd) => this.inject(cmd)));
        const latency = Date.now() - startTime;
        this.logger.info('Batch injection complete', {
            count: commands.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            latency,
        });
        return results;
    }
    getCommandResult(commandId) {
        return this.commandHistory.get(commandId);
    }
    getMetrics() {
        const successRate = this.totalCommands > 0 ? (this.successfulCommands / this.totalCommands) * 100 : 0;
        return {
            totalCommands: this.totalCommands,
            successfulCommands: this.successfulCommands,
            failedCommands: this.failedCommands,
            successRate: successRate.toFixed(1),
        };
    }
    clearHistory() {
        this.commandHistory.clear();
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
//# sourceMappingURL=command-injector.js.map