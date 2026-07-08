/**
 * Match Server
 *
 * Express.js server for real-time match streaming via WebSocket.
 * - HTTP API for match management
 * - WebSocket for real-time event streaming
 * - Match viewer integration
 * - Connection management
 */
/**
 * Match server for WebSocket connections
 * (Framework-agnostic; can be integrated with Express, Fastify, etc.)
 */
export class MatchServer {
    config;
    viewerManager;
    clients = new Map(); // matchId -> clients
    subscriptions = new Map(); // matchId -> unsubscribe function
    enableLogging;
    constructor(viewerManager, config) {
        this.viewerManager = viewerManager;
        this.config = config;
        this.enableLogging = config.enableLogging ?? false;
    }
    /**
     * Register a client connection to a match
     */
    registerClient(matchId, client) {
        if (!this.clients.has(matchId)) {
            this.clients.set(matchId, new Set());
            this.setupViewerSubscription(matchId);
        }
        const clients = this.clients.get(matchId);
        clients.add(client);
        if (this.enableLogging) {
            console.log(`Client ${client.clientId} connected to match ${matchId}`);
        }
        // Send initial state
        const viewer = this.viewerManager.getViewer(matchId);
        if (viewer) {
            const state = viewer.getState();
            client.send(JSON.stringify({
                type: 'initial_state',
                timestamp: Date.now(),
                data: state,
            }));
        }
    }
    /**
     * Unregister a client connection
     */
    unregisterClient(matchId, client) {
        const clients = this.clients.get(matchId);
        if (clients) {
            clients.delete(client);
            if (this.enableLogging) {
                console.log(`Client ${client.clientId} disconnected from match ${matchId}`);
            }
            // Clean up if no more clients
            if (clients.size === 0) {
                this.clients.delete(matchId);
                this.teardownViewerSubscription(matchId);
            }
        }
    }
    /**
     * Setup viewer event subscription for real-time streaming
     */
    setupViewerSubscription(matchId) {
        const viewer = this.viewerManager.getViewer(matchId);
        if (!viewer) {
            return;
        }
        const unsubscribe = viewer.subscribe((event) => {
            this.broadcastToClients(matchId, event);
        });
        this.subscriptions.set(matchId, unsubscribe);
    }
    /**
     * Cleanup viewer event subscription
     */
    teardownViewerSubscription(matchId) {
        const unsubscribe = this.subscriptions.get(matchId);
        if (unsubscribe) {
            unsubscribe();
            this.subscriptions.delete(matchId);
        }
    }
    /**
     * Broadcast event to all clients connected to a match
     */
    broadcastToClients(matchId, event) {
        const clients = this.clients.get(matchId);
        if (!clients) {
            return;
        }
        const message = JSON.stringify(event);
        const deadClients = [];
        for (const client of clients) {
            try {
                client.send(message);
            }
            catch (err) {
                // Mark for removal if send fails
                deadClients.push(client);
            }
        }
        // Remove dead clients
        for (const client of deadClients) {
            this.unregisterClient(matchId, client);
        }
    }
    /**
     * Get client count for a match
     */
    getClientCount(matchId) {
        return this.clients.get(matchId)?.size ?? 0;
    }
    /**
     * Get total client count across all matches
     */
    getTotalClientCount() {
        let total = 0;
        for (const clients of this.clients.values()) {
            total += clients.size;
        }
        return total;
    }
    /**
     * Get list of matches with active clients
     */
    getActiveMatches() {
        return Array.from(this.clients.keys());
    }
    /**
     * Check if a match has any clients
     */
    hasClients(matchId) {
        return (this.clients.get(matchId)?.size ?? 0) > 0;
    }
    /**
     * Disconnect all clients from a match
     */
    disconnectMatch(matchId) {
        const clients = this.clients.get(matchId);
        if (clients) {
            // Copy set since unregisterClient modifies it
            const clientsCopy = Array.from(clients);
            for (const client of clientsCopy) {
                this.unregisterClient(matchId, client);
                client.close();
            }
        }
    }
    /**
     * Get server configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=match-server.js.map