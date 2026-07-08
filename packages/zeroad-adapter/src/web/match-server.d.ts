/**
 * Match Server
 *
 * Express.js server for real-time match streaming via WebSocket.
 * - HTTP API for match management
 * - WebSocket for real-time event streaming
 * - Match viewer integration
 * - Connection management
 */
import type { MatchViewerManager } from './match-viewer.js';
/**
 * WebSocket client connection to a match viewer
 */
export interface MatchClient {
    readonly clientId: string;
    readonly matchId: string;
    send(data: string | Buffer): void;
    close(): void;
}
/**
 * Match server configuration
 */
export interface MatchServerConfig {
    readonly port: number;
    readonly host?: string;
    readonly enableLogging?: boolean;
}
/**
 * Match server for WebSocket connections
 * (Framework-agnostic; can be integrated with Express, Fastify, etc.)
 */
export declare class MatchServer {
    private config;
    private viewerManager;
    private clients;
    private subscriptions;
    private enableLogging;
    constructor(viewerManager: MatchViewerManager, config: MatchServerConfig);
    /**
     * Register a client connection to a match
     */
    registerClient(matchId: string, client: MatchClient): void;
    /**
     * Unregister a client connection
     */
    unregisterClient(matchId: string, client: MatchClient): void;
    /**
     * Setup viewer event subscription for real-time streaming
     */
    private setupViewerSubscription;
    /**
     * Cleanup viewer event subscription
     */
    private teardownViewerSubscription;
    /**
     * Broadcast event to all clients connected to a match
     */
    private broadcastToClients;
    /**
     * Get client count for a match
     */
    getClientCount(matchId: string): number;
    /**
     * Get total client count across all matches
     */
    getTotalClientCount(): number;
    /**
     * Get list of matches with active clients
     */
    getActiveMatches(): readonly string[];
    /**
     * Check if a match has any clients
     */
    hasClients(matchId: string): boolean;
    /**
     * Disconnect all clients from a match
     */
    disconnectMatch(matchId: string): void;
    /**
     * Get server configuration
     */
    getConfig(): MatchServerConfig;
}
//# sourceMappingURL=match-server.d.ts.map