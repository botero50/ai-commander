export class MetricsCollector {
    constructor() {
        this.ticksExecuted = 0;
        this.decisionsExecuted = 0;
        this.commandsExecuted = 0;
        this.planningTimes = [];
        this.decisionTimes = [];
        this.errorsEncountered = 0;
        this.lastTickTimestamp = 0;
    }
    recordTick() {
        this.ticksExecuted++;
        this.lastTickTimestamp = Date.now();
    }
    recordPlanning(durationMs) {
        this.planningTimes.push(durationMs);
    }
    recordDecision(durationMs) {
        this.decisionsExecuted++;
        this.decisionTimes.push(durationMs);
    }
    recordCommandExecution(success) {
        if (success) {
            this.commandsExecuted++;
        }
    }
    recordError() {
        this.errorsEncountered++;
    }
    getMetrics() {
        const averagePlanningTimeMs = this.planningTimes.length > 0
            ? this.planningTimes.reduce((a, b) => a + b, 0) / this.planningTimes.length
            : 0;
        const averageDecisionTimeMs = this.decisionTimes.length > 0
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
//# sourceMappingURL=agent-metrics.js.map