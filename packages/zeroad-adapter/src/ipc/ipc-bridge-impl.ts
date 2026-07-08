import { IPCBridge } from '../types/ipc-bridge.js';
import { IPCConnection, IPCMessage } from './ipc-connection.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface IPCBridgeConfig {
  host: string;
  port: number;
  connectTimeout: number;
}

export class IPCBridgeImpl implements IPCBridge {
  private connection: IPCConnection;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private heartbeatTimeout: number = 5000;
  private logger: Logger;

  constructor(config: IPCBridgeConfig, logger: Logger) {
    this.logger = logger;
    this.connection = new IPCConnection(config.host, config.port, config.connectTimeout, logger);
  }

  async connect(): Promise<void> {
    this.logger.info('Connecting IPC bridge');
    await this.connection.connect();
    this.startHeartbeat();
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting IPC bridge');
    this.stopHeartbeat();
    await this.connection.disconnect();
  }

  isConnected(): boolean {
    return this.connection['isConnected'];
  }

  async sendMessage(message: object): Promise<void> {
    if (!this.isConnected()) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED,
        'IPC bridge not connected'
      );
    }

    const cmd = (message as { command?: string }).command || 'unknown';
    await this.connection.sendNotification(cmd, message);
  }

  onMessage(handler: (message: object) => void): void {
    this.connection.onMessage((msg: IPCMessage) => {
      if (msg.type === 'notification' || msg.type === 'response') {
        handler(msg.data || msg);
      }
    });
  }

  async heartbeat(): Promise<boolean> {
    if (!this.isConnected()) {
      return false;
    }

    try {
      await this.connection.sendRequest('heartbeat');
      return true;
    } catch (err) {
      this.logger.warn('Heartbeat failed', err);
      return false;
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(async () => {
      const healthy = await this.heartbeat();
      if (!healthy) {
        this.logger.warn('Heartbeat indicates unhealthy connection');
      }
    }, this.heartbeatTimeout);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}
