/**
 * Broadcast Server
 * HTTP/WebSocket server for live broadcasting and real-time synchronization
 *
 * TODO: state-types.js module needs to be extracted/created
 */
interface GameState {
    tick: number;
    [key: string]: any;
}
export interface ClientConnection {
    clientId: string;
    role: 'viewer' | 'caster' | 'admin';
    connectedAt: number;
    lastHeartbeat: number;
    isConnected: boolean;
    messageQueue: BroadcastMessage[];
}
export interface BroadcastMessage {
    messageId: string;
    type: 'state_update' | 'event' | 'chat' | 'control' | 'heartbeat';
    timestamp: number;
    payload: any;
    recipientId?: string;
    broadcast: boolean;
}
export interface ServerConfig {
    port: number;
    maxConnections: number;
    heartbeatInterval: number;
    messageBufferSize: number;
    enableCompression: boolean;
    enableEncryption: boolean;
}
export interface ConnectionStats {
    connectedClients: number;
    messagesPerSecond: number;
    averageLatency: number;
    uptime: number;
    bytesTransmitted: number;
    bytesReceived: number;
}
/**
 * Broadcast server managing connections and message delivery
 */
export declare class BroadcastServer {
    private clients;
    private messageLog;
    private config;
    private isRunning;
    private startTime;
    private messageStats;
    private bytesStats;
    constructor(config?: Partial<ServerConfig>);
    /**
     * Start the server
     */
    start(): void;
    /**
     * Stop the server
     */
    stop(): void;
    /**
     * Register client connection
     */
    registerClient(clientId: string, role?: 'viewer' | 'caster' | 'admin'): ClientConnection;
    /**
     * Disconnect client
     */
    disconnectClient(clientId: string): void;
    /**
     * Broadcast state update to all clients
     */
    broadcastStateUpdate(gameState: GameState, tick: number): BroadcastMessage;
    /**
     * Broadcast event to all clients
     */
    broadcastEvent(eventType: string, eventData: any, severity?: number): BroadcastMessage;
    /**
     * Broadcast generic message to all clients
     */
    broadcastMessage(message: Partial<BroadcastMessage>): BroadcastMessage;
    /**
     * Send targeted message to specific client
     */
    sendToClient(clientId: string, messageType: string, payload: any): BroadcastMessage;
    /**
     * Receive message from client
     */
    receiveMessage(clientId: string, message: any): void;
    /**
     * Queue message for delivery
     */
    private queueMessage;
    /**
     * Deliver message to client
     */
    private deliverMessage;
    /**
     * Broadcast chat message from client
     */
    private broadcastChatMessage;
    /**
     * Get messages for client
     */
    getClientMessages(clientId: string, maxMessages?: number): BroadcastMessage[];
    /**
     * Update client heartbeat
     */
    heartbeat(clientId: string): void;
    /**
     * Start heartbeat monitoring loop
     */
    private startHeartbeatLoop;
    /**
     * Get connection status
     */
    getClientStatus(clientId: string): ClientConnection | null;
    /**
     * Get all connected clients
     */
    getConnectedClients(): ClientConnection[];
    /**
     * Get server statistics
     */
    getStatistics(): ConnectionStats;
    /**
     * Calculate average latency across clients
     */
    private calculateAverageLatency;
    /**
     * Get message history
     */
    getMessageHistory(limit?: number): BroadcastMessage[];
    /**
     * Clear message log
     */
    clearMessageLog(): void;
    /**
     * Get message queue size for client
     */
    getQueueSize(clientId: string): number;
    /**
     * Reset statistics
     */
    resetStatistics(): void;
    /**
     * Check if server is running
     */
    isServerRunning(): boolean;
    /**
     * Get configuration
     */
    getConfig(): ServerConfig;
}
export {};
//# sourceMappingURL=broadcast-server.d.ts.map