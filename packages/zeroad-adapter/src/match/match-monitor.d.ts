/**
 * DEPRECATED: MatchMonitor has been partially moved to the framework as ExecutionMonitor and StateMetrics.
 *
 * This adapter maintains backward-compatible MatchMonitor exports for existing code.
 *
 * Re-export and wrap framework components for backward compatibility.
 */
export { ExecutionMonitor as MatchMonitor } from '@ai-commander/adapter';
export type { ExecutionMonitorConfig as MonitorConfig, ExecutionMetrics as MatchMetrics } from '@ai-commander/adapter';
/**
 * Type aliases for backward compatibility with game-specific types.
 * Game-specific state tracking has been removed; use the underlying ExecutionMonitor.
 */
export interface MatchState {
    tick: number;
    timestamp: number;
    playerCount: number;
    unitCount: number;
    buildingCount: number;
    isHealthy: boolean;
    issues: string[];
}
//# sourceMappingURL=match-monitor.d.ts.map