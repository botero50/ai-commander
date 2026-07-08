/**
 * A single point-in-time snapshot of execution state.
 */
export interface StateSnapshot {
  readonly timestamp: number;
  readonly snapshotIndex: number;
  readonly customData?: Record<string, unknown>;
}

/**
 * Calculated metrics from state snapshots.
 */
export interface StateMetricsResult {
  readonly snapshotCount: number;
  readonly timeSpanMs: number;
  readonly isIncreasing: boolean;
  readonly isDecreasing: boolean;
  readonly isStable: boolean;
}

/**
 * Logger interface - injected, no concrete implementation.
 */
interface Logger {
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  debug(message: string, context?: unknown): void;
  error(message: string, error?: unknown): void;
}

/**
 * Configuration for state metrics.
 */
export interface StateMetricsConfig {
  maxSnapshots?: number;
  enableTrending?: boolean;
  trendThreshold?: number;
}

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
  private logger: Logger;
  private config: StateMetricsConfig;
  private snapshots: StateSnapshot[] = [];

  constructor(config: Partial<StateMetricsConfig>, logger: Logger) {
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
  recordSnapshot(customData?: Record<string, unknown>): StateSnapshot {
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      snapshotIndex: this.snapshots.length,
      customData,
    };

    this.snapshots.push(snapshot);

    // Keep array bounded
    if (this.snapshots.length > this.config.maxSnapshots!) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  /**
   * Get the latest snapshot.
   */
  getLatestSnapshot(): StateSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  /**
   * Get all snapshots.
   */
  getAllSnapshots(): readonly StateSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get snapshot count.
   */
  getSnapshotCount(): number {
    return this.snapshots.length;
  }

  /**
   * Calculate metrics from snapshots.
   */
  getMetrics(): StateMetricsResult {
    if (this.snapshots.length === 0) {
      return {
        snapshotCount: 0,
        timeSpanMs: 0,
        isIncreasing: false,
        isDecreasing: false,
        isStable: true,
      };
    }

    const firstSnapshot = this.snapshots[0]!;
    const lastSnapshot = this.snapshots[this.snapshots.length - 1]!;
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
  private calculateTrend(): { isIncreasing: boolean; isDecreasing: boolean } {
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
    const threshold = this.config.trendThreshold!;

    return {
      isIncreasing: avgChange > threshold,
      isDecreasing: avgChange < -threshold,
    };
  }

  /**
   * Clear all snapshots.
   */
  clear(): void {
    this.snapshots = [];
  }

  /**
   * Reset to initial state.
   */
  reset(): void {
    this.clear();
  }
}
