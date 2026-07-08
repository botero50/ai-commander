/**
 * Generic state metrics tracker for any execution system.
 *
 * Records snapshots and calculates trends:
 * - Snapshot collection with automatic rotation
 * - Generic numeric trending (increasing/decreasing/stable)
 * - No domain-specific assumptions
 *
 * Framework-owned component for tracking execution state.
 */
export class StateMetrics {
    logger;
    config;
    snapshots = [];
    constructor(config, logger) {
        this.logger = logger;
        this.config = {
            maxSnapshots: 10000,
            enableTrending: true,
            trendThreshold: 0.1, // 10% variance
            ...config,
        };
    }
    /**
     * Record a state snapshot.
     */
    recordSnapshot(customData) {
        const snapshot = {
            timestamp: Date.now(),
            snapshotIndex: this.snapshots.length,
            customData,
        };
        this.snapshots.push(snapshot);
        // Keep array bounded
        if (this.snapshots.length > this.config.maxSnapshots) {
            this.snapshots.shift();
        }
        return snapshot;
    }
    /**
     * Get the latest snapshot.
     */
    getLatestSnapshot() {
        return this.snapshots[this.snapshots.length - 1];
    }
    /**
     * Get all snapshots.
     */
    getAllSnapshots() {
        return [...this.snapshots];
    }
    /**
     * Get snapshot count.
     */
    getSnapshotCount() {
        return this.snapshots.length;
    }
    /**
     * Calculate metrics from snapshots.
     */
    getMetrics() {
        if (this.snapshots.length === 0) {
            return {
                snapshotCount: 0,
                timeSpanMs: 0,
                isIncreasing: false,
                isDecreasing: false,
                isStable: true,
            };
        }
        const firstSnapshot = this.snapshots[0];
        const lastSnapshot = this.snapshots[this.snapshots.length - 1];
        const timeSpanMs = lastSnapshot.timestamp - firstSnapshot.timestamp;
        // Calculate trend by comparing halves
        const { isIncreasing, isDecreasing } = this.calculateTrend();
        return {
            snapshotCount: this.snapshots.length,
            timeSpanMs,
            isIncreasing,
            isDecreasing,
            isStable: !isIncreasing && !isDecreasing,
        };
    }
    /**
     * Calculate trend by comparing first and second half.
     */
    calculateTrend() {
        if (!this.config.enableTrending || this.snapshots.length < 2) {
            return { isIncreasing: false, isDecreasing: false };
        }
        const midpoint = Math.floor(this.snapshots.length / 2);
        const firstHalf = this.snapshots.slice(0, midpoint);
        const secondHalf = this.snapshots.slice(midpoint);
        if (firstHalf.length === 0 || secondHalf.length === 0) {
            return { isIncreasing: false, isDecreasing: false };
        }
        // Calculate average snapshot index for each half (as a proxy for trend)
        const firstHalfAvg = firstHalf.reduce((sum, s) => sum + s.snapshotIndex, 0) / firstHalf.length;
        const secondHalfAvg = secondHalf.reduce((sum, s) => sum + s.snapshotIndex, 0) / secondHalf.length;
        const avgChange = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
        const threshold = this.config.trendThreshold;
        return {
            isIncreasing: avgChange > threshold,
            isDecreasing: avgChange < -threshold,
        };
    }
    /**
     * Clear all snapshots.
     */
    clear() {
        this.snapshots = [];
    }
    /**
     * Reset to initial state.
     */
    reset() {
        this.clear();
    }
}
//# sourceMappingURL=state-metrics.js.map