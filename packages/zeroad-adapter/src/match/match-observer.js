/**
 * Match Observer
 *
 * Real-time match observation and monitoring.
 * - Subscribes to game state updates
 * - Captures snapshots into timeline
 * - Tracks match health and errors
 * - Provides live observer callbacks
 */
/**
 * Match observation session
 */
export class MatchObserver {
    timeline;
    overlay;
    observers = [];
    currentTick = 0;
    isObserving = false;
    errorCount = 0;
    maxErrors = 10;
    constructor(timeline, overlay) {
        this.timeline = timeline;
        this.overlay = overlay;
    }
    /**
     * Start observing match
     */
    start() {
        if (this.isObserving) {
            return;
        }
        this.isObserving = true;
        this.currentTick = 0;
        this.errorCount = 0;
    }
    /**
     * Stop observing match
     */
    stop() {
        this.isObserving = false;
    }
    /**
     * Record game state observation
     */
    recordObservation(tick, gameState) {
        if (!this.isObserving) {
            return;
        }
        this.currentTick = tick;
        // Extract state metrics for timeline
        const agentCount = gameState.agents?.length ?? 0;
        const playerCount = gameState.players?.length ?? 0;
        const teamCount = gameState.teams?.length ?? 0;
        // Extract resources per player from customData (game-specific)
        const resourcesPerPlayer = [];
        for (const player of gameState.players ?? []) {
            const playerResources = {};
            // Try to extract from customData if available
            if (player.customData && typeof player.customData === 'object') {
                const playerCustom = player.customData;
                if (playerCustom.resources && typeof playerCustom.resources === 'object') {
                    const res = playerCustom.resources;
                    playerResources['gold'] = res.gold ?? 0;
                    playerResources['wood'] = res.wood ?? 0;
                    playerResources['stone'] = res.stone ?? 0;
                    playerResources['metal'] = res.metal ?? 0;
                }
            }
            if (Object.keys(playerResources).length === 0) {
                // Provide defaults if not found
                playerResources['gold'] = 0;
                playerResources['wood'] = 0;
            }
            resourcesPerPlayer.push(playerResources);
        }
        // Record in timeline (units as agent count, buildings as team count for now)
        this.timeline.recordSnapshot(tick, agentCount, teamCount, playerCount, resourcesPerPlayer);
        // Notify all observers
        this.notifyObservers(gameState);
    }
    /**
     * Subscribe to match observations
     */
    subscribe(observer) {
        this.observers.push(observer);
        // Return unsubscribe function
        return () => {
            const index = this.observers.indexOf(observer);
            if (index !== -1) {
                this.observers.splice(index, 1);
            }
        };
    }
    /**
     * Notify all observers of state change
     */
    notifyObservers(gameState) {
        const latestDecisions = this.overlay.getLatestDecisions(5);
        const observationState = {
            tick: this.currentTick,
            gameState,
            timeline: this.timeline,
            decisions: latestDecisions,
            isActive: this.isObserving,
        };
        for (const observer of this.observers) {
            try {
                Promise.resolve(observer(observationState)).catch((err) => {
                    this.errorCount++;
                    if (this.errorCount > this.maxErrors) {
                        console.error('Observer exceeded error threshold, stopping observation');
                        this.stop();
                    }
                });
            }
            catch (err) {
                this.errorCount++;
                console.error('Observer error:', err);
            }
        }
    }
    /**
     * Get current tick
     */
    getCurrentTick() {
        return this.currentTick;
    }
    /**
     * Check if observer is active
     */
    isActive() {
        return this.isObserving;
    }
    /**
     * Get error count
     */
    getErrorCount() {
        return this.errorCount;
    }
    /**
     * Reset error count
     */
    resetErrorCount() {
        this.errorCount = 0;
    }
}
/**
 * Match observer builder for integration with live matches
 */
export class MatchObserverBuilder {
    observers = [];
    /**
     * Add an observer callback
     */
    addObserver(callback) {
        this.observers.push(callback);
        return this;
    }
    /**
     * Build the match observer
     */
    build(timeline, overlay) {
        const observer = new MatchObserver(timeline, overlay);
        for (const callback of this.observers) {
            observer.subscribe(callback);
        }
        return observer;
    }
}
//# sourceMappingURL=match-observer.js.map