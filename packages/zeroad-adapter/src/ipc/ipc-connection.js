import { createConnection } from 'net';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
export class IPCConnection {
    socket = null;
    isConnected = false;
    messageHandlers = new Map();
    pendingRequests = new Map();
    logger;
    host;
    port;
    connectTimeout;
    constructor(host, port, connectTimeout, logger) {
        this.host = host;
        this.port = port;
        this.connectTimeout = connectTimeout;
        this.logger = logger;
    }
    async connect() {
        if (this.isConnected) {
            this.logger.warn('Already connected');
            return;
        }
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.cleanup();
                reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, `Failed to connect to IPC server at ${this.host}:${this.port} within ${this.connectTimeout}ms`));
            }, this.connectTimeout);
            try {
                this.socket = createConnection({ host: this.host, port: this.port });
                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.logger.info('IPC connected', { host: this.host, port: this.port });
                    resolve();
                });
                this.socket.on('data', (chunk) => {
                    this.handleData(chunk);
                });
                this.socket.on('error', (err) => {
                    clearTimeout(timeout);
                    this.handleError(err);
                    reject(err);
                });
                this.socket.on('close', () => {
                    this.isConnected = false;
                    this.logger.warn('IPC connection closed');
                });
            }
            catch (err) {
                clearTimeout(timeout);
                reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, `Failed to create IPC connection: ${err instanceof Error ? err.message : String(err)}`, err));
            }
        });
    }
    async disconnect() {
        if (!this.isConnected) {
            return;
        }
        this.logger.info('Disconnecting IPC');
        return new Promise((resolve) => {
            if (this.socket) {
                this.socket.once('close', () => {
                    this.cleanup();
                    resolve();
                });
                this.socket.destroy();
            }
            else {
                resolve();
            }
        });
    }
    async sendRequest(command, data) {
        if (!this.isConnected || !this.socket) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'IPC not connected');
        }
        const messageId = this.generateMessageId();
        const message = {
            id: messageId,
            type: 'request',
            command,
            data,
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(messageId);
                reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.TIMEOUT, `IPC request timeout after ${this.connectTimeout}ms: ${command}`));
            }, this.connectTimeout);
            this.pendingRequests.set(messageId, { resolve, reject, timeout });
            this.sendMessage(message);
        });
    }
    async sendNotification(command, data) {
        if (!this.isConnected || !this.socket) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'IPC not connected');
        }
        const message = {
            id: this.generateMessageId(),
            type: 'notification',
            command,
            data,
        };
        this.sendMessage(message);
    }
    onMessage(handler) {
        const id = this.generateMessageId();
        this.messageHandlers.set(id, handler);
    }
    sendMessage(message) {
        if (!this.socket) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'Socket not available');
        }
        const json = JSON.stringify(message) + '\n';
        this.socket.write(json, (err) => {
            if (err) {
                this.logger.error('Failed to write message', err);
            }
        });
    }
    handleData(chunk) {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
            if (!line.trim())
                continue;
            try {
                const message = JSON.parse(line);
                this.handleMessage(message);
            }
            catch (err) {
                this.logger.error('Failed to parse IPC message', err);
            }
        }
    }
    handleMessage(message) {
        // Handle responses to pending requests
        if (message.type === 'response' || message.type === 'error') {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(message.id);
                if (message.type === 'error' && message.error) {
                    pending.reject(new ZeroADAdapterError(ZeroADAdapterErrorCode.UNKNOWN, `IPC error: ${message.error.message}`));
                }
                else {
                    pending.resolve(message);
                }
            }
        }
        // Notify registered handlers
        for (const handler of this.messageHandlers.values()) {
            handler(message);
        }
    }
    handleError(err) {
        this.logger.error('IPC connection error', err);
        this.isConnected = false;
        // Reject all pending requests
        for (const [id, pending] of this.pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(err);
            this.pendingRequests.delete(id);
        }
    }
    cleanup() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.destroy();
        }
        this.socket = null;
        this.isConnected = false;
        this.messageHandlers.clear();
        this.pendingRequests.clear();
    }
    generateMessageId() {
        return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
//# sourceMappingURL=ipc-connection.js.map