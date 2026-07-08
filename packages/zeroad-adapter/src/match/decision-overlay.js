/**
 * Decision Overlay
 *
 * Captures and streams AI decisions in real-time for live visualization.
 * - Records each brain decision with reasoning and commands
 * - Timestamp each decision for replay/analysis
 * - Stream decisions to subscribers (UI, logging, replay)
 */
/**
 * Real-time decision overlay and telemetry
 */
export class DecisionOverlay {
    decisions = [];
    subscribers = [];
    maxDecisions = 10000; // Auto-rotate at limit
    /**
     * Record a brain decision
     */
    recordDecision(tick, player, brainName, reasoning, commands, durationMs) {
        const event = {
            tick,
            timestamp: Date.now(),
            player,
            brainName,
            reasoning: reasoning?.substring(0, 500), // Truncate very long reasoning
            commands: [...commands],
            commandCount: commands.length,
            durationMs,
        };
        this.decisions.push(event);
        // Auto-rotate: keep only the last N decisions to prevent unbounded growth
        if (this.decisions.length > this.maxDecisions) {
            this.decisions = this.decisions.slice(-this.maxDecisions);
        }
        // Notify all subscribers
        for (const subscriber of this.subscribers) {
            try {
                Promise.resolve(subscriber(event)).catch((err) => {
                    // Silently catch subscription errors to avoid breaking match execution
                    console.error('Decision subscriber error:', err);
                });
            }
            catch (err) {
                console.error('Decision subscriber error:', err);
            }
        }
    }
    /**
     * Subscribe to decision events in real-time
     */
    subscribe(subscriber) {
        this.subscribers.push(subscriber);
        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(subscriber);
            if (index !== -1) {
                this.subscribers.splice(index, 1);
            }
        };
    }
    /**
     * Get all recorded decisions (for replay)
     */
    getDecisions(filter) {
        if (!filter) {
            return [...this.decisions];
        }
        return this.decisions.filter((d) => {
            if (filter.tick !== undefined && d.tick !== filter.tick)
                return false;
            if (filter.player !== undefined && d.player !== filter.player)
                return false;
            if (filter.brainName !== undefined && d.brainName !== filter.brainName)
                return false;
            return true;
        });
    }
    /**
     * Get the last N decisions (for UI display)
     */
    getLatestDecisions(count = 5) {
        return this.decisions.slice(Math.max(0, this.decisions.length - count));
    }
    /**
     * Get stats about recorded decisions
     */
    getStats() {
        const player1 = this.decisions.filter((d) => d.player === 'player1');
        const player2 = this.decisions.filter((d) => d.player === 'player2');
        const totalCommands = this.decisions.reduce((sum, d) => sum + d.commandCount, 0);
        const avgCommands = this.decisions.length > 0 ? totalCommands / this.decisions.length : 0;
        return {
            totalDecisions: this.decisions.length,
            player1Decisions: player1.length,
            player2Decisions: player2.length,
            averageCommandsPerDecision: avgCommands,
            latestTick: this.decisions.length > 0 ? this.decisions[this.decisions.length - 1].tick : null,
        };
    }
    /**
     * Clear all recorded decisions (for new match)
     */
    clear() {
        this.decisions = [];
    }
}
//# sourceMappingURL=decision-overlay.js.map