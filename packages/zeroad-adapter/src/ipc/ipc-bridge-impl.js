import { IPCConnection } from './ipc-connection.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';
export class IPCBridgeImpl {
    connection;
    heartbeatInterval = null;
    heartbeatTimeout = 5000;
    logger;
    constructor(config, logger) {
        this.logger = logger;
        this.connection = new IPCConnection(config.host, config.port, config.connectTimeout, logger);
    }
    async connect() {
        this.logger.info('Connecting IPC bridge');
        await this.connection.connect();
        this.startHeartbeat();
    }
    async disconnect() {
        this.logger.info('Disconnecting IPC bridge');
        this.stopHeartbeat();
        await this.connection.disconnect();
    }
    isConnected() {
        return this.connection['isConnected'];
    }
    async sendMessage(message) {
        if (!this.isConnected()) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'IPC bridge not connected');
        }
        const cmd = message.command || 'unknown';
        await this.connection.sendNotification(cmd, message);
    }
    async sendRequest(type, data) {
        if (!this.isConnected()) {
            throw new ZeroADAdapterError(ZeroADAdapterErrorCode.IPC_CONNECTION_FAILED, 'IPC bridge not connected');
        }
        try {
            const response = await this.connection.sendRequest(type, data);
            return response;
        }
        catch (err) {
            this.logger.error('Request failed', err);
            throw err;
        }
    }
    onMessage(handler) {
        this.connection.onMessage((msg) => {
            if (msg.type === 'notification' || msg.type === 'response') {
                handler((msg.data || msg));
            }
        });
    }
    async heartbeat() {
        if (!this.isConnected()) {
            return false;
        }
        try {
            await this.connection.sendRequest('heartbeat');
            return true;
        }
        catch (err) {
            this.logger.warn('Heartbeat failed', err);
            return false;
        }
    }
    startHeartbeat() {
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
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
}
//# sourceMappingURL=ipc-bridge-impl.js.map