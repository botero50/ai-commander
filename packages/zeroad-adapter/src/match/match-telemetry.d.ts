import { WorldState } from '@ai-commander/domain';
export interface TelemetrySnapshot {
    timestamp: number;
    tick: number;
    playerCount: number;
    unitCount: number;
    buildingCount: number;
    agentCount: number;
    customData?: Record<string, unknown>;
}
export interface TelemetryMetrics {
    snapshotCount: number;
    averageUnitCount: number;
    averageBuildingCount: number;
    maxUnitCount: number;
    maxBuildingCount: number;
    minUnitCount: number;
    minBuildingCount: number;
    unitCountTrend: 'increasing' | 'decreasing' | 'stable';
    buildingCountTrend: 'increasing' | 'decreasing' | 'stable';
    timeSpanMs: number;
}
export declare class MatchTelemetry {
    private snapshots;
    private maxSnapshots;
    recordSnapshot(worldState: WorldState): TelemetrySnapshot;
    getLatestSnapshot(): TelemetrySnapshot | undefined;
    getSnapshot(tick: number): TelemetrySnapshot | undefined;
    getAllSnapshots(): TelemetrySnapshot[];
    getMetrics(): TelemetryMetrics;
    clear(): void;
    getSnapshotCount(): number;
}
//# sourceMappingURL=match-telemetry.d.ts.map