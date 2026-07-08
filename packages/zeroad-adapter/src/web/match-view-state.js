/**
 * Match View State Management
 *
 * Framework-agnostic state management for web match viewer.
 * Can be used with React, Vue, or custom state management.
 */
/**
 * Match view state manager
 * Framework-agnostic state container for UI
 */
export class MatchViewStateManager {
    state;
    listeners = new Set();
    wsConnection = null;
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    constructor(matchId, brain1, brain2) {
        this.state = {
            matchId,
            status: 'starting',
            brain1,
            brain2,
            currentTick: 0,
            totalTicks: 0,
            duration: 0,
            isConnected: false,
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
     * Subscribe to state changes
     */
    subscribe(callback) {
        this.listeners.add(callback);
        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }
    /**
     * Connect to WebSocket server
     */
    connect(wsUrl) {
        return new Promise((resolve, reject) => {
            try {
                this.wsConnection = new WebSocket(wsUrl);
                this.wsConnection.onopen = () => {
                    this.reconnectAttempts = 0;
                    this.updateState({ isConnected: true, error: undefined });
                    resolve();
                };
                this.wsConnection.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (err) {
                        console.error('Failed to parse message:', err);
                    }
                };
                this.wsConnection.onerror = (error) => {
                    this.updateState({
                        isConnected: false,
                        error: 'Connection error',
                        status: 'error',
                    });
                    reject(error);
                };
                this.wsConnection.onclose = () => {
                    this.updateState({ isConnected: false });
                    this.attemptReconnect(wsUrl);
                };
            }
            catch (err) {
                reject(err);
            }
        });
    }
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
        if (this.wsConnection) {
            this.wsConnection.close();
            this.wsConnection = null;
        }
        this.updateState({ isConnected: false });
    }
    /**
     * Attempt to reconnect
     */
    attemptReconnect(wsUrl) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            setTimeout(() => {
                this.connect(wsUrl).catch(() => {
                    // Reconnect failed, will retry
                });
            }, delay);
        }
    }
    /**
     * Handle incoming WebSocket message
     */
    handleMessage(event) {
        switch (event.type) {
            case 'initial_state':
                this.handleInitialState(event.data);
                break;
            case 'state_update':
                this.handleStateUpdate(event.data);
                break;
            case 'decision':
                this.handleDecision(event.data);
                break;
            case 'milestone':
                // Log but don't update state
                break;
            case 'error':
                this.handleError(event.data);
                break;
            case 'complete':
                this.handleComplete(event.data);
                break;
        }
    }
    /**
     * Handle initial state
     */
    handleInitialState(data) {
        this.updateState(data);
    }
    /**
     * Handle state update
     */
    handleStateUpdate(data) {
        this.updateState(data);
    }
    /**
     * Handle decision event
     */
    handleDecision(decision) {
        const decisions = [...this.state.latestDecisions];
        decisions.push(decision);
        // Keep only last 5
        if (decisions.length > 5) {
            decisions.shift();
        }
        this.updateState({ latestDecisions: decisions });
    }
    /**
     * Handle error event
     */
    handleError(data) {
        this.updateState({
            status: 'error',
            error: data.error,
        });
    }
    /**
     * Handle completion
     */
    handleComplete(data) {
        this.updateState({
            status: 'completed',
            ...data,
        });
    }
    /**
     * Update state and notify listeners
     */
    updateState(updates) {
        this.state = {
            ...this.state,
            ...updates,
        };
        // Notify all listeners
        for (const listener of this.listeners) {
            try {
                listener(this.state);
            }
            catch (err) {
                console.error('State listener error:', err);
            }
        }
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Check if connected
     */
    isConnected() {
        return this.state.isConnected;
    }
}
//# sourceMappingURL=match-view-state.js.map