/**
 * STORY 33.2: WebSocket Broadcast Hub
 *
 * Manages WebSocket connections and distributes events.
 *
 * Responsibilities:
 * - Accept WebSocket client connections
 * - Manage client lifecycle
 * - Broadcast events to all connected clients
 * - Handle disconnection and reconnection
 * - Track connection metrics
 */

import type { TournamentStreamEvent } from './stream-coordinator.ts';

export interface ClientConnection {
  readonly id: string;
  readonly connectedTime: number;
  isConnected: boolean;
}

export interface HubMetrics {
  readonly currentConnections: number;
  readonly peakConnections: number;
  readonly totalConnections: number;
  readonly avgLatency: number;
  readonly uptime: number;
}

export class WebSocketHub {
  private clients = new Map<string, ClientConnection>();
  private eventHandlers = new Map<string, (event: TournamentStreamEvent) => void>();
  private peakConnections = 0;
  private totalConnections = 0;
  private startTime = Date.now();
  private latencies: number[] = [];
  private nextClientId = 0;

  /**
   * Register a client connection
   */
  registerClient(id?: string): string {
    const clientId = id || `client-${this.nextClientId++}`;

    if (this.clients.has(clientId)) {
      throw new Error(`Client ${clientId} already registered`);
    }

    this.clients.set(clientId, {
      id: clientId,
      connectedTime: Date.now(),
      isConnected: true,
    });

    this.totalConnections++;
    const currentConnections = this.clients.size;
    if (currentConnections > this.peakConnections) {
      this.peakConnections = currentConnections;
    }

    return clientId;
  }

  /**
   * Unregister a client connection
   */
  unregisterClient(id: string): void {
    this.clients.delete(id);
    this.eventHandlers.delete(id);
  }

  /**
   * Set event handler for a client
   */
  setEventHandler(clientId: string, handler: (event: TournamentStreamEvent) => void): void {
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client ${clientId} not found`);
    }
    this.eventHandlers.set(clientId, handler);
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast(event: TournamentStreamEvent, measureLatency: boolean = false): void {
    const broadcastTime = measureLatency ? Date.now() : 0;

    for (const [clientId, client] of this.clients.entries()) {
      if (!client.isConnected) continue;

      const handler = this.eventHandlers.get(clientId);
      if (!handler) continue;

      try {
        handler(event);

        if (measureLatency && broadcastTime > 0) {
          const latency = Date.now() - broadcastTime;
          this.latencies.push(latency);
          // Keep only last 1000 measurements
          if (this.latencies.length > 1000) {
            this.latencies.shift();
          }
        }
      } catch (err) {
        // Don't let one client's error block others
        console.error(`Client ${clientId} error: ${err}`);
      }
    }
  }

  /**
   * Get connected client count
   */
  getConnectedCount(): number {
    return Array.from(this.clients.values()).filter((c) => c.isConnected).length;
  }

  /**
   * Get all registered client IDs
   */
  getClientIds(): readonly string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Check if client is connected
   */
  isClientConnected(id: string): boolean {
    const client = this.clients.get(id);
    return client?.isConnected ?? false;
  }

  /**
   * Mark client as disconnected
   */
  disconnectClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.isConnected = false;
    }
  }

  /**
   * Mark client as reconnected
   */
  reconnectClient(id: string): void {
    const client = this.clients.get(id);
    if (client) {
      client.isConnected = true;
    }
  }

  /**
   * Get average message latency
   */
  getAverageLatency(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return sum / this.latencies.length;
  }

  /**
   * Get hub metrics
   */
  getMetrics(): HubMetrics {
    return {
      currentConnections: this.getConnectedCount(),
      peakConnections: this.peakConnections,
      totalConnections: this.totalConnections,
      avgLatency: this.getAverageLatency(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Get session duration for a client
   */
  getClientSessionDuration(id: string): number {
    const client = this.clients.get(id);
    if (!client) return 0;
    return Date.now() - client.connectedTime;
  }

  /**
   * Clear all clients (for cleanup)
   */
  clearClients(): void {
    this.clients.clear();
    this.eventHandlers.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.latencies = [];
    this.peakConnections = this.getConnectedCount();
    this.startTime = Date.now();
  }
}

export function createWebSocketHub(): WebSocketHub {
  return new WebSocketHub();
}
