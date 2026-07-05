export interface GameplayMetrics {
  readonly economyEfficiency: number;
  readonly workerUtilization: number;
  readonly militaryStrength: number;
  readonly apm: number;
  readonly resourceCollectionRate: number;
  readonly combatEfficiency: number;
  readonly totalScore: number;
}

export interface MetricsSnapshot {
  readonly tick: number;
  readonly metrics: GameplayMetrics;
}

export class GameplayMetricsCollector {
  private snapshots: MetricsSnapshot[] = [];
  private commandCount: number = 0;
  private startTick: number = -1;
  private lastTick: number = 0;
  private totalResourcesCollected: number = 0;
  private totalEnemiesKilled: number = 0;
  private totalUnitLosses: number = 0;
  private workerCount: number = 0;
  private militaryUnits: number = 0;

  recordCommand(): void {
    this.commandCount++;
  }

  recordResourceCollection(amount: number): void {
    this.totalResourcesCollected += amount;
  }

  recordEnemyKill(): void {
    this.totalEnemiesKilled++;
  }

  recordUnitLoss(): void {
    this.totalUnitLosses++;
  }

  updateUnitCounts(workers: number, military: number): void {
    this.workerCount = workers;
    this.militaryUnits = military;
  }

  computeMetrics(tick: number): GameplayMetrics {
    if (this.startTick === -1) {
      this.startTick = tick;
    }
    this.lastTick = tick;

    const elapsedTicks = Math.max(1, tick - this.startTick);
    const elapsedSeconds = elapsedTicks / 10; // 10 ticks per second
    const elapsedMinutes = elapsedSeconds / 60;

    // Economy efficiency: resources collected per minute
    const economyEfficiency = elapsedMinutes > 0 ? this.totalResourcesCollected / elapsedMinutes : 0;

    // Worker utilization: active workers as fraction of max (capped at 1)
    const workerUtilization = Math.min(1, this.workerCount / 5);

    // Military strength: normalized unit count
    const militaryStrength = Math.min(1, this.militaryUnits / 10);

    // APM: actions per minute
    const apm = elapsedMinutes > 0 ? this.commandCount / elapsedMinutes : this.commandCount * 10;

    // Resource collection rate per tick
    const resourceCollectionRate = elapsedTicks > 0 ? this.totalResourcesCollected / elapsedSeconds : 0;

    // Combat efficiency: kills vs losses
    const totalEngagements = this.totalEnemiesKilled + this.totalUnitLosses;
    const combatEfficiency = totalEngagements > 0 ? this.totalEnemiesKilled / totalEngagements : 0.5;

    // Total score: weighted average
    const totalScore =
      (economyEfficiency / 100) * 0.2 +
      workerUtilization * 0.15 +
      militaryStrength * 0.2 +
      (apm / 100) * 0.15 +
      resourceCollectionRate * 0.1 +
      combatEfficiency * 0.2;

    return {
      economyEfficiency,
      workerUtilization,
      militaryStrength,
      apm,
      resourceCollectionRate,
      combatEfficiency,
      totalScore: Math.min(1, totalScore),
    };
  }

  snapshot(tick: number): void {
    const metrics = this.computeMetrics(tick);
    this.snapshots.push({ tick, metrics });
  }

  getSnapshots(): readonly MetricsSnapshot[] {
    return this.snapshots;
  }

  getLatestMetrics(): GameplayMetrics {
    if (this.snapshots.length === 0) {
      return this.computeMetrics(this.lastTick);
    }
    return this.snapshots[this.snapshots.length - 1].metrics;
  }
}
