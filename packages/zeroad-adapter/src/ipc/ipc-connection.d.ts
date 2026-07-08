import { Logger } from '../config/logger.js';
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
export declare class IPCConnection {
    private socket;
    private isConnected;
    private messageHandlers;
    private pendingRequests;
    private logger;
    private host;
    private port;
    private connectTimeout;
    constructor(host: string, port: number, connectTimeout: number, logger: Logger);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    sendRequest(command: string, data?: unknown): Promise<IPCMessage>;
    sendNotification(command: string, data?: unknown): Promise<void>;
    onMessage(handler: (msg: IPCMessage) => void): void;
    private sendMessage;
    private handleData;
    private handleMessage;
    private handleError;
    private cleanup;
    private generateMessageId;
}
//# sourceMappingURL=ipc-connection.d.ts.map