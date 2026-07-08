/**
 * Web-based Match Viewer
 *
 * Real-time web interface for watching AI vs AI matches.
 * - WebSocket-based live updates
 * - Decision and state visualization
 * - Timeline display
 * - Match statistics
 */
/**
 * Web-based match viewer
 */
export class MatchViewer {
    matchId;
    subscribers = new Set();
    currentState = {
        status: 'starting',
    };
    startTime = Date.now();
    constructor(matchId, brain1Name, brain2Name) {
        this.matchId = matchId;
        this.currentState = {
            matchId,
            status: 'starting',
            currentTick: 0,
            brain1: brain1Name,
            brain2: brain2Name,
            player1Stats: { commands: 0, errors: 0 },
            player2Stats: { commands: 0, errors: 0 },
            latestDecisions: [],
            timeline: {
                unitCountTrend: 'stable',
                buildingCountTrend: 'stable',
                totalSnapshots: 0,
            },
        };
    }
    /**
     * Subscribe to match events
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        // Return unsubscribe function
        return () => {
            this.subscribers.delete(callback);
        };
    }
    /**
     * Update match state with observation
     */
    updateState(update) {
        this.currentState = { ...this.currentState, ...update };
        this.broadcast({
            type: 'state_update',
            timestamp: Date.now(),
            data: this.currentState,
        });
    }
    /**
     * Record a decision event
     */
    recordDecision(decision) {
        // Update latest decisions (keep last 5)
        const decisions = [...(this.currentState.latestDecisions || [])];
        decisions.push(decision);
        if (decisions.length > 5) {
            decisions.shift();
        }
        this.currentState = {
            ...this.currentState,
            latestDecisions: decisions,
        };
        this.broadcast({
            type: 'decision',
            timestamp: Date.now(),
            data: decision,
        });
    }
    /**
     * Record a milestone event
     */
    recordMilestone(tick, description) {
        this.broadcast({
            type: 'milestone',
            timestamp: Date.now(),
            data: { tick, description },
        });
    }
    /**
     * Record an error
     */
    recordError(error) {
        this.broadcast({
            type: 'error',
            timestamp: Date.now(),
            data: {
                error: typeof error === 'string' ? error : error.message,
            },
        });
    }
    /**
     * Mark match as complete
     */
    complete(result) {
        this.currentState = {
            ...this.currentState,
            ...result,
            status: 'completed',
        };
        this.broadcast({
            type: 'complete',
            timestamp: Date.now(),
            data: this.currentState,
        });
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.currentState };
    }
    /**
     * Get match duration so far
     */
    getDuration() {
        return Date.now() - this.startTime;
    }
    /**
     * Broadcast event to all subscribers
     */
    broadcast(event) {
        for (const subscriber of this.subscribers) {
            try {
                Promise.resolve(subscriber(event)).catch((err) => {
                    console.error('Subscriber error:', err);
                });
            }
            catch (err) {
                console.error('Subscriber error:', err);
            }
        }
    }
}
/**
 * Match viewer manager for multiple concurrent matches
 */
export class MatchViewerManager {
    viewers = new Map();
    maxViewers = 100;
    /**
     * Create a new match viewer
     */
    createViewer(matchId, brain1Name, brain2Name) {
        if (this.viewers.size >= this.maxViewers) {
            throw new Error(`Maximum viewers (${this.maxViewers}) exceeded`);
        }
        if (this.viewers.has(matchId)) {
            throw new Error(`Viewer for match ${matchId} already exists`);
        }
        const viewer = new MatchViewer(matchId, brain1Name, brain2Name);
        this.viewers.set(matchId, viewer);
        return viewer;
    }
    /**
     * Get a viewer by match ID
     */
    getViewer(matchId) {
        return this.viewers.get(matchId);
    }
    /**
     * Remove a viewer
     */
    removeViewer(matchId) {
        this.viewers.delete(matchId);
    }
    /**
     * List all active viewers
     */
    listViewers() {
        return Array.from(this.viewers.keys());
    }
    /**
     * Get count of active viewers
     */
    getViewerCount() {
        return this.viewers.size;
    }
}
//# sourceMappingURL=match-viewer.js.map