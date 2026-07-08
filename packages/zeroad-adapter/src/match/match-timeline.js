/**
 * Match Timeline
 *
 * Captures temporal events during match execution for visualization and analysis.
 * - Records game state snapshots at regular intervals
 * - Correlates state changes with AI decisions
 * - Enables replay of match progression
 * - Provides timeline statistics
 */
/**
 * Match timeline builder and analyzer
 */
export class MatchTimeline {
    snapshots = [];
    events = [];
    maxSnapshots = 5000; // Auto-rotate at limit
    startTimestamp = Date.now();
    /**
     * Record a game state snapshot
     */
    recordSnapshot(tick, unitCount, buildingCount, playerCount, resourcesPerPlayer) {
        const snapshot = {
            tick,
            timestamp: Date.now(),
            gameState: {
                unitCount,
                buildingCount,
                playerCount,
                resourcesPerPlayer: [...resourcesPerPlayer],
            },
            decisions: [],
        };
        this.snapshots.push(snapshot);
        // Auto-rotate: keep only the last N snapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(-this.maxSnapshots);
        }
        this.events.push({
            tick,
            timestamp: snapshot.timestamp,
            type: 'snapshot',
            data: snapshot,
        });
    }
    /**
     * Correlate a decision with the current timeline state
     */
    addDecisionToTimeline(decision) {
        // Find or create snapshot for this tick
        let snapshot = this.snapshots.find((s) => s.tick === decision.tick);
        if (!snapshot) {
            // Create a minimal snapshot for this tick if it doesn't exist
            snapshot = {
                tick: decision.tick,
                timestamp: decision.timestamp,
                gameState: {
                    unitCount: 0,
                    buildingCount: 0,
                    playerCount: 0,
                    resourcesPerPlayer: [],
                },
                decisions: [decision],
            };
            this.snapshots.push(snapshot);
        }
        else {
            // Add decision to existing snapshot
            // Note: We need to create a new snapshot since snapshot is readonly
            const updatedSnapshot = {
                tick: snapshot.tick,
                timestamp: snapshot.timestamp,
                gameState: snapshot.gameState,
                decisions: [...snapshot.decisions, decision],
            };
            const index = this.snapshots.indexOf(snapshot);
            this.snapshots[index] = updatedSnapshot;
        }
        this.events.push({
            tick: decision.tick,
            timestamp: decision.timestamp,
            type: 'decision',
            data: decision,
        });
    }
    /**
     * Record a significant game event (milestone)
     */
    recordMilestone(tick, description, data) {
        this.events.push({
            tick,
            timestamp: Date.now(),
            type: 'milestone',
            data: {
                description,
                ...(typeof data === 'object' && data !== null ? data : {}),
            },
        });
    }
    /**
     * Record an error during match
     */
    recordError(tick, error) {
        this.events.push({
            tick,
            timestamp: Date.now(),
            type: 'error',
            data: {
                error: typeof error === 'string' ? error : error.message,
            },
        });
    }
    /**
     * Get all snapshots in order
     */
    getSnapshots() {
        return [...this.snapshots];
    }
    /**
     * Get snapshots within a tick range
     */
    getSnapshotsInRange(startTick, endTick) {
        return this.snapshots.filter((s) => s.tick >= startTick && s.tick <= endTick);
    }
    /**
     * Get all timeline events in order
     */
    getEvents() {
        return [...this.events];
    }
    /**
     * Get events of a specific type
     */
    getEventsByType(type) {
        return this.events.filter((e) => e.type === type);
    }
    /**
     * Get events within a tick range
     */
    getEventsInRange(startTick, endTick) {
        return this.events.filter((e) => e.tick >= startTick && e.tick <= endTick);
    }
    /**
     * Analyze game state progression
     */
    analyzeProgression() {
        const first = this.snapshots[0] ?? null;
        const last = this.snapshots[this.snapshots.length - 1] ?? null;
        const unitCountChange = last ? last.gameState.unitCount - (first?.gameState.unitCount ?? 0) : 0;
        const buildingCountChange = last
            ? last.gameState.buildingCount - (first?.gameState.buildingCount ?? 0)
            : 0;
        // Determine trends (simplified: just check if first vs last)
        const unitTrend = unitCountChange > 0 ? 'increasing' : unitCountChange < 0 ? 'decreasing' : 'stable';
        const buildingTrend = buildingCountChange > 0 ? 'increasing' : buildingCountChange < 0 ? 'decreasing' : 'stable';
        return {
            totalTicks: last?.tick ?? 0,
            totalSnapshots: this.snapshots.length,
            totalEvents: this.events.length,
            unitCountTrend: unitTrend,
            buildingCountTrend: buildingTrend,
            firstSnapshot: first,
            lastSnapshot: last,
            unitCountChange,
            buildingCountChange,
        };
    }
    /**
     * Find decisions that led to significant state changes
     */
    findImpactfulDecisions(threshold = 5) {
        const impactful = [];
        // Collect all decisions
        const allDecisions = [];
        for (const snapshot of this.snapshots) {
            allDecisions.push(...snapshot.decisions);
        }
        // A decision is impactful if it occurred during a significant state change
        // For now, we use a simple heuristic: decisions with many commands
        for (const decision of allDecisions) {
            if (decision.commandCount >= threshold) {
                impactful.push(decision);
            }
        }
        return impactful;
    }
    /**
     * Clear timeline for new match
     */
    clear() {
        this.snapshots = [];
        this.events = [];
        this.startTimestamp = Date.now();
    }
    /**
     * Get total duration since timeline started
     */
    getDuration() {
        return Date.now() - this.startTimestamp;
    }
}
//# sourceMappingURL=match-timeline.js.map