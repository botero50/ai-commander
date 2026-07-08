import { EventEmitter } from 'events';
import type { IPCBridgeOptions, IPCBridge, IPCMessage } from '../types/ipc-bridge.js';

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (err: Error) => void;
  timeout: NodeJS.Timeout;
}

export class IPCBridgeImpl extends EventEmitter implements IPCBridge {
  private readonly options: IPCBridgeOptions;
  private connected = false;
  private messageCounter = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private messageHandlers = new Set<(message: IPCMessage) => void>();

  constructor(options: IPCBridgeOptions) {
    super();
    this.options = options;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Failed to connect to IPC bridge within ${this.options.connectTimeout}ms`));
      }, this.options.connectTimeout);

      try {
        // Simulate connection (in real implementation, would connect to TCP/IPC socket)
        this.connected = true;
        clearTimeout(timeout);
        resolve();
      } catch (err) {
        clearTimeout(timeout);
        reject(err);
      }
    });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.pendingRequests.clear();
    this.messageHandlers.clear();
    this.removeAllListeners();
  }

  async send(message: IPCMessage): Promise<void> {
    if (!this.connected) {
      throw new Error('IPC bridge not connected');
    }

    // In real implementation, would send over socket
    // For now, just emit locally
    this.emit('message', message);
  }

  onMessage(callback: (message: IPCMessage) => void): () => void {
    this.messageHandlers.add(callback);
    this.on('message', callback);

    return () => {
      this.messageHandlers.delete(callback);
      this.off('message', callback);
    };
  }

  async request<T = unknown>(message: IPCMessage, timeoutMs: number = 5000): Promise<T> {
    if (!this.connected) {
      throw new Error('IPC bridge not connected');
    }

    const messageId = this.messageCounter++;
    const messageWithId = { ...message, id: messageId };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`IPC request timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(messageId, {
        resolve: (value) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(messageId);
          resolve(value as T);
        },
        reject: (err) => {
          clearTimeout(timeout);
          this.pendingRequests.delete(messageId);
          reject(err);
        },
        timeout,
      });

      this.send(messageWithId as IPCMessage).catch((err) => {
        this.pendingRequests.delete(messageId);
        reject(err);
      });
    });
  }

  // Internal method to resolve pending requests
  resolveRequest(messageId: number, response: unknown): void {
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      pending.resolve(response);
    }
  }

  // Internal method to reject pending requests
  rejectRequest(messageId: number, error: Error): void {
    const pending = this.pendingRequests.get(messageId);
    if (pending) {
      pending.reject(error);
    }
  }
}
