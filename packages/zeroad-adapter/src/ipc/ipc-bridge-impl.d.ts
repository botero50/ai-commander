import { IPCBridge } from '../types/ipc-bridge.js';
import { Logger } from '../config/logger.js';
export interface IPCBridgeConfig {
    host: string;
    port: number;
    connectTimeout: number;
}
export declare class IPCBridgeImpl implements IPCBridge {
    private connection;
    private heartbeatInterval;
    private heartbeatTimeout;
    private logger;
    constructor(config: IPCBridgeConfig, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
    sendMessage(message: object): Promise<void>;
    onMessage(handler: (message: object) => void): void;
    heartbeat(): Promise<boolean>;
    private startHeartbeat;
    private stopHeartbeat;
}
//# sourceMappingURL=ipc-bridge-impl.d.ts.map