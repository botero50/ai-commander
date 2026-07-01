import type { AgentMetrics } from './types/agent-metrics.js';

export class MetricsCollector {
  private ticksExecuted = 0;
  private decisionsExecuted = 0;
  private commandsExecuted = 0;
  private planningTimes: number[] = [];
  private decisionTimes: number[] = [];
  private errorsEncountered = 0;
  private lastTickTimestamp = 0;

  recordTick(): void {
    this.ticksExecuted++;
    this.lastTickTimestamp = Date.now();
  }

  recordPlanning(durationMs: number): void {
    this.planningTimes.push(durationMs);
  }

  recordDecision(durationMs: number): void {
    this.decisionsExecuted++;
    this.decisionTimes.push(durationMs);
  }

  recordCommandExecution(success: boolean): void {
    if (success) {
      this.commandsExecuted++;
    }
  }

  recordError(): void {
    this.errorsEncountered++;
  }

  getMetrics(): AgentMetrics {
    const averagePlanningTimeMs =
      this.planningTimes.length > 0
        ? this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length
        : 0;

    const averageDecisionTimeMs =
      this.decisionTimes.length > 0
        ? this.decisionTimes.reduce((a, b) => a + b, 0) / this.decisionTimes.length
        : 0;

    return Object.freeze({
      ticksExecuted: this.ticksExecuted,
      decisionsExecuted: this.decisionsExecuted,
      commandsExecuted: this.commandsExecuted,
      averagePlanningTimeMs,
      averageDecisionTimeMs,
      errorsEncountered: this.errorsEncountered,
      lastTickTimestamp: this.lastTickTimestamp,
    });
  }
}
