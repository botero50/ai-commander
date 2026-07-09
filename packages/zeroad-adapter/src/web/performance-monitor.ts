/**
 * Performance Monitor
 * Measures and tracks CPU, memory, UI responsiveness, and data flow metrics
 */

export interface PerformanceMetrics {
  timestamp: number;
  cpu?: number; // Percentage
  memory?: {
    used: number; // Bytes
    total: number; // Bytes
    percentage: number;
  };
  ui: {
    frameTime: number; // ms
    fps: number;
    responsiveness: number; // 0-100, lower = more responsive
  };
  network: {
    latency: number; // ms
    bandwidth: number; // bytes/s
    requestCount: number;
  };
  dataFlow: {
    hudUpdateLatency: number; // ms
    commentaryLatency: number; // ms
    decisionLatency: number; // ms
    replayLatency: number; // ms
  };
}

export interface PerformanceReport {
  duration: number; // ms
  samples: number;
  cpu: {
    average?: number;
    peak?: number;
    min?: number;
  };
  memory: {
    startUsed: number; // Bytes
    peakUsed: number; // Bytes
    endUsed: number; // Bytes
    avgPercentage?: number;
  };
  ui: {
    avgFrameTime: number; // ms
    avgFps: number;
    minFps: number;
    maxFrameTime: number; // ms
    avgResponsiveness: number; // 0-100
  };
  network: {
    avgLatency: number; // ms
    peakLatency: number; // ms
    totalRequests: number;
    avgBandwidth: number; // bytes/s
  };
  dataFlow: {
    hudAvgLatency: number; // ms
    commentaryAvgLatency: number; // ms
    decisionAvgLatency: number; // ms
    replayAvgLatency: number; // ms
  };
  issues: {
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
  }[];
  recommendations: string[];
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private isRecording: boolean = false;

  /**
   * Start performance monitoring
   */
  start(): void {
    this.startTime = Date.now();
    this.isRecording = true;
    this.metrics = [];
    this.frameCount = 0;
    this.lastFrameTime = this.startTime;
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    this.isRecording = false;
  }

  /**
   * Record a performance sample
   */
  recordSample(metric: Partial<PerformanceMetrics>): void {
    if (!this.isRecording) return;

    const sample: PerformanceMetrics = {
      timestamp: Date.now(),
      cpu: metric.cpu,
      memory: metric.memory,
      ui: metric.ui || { frameTime: 0, fps: 0, responsiveness: 0 },
      network: metric.network || { latency: 0, bandwidth: 0, requestCount: 0 },
      dataFlow: metric.dataFlow || {
        hudUpdateLatency: 0,
        commentaryLatency: 0,
        decisionLatency: 0,
        replayLatency: 0,
      },
    };

    this.metrics.push(sample);
    this.frameCount++;
  }

  /**
   * Record frame time
   */
  recordFrame(frameTime: number): void {
    this.frameCount++;
    this.lastFrameTime = frameTime;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) return null;
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Get performance report
   */
  getReport(): PerformanceReport {
    const duration = Date.now() - this.startTime;
    const issues: { severity: 'critical' | 'high' | 'medium' | 'low'; message: string }[] = [];
    const recommendations: string[] = [];

    // Analyze CPU
    const cpuMetrics = this.metrics.filter((m) => m.cpu !== undefined).map((m) => m.cpu!);
    const avgCpu = cpuMetrics.length > 0 ? cpuMetrics.reduce((a, b) => a + b) / cpuMetrics.length : undefined;
    const peakCpu = cpuMetrics.length > 0 ? Math.max(...cpuMetrics) : undefined;
    const minCpu = cpuMetrics.length > 0 ? Math.min(...cpuMetrics) : undefined;

    if (peakCpu && peakCpu > 80) {
      issues.push({
        severity: 'high',
        message: `Peak CPU usage ${peakCpu.toFixed(1)}% exceeds safe threshold (80%)`,
      });
      recommendations.push('Consider optimizing hot code paths or reducing sampling rate');
    }

    // Analyze Memory
    const memoryMetrics = this.metrics.filter((m) => m.memory !== undefined).map((m) => m.memory!);
    const startMem = memoryMetrics[0]?.used || 0;
    const peakMem = Math.max(...memoryMetrics.map((m) => m.used));
    const endMem = memoryMetrics[memoryMetrics.length - 1]?.used || 0;
    const memoryGrowth = endMem - startMem;
    const avgMemPercentage =
      memoryMetrics.length > 0
        ? memoryMetrics.reduce((a, b) => a + b.percentage, 0) / memoryMetrics.length
        : undefined;

    if (memoryGrowth > 100 * 1024 * 1024) {
      issues.push({
        severity: 'high',
        message: `Memory grew ${(memoryGrowth / 1024 / 1024).toFixed(1)}MB during session`,
      });
      recommendations.push('Investigate potential memory leaks in data collection');
    }

    // Analyze UI/FPS
    const uiMetrics = this.metrics.filter((m) => m.ui);
    const avgFrameTime = uiMetrics.length > 0 ? uiMetrics.reduce((a, b) => a + b.ui.frameTime, 0) / uiMetrics.length : 0;
    const avgFps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    const minFps = uiMetrics.length > 0 ? Math.min(...uiMetrics.map((m) => m.ui.fps)) : 0;
    const maxFrameTime = uiMetrics.length > 0 ? Math.max(...uiMetrics.map((m) => m.ui.frameTime)) : 0;
    const avgResponsiveness =
      uiMetrics.length > 0 ? uiMetrics.reduce((a, b) => a + b.ui.responsiveness, 0) / uiMetrics.length : 0;

    if (avgFps < 30) {
      issues.push({
        severity: 'high',
        message: `Average FPS ${avgFps.toFixed(1)} is below acceptable threshold (30)`,
      });
      recommendations.push('Profile rendering bottlenecks and optimize component re-renders');
    }

    if (maxFrameTime > 100) {
      issues.push({
        severity: 'medium',
        message: `Maximum frame time ${maxFrameTime.toFixed(1)}ms causes occasional stuttering`,
      });
      recommendations.push('Investigate frame time spikes during heavy data updates');
    }

    if (avgResponsiveness > 100) {
      issues.push({
        severity: 'medium',
        message: `UI responsiveness score ${avgResponsiveness.toFixed(0)}/100 indicates slow controls`,
      });
      recommendations.push('Debounce frequent updates and use requestAnimationFrame');
    }

    // Analyze Network
    const netMetrics = this.metrics.filter((m) => m.network);
    const avgLatency = netMetrics.length > 0 ? netMetrics.reduce((a, b) => a + b.network.latency, 0) / netMetrics.length : 0;
    const peakLatency = netMetrics.length > 0 ? Math.max(...netMetrics.map((m) => m.network.latency)) : 0;
    const totalRequests = netMetrics.length > 0 ? Math.max(...netMetrics.map((m) => m.network.requestCount)) : 0;
    const avgBandwidth = netMetrics.length > 0 ? netMetrics.reduce((a, b) => a + b.network.bandwidth, 0) / netMetrics.length : 0;

    if (avgLatency > 500) {
      issues.push({
        severity: 'medium',
        message: `Average network latency ${avgLatency.toFixed(0)}ms is high`,
      });
      recommendations.push('Check network quality and consider implementing request batching');
    }

    if (peakLatency > 2000) {
      issues.push({
        severity: 'high',
        message: `Peak network latency ${peakLatency.toFixed(0)}ms indicates network congestion`,
      });
      recommendations.push('Investigate network conditions during measurements');
    }

    // Analyze Data Flow
    const dataFlowMetrics = this.metrics.filter((m) => m.dataFlow);
    const hudLatencies = dataFlowMetrics.map((m) => m.dataFlow.hudUpdateLatency);
    const commentaryLatencies = dataFlowMetrics.map((m) => m.dataFlow.commentaryLatency);
    const decisionLatencies = dataFlowMetrics.map((m) => m.dataFlow.decisionLatency);
    const replayLatencies = dataFlowMetrics.map((m) => m.dataFlow.replayLatency);

    const hudAvgLatency = hudLatencies.length > 0 ? hudLatencies.reduce((a, b) => a + b) / hudLatencies.length : 0;
    const commentaryAvgLatency = commentaryLatencies.length > 0 ? commentaryLatencies.reduce((a, b) => a + b) / commentaryLatencies.length : 0;
    const decisionAvgLatency = decisionLatencies.length > 0 ? decisionLatencies.reduce((a, b) => a + b) / decisionLatencies.length : 0;
    const replayAvgLatency = replayLatencies.length > 0 ? replayLatencies.reduce((a, b) => a + b) / replayLatencies.length : 0;

    if (hudAvgLatency > 100) {
      issues.push({
        severity: 'medium',
        message: `HUD update latency ${hudAvgLatency.toFixed(0)}ms exceeds 100ms target`,
      });
      recommendations.push('Optimize HUD rendering or increase sampling frequency');
    }

    if (commentaryAvgLatency > 200) {
      issues.push({
        severity: 'low',
        message: `Commentary delivery latency ${commentaryAvgLatency.toFixed(0)}ms is acceptable but could be faster`,
      });
    }

    // Create report
    return {
      duration,
      samples: this.metrics.length,
      cpu: {
        average: avgCpu,
        peak: peakCpu,
        min: minCpu,
      },
      memory: {
        startUsed: startMem,
        peakUsed: peakMem,
        endUsed: endMem,
        avgPercentage: avgMemPercentage,
      },
      ui: {
        avgFrameTime,
        avgFps,
        minFps,
        maxFrameTime,
        avgResponsiveness,
      },
      network: {
        avgLatency,
        peakLatency,
        totalRequests,
        avgBandwidth,
      },
      dataFlow: {
        hudAvgLatency,
        commentaryAvgLatency,
        decisionAvgLatency,
        replayAvgLatency,
      },
      issues,
      recommendations,
    };
  }

  /**
   * Get report summary as string
   */
  getSummary(report: PerformanceReport): string {
    const lines: string[] = [
      '=== PERFORMANCE REPORT ===',
      `Duration: ${(report.duration / 1000).toFixed(2)}s`,
      `Samples: ${report.samples}`,
      '',
      'CPU:',
      `  Average: ${report.cpu.average?.toFixed(1) || 'N/A'}%`,
      `  Peak: ${report.cpu.peak?.toFixed(1) || 'N/A'}%`,
      `  Min: ${report.cpu.min?.toFixed(1) || 'N/A'}%`,
      '',
      'Memory:',
      `  Start: ${(report.memory.startUsed / 1024 / 1024).toFixed(1)}MB`,
      `  Peak: ${(report.memory.peakUsed / 1024 / 1024).toFixed(1)}MB`,
      `  End: ${(report.memory.endUsed / 1024 / 1024).toFixed(1)}MB`,
      `  Growth: ${((report.memory.endUsed - report.memory.startUsed) / 1024 / 1024).toFixed(1)}MB`,
      `  Avg: ${report.memory.avgPercentage?.toFixed(1) || 'N/A'}%`,
      '',
      'UI:',
      `  Avg Frame Time: ${report.ui.avgFrameTime.toFixed(2)}ms`,
      `  Avg FPS: ${report.ui.avgFps.toFixed(1)}`,
      `  Min FPS: ${report.ui.minFps.toFixed(1)}`,
      `  Max Frame Time: ${report.ui.maxFrameTime.toFixed(2)}ms`,
      `  Responsiveness: ${report.ui.avgResponsiveness.toFixed(0)}/100`,
      '',
      'Network:',
      `  Avg Latency: ${report.network.avgLatency.toFixed(0)}ms`,
      `  Peak Latency: ${report.network.peakLatency.toFixed(0)}ms`,
      `  Total Requests: ${report.network.totalRequests}`,
      `  Avg Bandwidth: ${(report.network.avgBandwidth / 1024 / 1024).toFixed(2)}MB/s`,
      '',
      'Data Flow:',
      `  HUD Update Latency: ${report.dataFlow.hudAvgLatency.toFixed(0)}ms`,
      `  Commentary Latency: ${report.dataFlow.commentaryAvgLatency.toFixed(0)}ms`,
      `  Decision Latency: ${report.dataFlow.decisionAvgLatency.toFixed(0)}ms`,
      `  Replay Latency: ${report.dataFlow.replayAvgLatency.toFixed(0)}ms`,
      '',
    ];

    if (report.issues.length > 0) {
      lines.push('ISSUES:');
      const critical = report.issues.filter((i) => i.severity === 'critical');
      const high = report.issues.filter((i) => i.severity === 'high');
      const medium = report.issues.filter((i) => i.severity === 'medium');
      const low = report.issues.filter((i) => i.severity === 'low');

      if (critical.length > 0) {
        lines.push('  CRITICAL:');
        critical.forEach((i) => lines.push(`    - ${i.message}`));
      }
      if (high.length > 0) {
        lines.push('  HIGH:');
        high.forEach((i) => lines.push(`    - ${i.message}`));
      }
      if (medium.length > 0) {
        lines.push('  MEDIUM:');
        medium.forEach((i) => lines.push(`    - ${i.message}`));
      }
      if (low.length > 0) {
        lines.push('  LOW:');
        low.forEach((i) => lines.push(`    - ${i.message}`));
      }
      lines.push('');
    }

    if (report.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      report.recommendations.forEach((r) => lines.push(`  - ${r}`));
      lines.push('');
    }

    // Overall assessment
    const criticalIssues = report.issues.filter((i) => i.severity === 'critical').length;
    const highIssues = report.issues.filter((i) => i.severity === 'high').length;

    let assessment = '✅ PASS';
    if (criticalIssues > 0) {
      assessment = '❌ CRITICAL ISSUES';
    } else if (highIssues > 0) {
      assessment = '⚠️ NEEDS OPTIMIZATION';
    }

    lines.push(`Overall: ${assessment}`);

    return lines.join('\n');
  }
}

/**
 * Performance thresholds for acceptance criteria
 */
export const PERFORMANCE_THRESHOLDS = {
  cpu: {
    average: 50, // % max
    peak: 80, // % max
  },
  memory: {
    growth: 100 * 1024 * 1024, // Bytes max
  },
  ui: {
    minFps: 30,
    maxFrameTime: 100, // ms
    maxResponsiveness: 100, // 0-100 scale
  },
  network: {
    avgLatency: 500, // ms
    peakLatency: 2000, // ms
  },
  dataFlow: {
    hud: 100, // ms
    commentary: 200, // ms
    decision: 150, // ms
    replay: 300, // ms
  },
};
