import type { AgentMetrics } from './types/agent-metrics.js';
export declare class MetricsCollector {
    private ticksExecuted;
    private decisionsExecuted;
    private commandsExecuted;
    private planningTimes;
    private decisionTimes;
    private errorsEncountered;
    private lastTickTimestamp;
    recordTick(): void;
    recordPlanning(durationMs: number): void;
    recordDecision(durationMs: number): void;
    recordCommandExecution(success: boolean): void;
    recordError(): void;
    getMetrics(): AgentMetrics;
}
//# sourceMappingURL=agent-metrics.d.ts.map