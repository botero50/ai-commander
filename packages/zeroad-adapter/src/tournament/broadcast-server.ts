/**
 * Broadcast Server
 * HTTP/WebSocket server for live broadcasting and real-time synchronization
 */

import { GameState } from '../state/state-types.js';

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
  recipientId?: string; // for targeted messages
  broadcast: boolean; // send to all or specific client
}

export interface ServerConfig {
  port: number;
  maxConnections: number;
  heartbeatInterval: number; // ms
  messageBufferSize: number;
  enableCompression: boolean;
  enableEncryption: boolean;
}

export interface ConnectionStats {
  connectedClients: number;
  messagesPerSecond: number;
  averageLatency: number; // ms
  uptime: number; // seconds
  bytesTransmitted: number;
  bytesReceived: number;
}

/**
 * Broadcast server managing connections and message delivery
 */
export class BroadcastServer {
  private clients: Map<string, ClientConnection> = new Map();
  private messageLog: BroadcastMessage[] = [];
  private config: ServerConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private messageStats: { sent: number; received: number; dropped: number } = {
    sent: 0,
    received: 0,
    dropped: 0,
  };
  private bytesStats: { transmitted: number; received: number } = {
    transmitted: 0,
    received: 0,
  };

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = {
      port: 8080,
      maxConnections: 1000,
      heartbeatInterval: 5000,
      messageBufferSize: 10000,
      enableCompression: true,
      enableEncryption: false,
      ...config,
    };
  }

  /**
   * Start the server
   */
  start(): void {
    if (this.isRunning) {
      throw new Error('Server already running');
    }

    this.isRunning = true;
    this.startTime = Date.now();
    this.startHeartbeatLoop();
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.clients.clear();
    this.messageLog = [];
  }

  /**
   * Register client connection
   */
  registerClient(clientId: string, role: 'viewer' | 'caster' | 'admin' = 'viewer'): ClientConnection {
    if (this.clients.size >= this.config.maxConnections) {
      throw new Error('Server at maximum capacity');
    }

    const connection: ClientConnection = {
      clientId,
      role,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      isConnected: true,
      messageQueue: [],
    };

    this.clients.set(clientId, connection);
    return connection;
  }

  /**
   * Disconnect client
   */
  disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.isConnected = false;
    this.clients.delete(clientId);
  }

  /**
   * Broadcast state update to all clients
   */
  broadcastStateUpdate(gameState: GameState, tick: number): BroadcastMessage {
    const message: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: 'state_update',
      timestamp: Date.now(),
      payload: { gameState, tick },
      broadcast: true,
    };

    this.queueMessage(message);
    return message;
  }

  /**
   * Broadcast event to all clients
   */
  broadcastEvent(
    eventType: string,
    eventData: any,
    severity: number = 5
  ): BroadcastMessage {
    const message: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: 'event',
      timestamp: Date.now(),
      payload: { eventType, eventData, severity },
      broadcast: true,
    };

    this.queueMessage(message);
    return message;
  }

  /**
   * Broadcast generic message to all clients
   */
  broadcastMessage(message: Partial<BroadcastMessage>): BroadcastMessage {
    const fullMessage: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: (message.type as any) || 'event',
      timestamp: Date.now(),
      payload: message.payload || {},
      broadcast: true,
    };

    this.queueMessage(fullMessage);
    return fullMessage;
  }

  /**
   * Send targeted message to specific client
   */
  sendToClient(clientId: string, messageType: string, payload: any): BroadcastMessage {
    const message: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: messageType as any,
      timestamp: Date.now(),
      payload,
      recipientId: clientId,
      broadcast: false,
    };

    this.queueMessage(message);
    this.deliverMessage(clientId, message);
    return message;
  }

  /**
   * Receive message from client
   */
  receiveMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const broadcastMessage: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: message.type || 'chat',
      timestamp: Date.now(),
      payload: message,
      broadcast: false,
    };

    this.messageStats.received++;
    this.bytesStats.received += JSON.stringify(message).length;

    // Process message based on type
    if (message.type === 'chat' && message.broadcast) {
      // Broadcast chat to all clients
      this.broadcastChatMessage(clientId, message.content);
    }

    this.messageLog.push(broadcastMessage);
    if (this.messageLog.length > this.config.messageBufferSize) {
      this.messageLog.shift();
    }
  }

  /**
   * Queue message for delivery
   */
  private queueMessage(message: BroadcastMessage): void {
    this.messageLog.push(message);

    if (message.broadcast) {
      // Queue to all clients
      for (const [clientId, client] of this.clients) {
        if (client.isConnected) {
          client.messageQueue.push(message);
        }
      }
      this.messageStats.sent += this.clients.size;
    } else if (message.recipientId) {
      const recipient = this.clients.get(message.recipientId);
      if (recipient && recipient.isConnected) {
        recipient.messageQueue.push(message);
        this.messageStats.sent++;
      }
    }

    this.bytesStats.transmitted += JSON.stringify(message).length;

    // Trim message log if needed
    if (this.messageLog.length > this.config.messageBufferSize) {
      this.messageLog.shift();
    }
  }

  /**
   * Deliver message to client
   */
  private deliverMessage(clientId: string, message: BroadcastMessage): void {
    const client = this.clients.get(clientId);
    if (!client) {
      this.messageStats.dropped++;
      return;
    }

    client.messageQueue.push(message);
  }

  /**
   * Broadcast chat message from client
   */
  private broadcastChatMessage(senderId: string, content: string): void {
    const message: BroadcastMessage = {
      messageId: `msg_${Date.now()}_${Math.random()}`,
      type: 'chat',
      timestamp: Date.now(),
      payload: { senderId, content },
      broadcast: true,
    };

    this.queueMessage(message);
  }

  /**
   * Get messages for client
   */
  getClientMessages(clientId: string, maxMessages: number = 100): BroadcastMessage[] {
    const client = this.clients.get(clientId);
    if (!client) return [];

    const messages = client.messageQueue.splice(0, maxMessages);
    return messages;
  }

  /**
   * Update client heartbeat
   */
  heartbeat(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastHeartbeat = Date.now();
  }

  /**
   * Start heartbeat monitoring loop
   */
  private startHeartbeatLoop(): void {
    // Simulated heartbeat - in real implementation would use setInterval
    // Checking for dead connections
    const deadlineTime = Date.now() - this.config.heartbeatInterval * 3;

    for (const [clientId, client] of this.clients) {
      if (client.lastHeartbeat < deadlineTime) {
        this.disconnectClient(clientId);
      }
    }
  }

  /**
   * Get connection status
   */
  getClientStatus(clientId: string): ClientConnection | null {
    const client = this.clients.get(clientId);
    return client ? { ...client } : null;
  }

  /**
   * Get all connected clients
   */
  getConnectedClients(): ClientConnection[] {
    return Array.from(this.clients.values())
      .filter((c) => c.isConnected)
      .map((c) => ({ ...c }));
  }

  /**
   * Get server statistics
   */
  getStatistics(): ConnectionStats {
    const uptime = this.isRunning ? (Date.now() - this.startTime) / 1000 : 0;
    const connectedClients = Array.from(this.clients.values()).filter((c) => c.isConnected).length;

    // Calculate messages per second (based on last second)
    const recentMessages = this.messageLog.filter((m) => Date.now() - m.timestamp < 1000);

    return {
      connectedClients,
      messagesPerSecond: recentMessages.length,
      averageLatency: this.calculateAverageLatency(),
      uptime: Math.round(uptime),
      bytesTransmitted: this.bytesStats.transmitted,
      bytesReceived: this.bytesStats.received,
    };
  }

  /**
   * Calculate average latency across clients
   */
  private calculateAverageLatency(): number {
    const clients = Array.from(this.clients.values()).filter((c) => c.isConnected);
    if (clients.length === 0) return 0;

    const now = Date.now();
    const totalLatency = clients.reduce((sum, c) => sum + (now - c.lastHeartbeat), 0);
    return Math.round(totalLatency / clients.length);
  }

  /**
   * Get message history
   */
  getMessageHistory(limit: number = 100): BroadcastMessage[] {
    return this.messageLog.slice(-limit);
  }

  /**
   * Clear message log
   */
  clearMessageLog(): void {
    this.messageLog = [];
  }

  /**
   * Get message queue size for client
   */
  getQueueSize(clientId: string): number {
    const client = this.clients.get(clientId);
    return client ? client.messageQueue.length : 0;
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.messageStats = { sent: 0, received: 0, dropped: 0 };
    this.bytesStats = { transmitted: 0, received: 0 };
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get configuration
   */
  getConfig(): ServerConfig {
    return { ...this.config };
  }
}
