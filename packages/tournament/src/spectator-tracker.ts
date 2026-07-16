/**
 * STORY 33.3: Spectator Statistics
 *
 * Tracks viewer engagement and participation.
 *
 * Responsibilities:
 * - Track connections and disconnections
 * - Measure session durations
 * - Collect peak viewer metrics
 * - Aggregate viewer statistics
 */

export interface SpectatorSession {
  readonly clientId: string;
  readonly connectTime: number;
  disconnectTime?: number;
}

export interface SpectatorMetrics {
  readonly streamId: string;
  readonly totalConnections: number;
  readonly peakViewers: number;
  readonly avgDuration: number;
  readonly totalViewMinutes: number;
  readonly bounceRate: number;
  readonly minSessionDuration: number;
  readonly maxSessionDuration: number;
}

export class SpectatorTracker {
  private sessions = new Map<string, SpectatorSession>();
  private peakViewers = 0;
  private currentViewers = 0;
  private startTime = Date.now();

  /**
   * Track viewer connection
   */
  trackConnection(clientId: string): void {
    if (this.sessions.has(clientId)) {
      // Reconnection - update time but keep original
      return;
    }

    this.sessions.set(clientId, {
      clientId,
      connectTime: Date.now(),
    });

    this.currentViewers++;
    if (this.currentViewers > this.peakViewers) {
      this.peakViewers = this.currentViewers;
    }
  }

  /**
   * Track viewer disconnection
   */
  trackDisconnection(clientId: string): void {
    const session = this.sessions.get(clientId);
    if (!session) return;

    const updated: SpectatorSession = {
      ...session,
      disconnectTime: Date.now(),
    };
    this.sessions.set(clientId, updated);

    this.currentViewers = Math.max(0, this.currentViewers - 1);
  }

  /**
   * Get current viewer count
   */
  getCurrentViewers(): number {
    return this.currentViewers;
  }

  /**
   * Get total unique viewers
   */
  getTotalConnections(): number {
    return this.sessions.size;
  }

  /**
   * Get peak concurrent viewers
   */
  getPeakViewers(): number {
    return this.peakViewers;
  }

  /**
   * Calculate total view minutes
   */
  getTotalViewMinutes(): number {
    let totalMinutes = 0;

    for (const session of this.sessions.values()) {
      const endTime = session.disconnectTime ?? Date.now();
      const duration = endTime - session.connectTime;
      const minutes = duration / 1000 / 60;
      totalMinutes += minutes;
    }

    return totalMinutes;
  }

  /**
   * Calculate average session duration
   */
  getAverageSessionDuration(): number {
    if (this.sessions.size === 0) return 0;

    const totalDuration = Array.from(this.sessions.values()).reduce((sum, session) => {
      const endTime = session.disconnectTime ?? Date.now();
      return sum + (endTime - session.connectTime);
    }, 0);

    return totalDuration / this.sessions.size;
  }

  /**
   * Calculate bounce rate (sessions < 1 minute)
   */
  getBounceRate(): number {
    if (this.sessions.size === 0) return 0;

    const bounces = Array.from(this.sessions.values()).filter((session) => {
      const endTime = session.disconnectTime ?? Date.now();
      const duration = endTime - session.connectTime;
      return duration < 60000; // 1 minute in ms
    }).length;

    return bounces / this.sessions.size;
  }

  /**
   * Get min/max session durations
   */
  getSessionDurationRange(): { min: number; max: number } {
    if (this.sessions.size === 0) return { min: 0, max: 0 };

    let min = Infinity;
    let max = 0;

    for (const session of this.sessions.values()) {
      const endTime = session.disconnectTime ?? Date.now();
      const duration = endTime - session.connectTime;
      if (duration < min) min = duration;
      if (duration > max) max = duration;
    }

    return { min: min === Infinity ? 0 : min, max };
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(streamId: string): SpectatorMetrics {
    const range = this.getSessionDurationRange();

    return {
      streamId,
      totalConnections: this.getTotalConnections(),
      peakViewers: this.getPeakViewers(),
      avgDuration: this.getAverageSessionDuration(),
      totalViewMinutes: this.getTotalViewMinutes(),
      bounceRate: this.getBounceRate(),
      minSessionDuration: range.min,
      maxSessionDuration: range.max,
    };
  }

  /**
   * Get session details for a specific viewer
   */
  getSessionDuration(clientId: string): number {
    const session = this.sessions.get(clientId);
    if (!session) return 0;

    const endTime = session.disconnectTime ?? Date.now();
    return endTime - session.connectTime;
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.sessions.clear();
    this.peakViewers = 0;
    this.currentViewers = 0;
    this.startTime = Date.now();
  }
}

export function createSpectatorTracker(): SpectatorTracker {
  return new SpectatorTracker();
}
