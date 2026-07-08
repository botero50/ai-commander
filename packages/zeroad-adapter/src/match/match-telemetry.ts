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

export class MatchTelemetry {
  private snapshots: TelemetrySnapshot[] = [];
  private maxSnapshots: number = 10000; // Keep last 10k snapshots

  recordSnapshot(worldState: WorldState): TelemetrySnapshot {
    const snapshot: TelemetrySnapshot = {
      timestamp: Date.now(),
      tick: worldState.time.currentTick.number,
      playerCount: worldState.players.length,
      unitCount: worldState.agents.filter((a) => (a.customData as any)?.type === 'unit').length,
      buildingCount: worldState.agents.filter((a) => (a.customData as any)?.type === 'building').length,
      agentCount: worldState.agents.length,
    };

    this.snapshots.push(snapshot);

    // Keep array bounded
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    return snapshot;
  }

  getLatestSnapshot(): TelemetrySnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1];
  }

  getSnapshot(tick: number): TelemetrySnapshot | undefined {
    return this.snapshots.find((s) => s.tick === tick);
  }

  getAllSnapshots(): TelemetrySnapshot[] {
    return [...this.snapshots];
  }

  getMetrics(): TelemetryMetrics {
    if (this.snapshots.length === 0) {
      return {
        snapshotCount: 0,
        averageUnitCount: 0,
        averageBuildingCount: 0,
        maxUnitCount: 0,
        maxBuildingCount: 0,
        minUnitCount: 0,
        minBuildingCount: 0,
        unitCountTrend: 'stable',
        buildingCountTrend: 'stable',
        timeSpanMs: 0,
      };
    }

    const unitCounts = this.snapshots.map((s) => s.unitCount);
    const buildingCounts = this.snapshots.map((s) => s.buildingCount);

    const avgUnitCount = unitCounts.reduce((a, b) => a + b, 0) / unitCounts.length;
    const avgBuildingCount = buildingCounts.reduce((a, b) => a + b, 0) / buildingCounts.length;

    const maxUnitCount = Math.max(...unitCounts);
    const maxBuildingCount = Math.max(...buildingCounts);
    const minUnitCount = Math.min(...unitCounts);
    const minBuildingCount = Math.min(...buildingCounts);

    // Calculate trend (first half vs second half)
    const midpoint = Math.floor(this.snapshots.length / 2);
    const firstHalfUnits = unitCounts.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfUnits = unitCounts.slice(midpoint).reduce((a, b) => a + b, 0) / (this.snapshots.length - midpoint);
    const unitCountTrend: 'increasing' | 'decreasing' | 'stable' =
      secondHalfUnits > firstHalfUnits * 1.1 ? 'increasing' : secondHalfUnits < firstHalfUnits * 0.9 ? 'decreasing' : 'stable';

    const firstHalfBuildings = buildingCounts.slice(0, midpoint).reduce((a, b) => a + b, 0) / midpoint;
    const secondHalfBuildings = buildingCounts.slice(midpoint).reduce((a, b) => a + b, 0) / (this.snapshots.length - midpoint);
    const buildingCountTrend: 'increasing' | 'decreasing' | 'stable' =
      secondHalfBuildings > firstHalfBuildings * 1.1
        ? 'increasing'
        : secondHalfBuildings < firstHalfBuildings * 0.9
          ? 'decreasing'
          : 'stable';

    const timeSpanMs = this.snapshots[this.snapshots.length - 1].timestamp - this.snapshots[0].timestamp;

    return {
      snapshotCount: this.snapshots.length,
      averageUnitCount: parseFloat(avgUnitCount.toFixed(1)),
      averageBuildingCount: parseFloat(avgBuildingCount.toFixed(1)),
      maxUnitCount,
      maxBuildingCount,
      minUnitCount,
      minBuildingCount,
      unitCountTrend,
      buildingCountTrend,
      timeSpanMs,
    };
  }

  clear(): void {
    this.snapshots = [];
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}
