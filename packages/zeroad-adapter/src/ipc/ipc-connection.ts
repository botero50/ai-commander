import { createConnection, Socket } from 'net';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface IPCMessage {
  id: string;
  type: 'request' | 'response' | 'error' | 'notification';
  command?: string;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

export class IPCConnection {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private messageHandlers: Map<string, (msg: IPCMessage) => void> = new Map();
  private pendingRequests: Map<string, { resolve: (v: IPCMessage) => void; reject: (e: Error) => void; timeout: NodeJS.Timeout }> = new Map();
  private logger: Logger;
  private host: string;
  private port: number;
  private connectTimeout: number;

  constructor(host: string, port: number, connectTimeout: number, logger: Logger) {
    this.host = host;
    this.port = port;
    this.connectTimeout = connectTimeout;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      this.logger.warn('Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(
          new ZeroADAdapterError(
            ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
            `Failed to connect to IPC server at ${this.host}:${this.port} within ${this.connectTimeout}ms`
          )
        );
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
      } catch (err) {
        clearTimeout(timeout);
        reject(
          new ZeroADAdapterError(
            ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
            `Failed to create IPC connection: ${err instanceof Error ? err.message : String(err)}`,
            err
          )
        );
      }
    });
  }

  async disconnect(): Promise<void> {
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
      } else {
        resolve();
      }
    });
  }

  async sendRequest(command: string, data?: unknown): Promise<IPCMessage> {
    if (!this.isConnected || !this.socket) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
        'IPC not connected'
      );
    }

    const messageId = this.generateMessageId();
    const message: IPCMessage = {
      id: messageId,
      type: 'request',
      command,
      data,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(
          new ZeroADAdapterError(
            ZeroADAdapterErrorCode.TIMEOUT,
            `IPC request timeout after ${this.connectTimeout}ms: ${command}`
          )
        );
      }, this.connectTimeout);

      this.pendingRequests.set(messageId, { resolve, reject, timeout });
      this.sendMessage(message);
    });
  }

  async sendNotification(command: string, data?: unknown): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
        'IPC not connected'
      );
    }

    const message: IPCMessage = {
      id: this.generateMessageId(),
      type: 'notification',
      command,
      data,
    };

    this.sendMessage(message);
  }

  onMessage(handler: (msg: IPCMessage) => void): void {
    const id = this.generateMessageId();
    this.messageHandlers.set(id, handler);
  }

  private sendMessage(message: IPCMessage): void {
    if (!this.socket) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
        'Socket not available'
      );
    }

    const json = JSON.stringify(message) + '\n';
    this.socket.write(json, (err) => {
      if (err) {
        this.logger.error('Failed to write message', err);
      }
    });
  }

  private handleData(chunk: Buffer): void {
    const lines = chunk.toString().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as IPCMessage;
        this.handleMessage(message);
      } catch (err) {
        this.logger.error('Failed to parse IPC message', err);
      }
    }
  }

  private handleMessage(message: IPCMessage): void {
    // Handle responses to pending requests
    if (message.type === 'response' || message.type === 'error') {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if (message.type === 'error' && message.error) {
          pending.reject(
            new ZeroADAdapterError(
              ZeroADAdapterErrorCode.UNKNOWN,
              `IPC error: ${message.error.message}`
            )
          );
        } else {
          pending.resolve(message);
        }
      }
    }

    // Notify registered handlers
    for (const handler of this.messageHandlers.values()) {
      handler(message);
    }
  }

  private handleError(err: Error): void {
    this.logger.error('IPC connection error', err);
    this.isConnected = false;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(err);
      this.pendingRequests.delete(id);
    }
  }

  private cleanup(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers.clear();
    this.pendingRequests.clear();
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
