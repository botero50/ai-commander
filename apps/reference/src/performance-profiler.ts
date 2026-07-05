export interface PerformanceMetrics {
  readonly totalDuration: number;
  readonly avgTickDuration: number;
  readonly maxTickDuration: number;
  readonly minTickDuration: number;
  readonly traceSize: number;
  readonly dashboardLatency: number;
  readonly memoryUsage: number;
}

export class PerformanceProfiler {
  private tickTimestamps: number[] = [];
  private startTime: number = 0;
  private endTime: number = 0;
  private traceEventCount: number = 0;
  private dashboardUpdateCount: number = 0;

  recordTickStart(tick: number): void {
    if (this.startTime === 0) {
      this.startTime = performance.now();
    }
    this.tickTimestamps.push(performance.now());
  }

  recordTickEnd(): void {
    this.endTime = performance.now();
  }

  recordTraceEvent(): void {
    this.traceEventCount++;
  }

  recordDashboardUpdate(): void {
    this.dashboardUpdateCount++;
  }

  compute(): PerformanceMetrics {
    const totalDuration = this.endTime - this.startTime;
    const tickDurations = [];

    for (let i = 1; i < this.tickTimestamps.length; i++) {
      tickDurations.push(this.tickTimestamps[i] - this.tickTimestamps[i - 1]);
    }

    const avgTickDuration = tickDurations.length > 0 ? tickDurations.reduce((a, b) => a + b, 0) / tickDurations.length : 0;
    const maxTickDuration = tickDurations.length > 0 ? Math.max(...tickDurations) : 0;
    const minTickDuration = tickDurations.length > 0 ? Math.min(...tickDurations) : 0;

    // Estimate trace size (bytes): ~200 bytes per event
    const traceSize = this.traceEventCount * 200;

    // Dashboard latency: update frequency relative to ticks
    const dashboardLatency = this.tickTimestamps.length > 0 ? totalDuration / this.dashboardUpdateCount : 0;

    // Memory usage estimate (MB)
    const memoryUsage = (traceSize / 1024 / 1024) + 10; // +10 MB for overhead

    return {
      totalDuration,
      avgTickDuration,
      maxTickDuration,
      minTickDuration,
      traceSize,
      dashboardLatency,
      memoryUsage,
    };
  }

  formatReport(): string {
    const metrics = this.compute();
    const lines = [
      'Performance Profile:',
      `  Total duration: ${metrics.totalDuration.toFixed(2)}ms`,
      `  Avg tick duration: ${metrics.avgTickDuration.toFixed(3)}ms`,
      `  Max tick duration: ${metrics.maxTickDuration.toFixed(3)}ms`,
      `  Min tick duration: ${metrics.minTickDuration.toFixed(3)}ms`,
      `  Trace size: ${(metrics.traceSize / 1024).toFixed(1)}KB`,
      `  Dashboard latency: ${metrics.dashboardLatency.toFixed(2)}ms`,
      `  Estimated memory: ${metrics.memoryUsage.toFixed(1)}MB`,
    ];
    return lines.join('\n');
  }
}
