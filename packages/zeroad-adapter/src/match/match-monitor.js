import { MatchTelemetry } from './match-telemetry.js';
export class MatchMonitor {
    constructor(match, config, logger) {
        this.lastCheckpoint = Date.now();
        this.observationCount = 0;
        this.commandCount = 0;
        this.errorCount = 0;
        this.stateHistory = [];
        this.maxStateHistory = 1000;
        this.match = match;
        this.logger = logger;
        this.config = {
            enableTelemetry: true,
            enableStateTracking: true,
            checkpointIntervalMs: 5000,
            ...config,
        };
        this.telemetry = new MatchTelemetry();
    }
    recordObservation(worldState) {
        this.observationCount++;
        if (this.config.enableTelemetry) {
            this.telemetry.recordSnapshot(worldState);
        }
        if (this.config.enableStateTracking) {
            this.trackState(worldState);
        }
        this.checkHealth(worldState);
    }
    recordCommands(commands) {
        this.commandCount += commands.length;
    }
    recordError(error) {
        this.errorCount++;
        this.logger.warn('Match monitor recorded error', {
            matchId: this.match.matchId,
            errorCount: this.errorCount,
            message: error.message,
        });
    }
    trackState(worldState) {
        const state = {
            tick: worldState.time.currentTick.number,
            timestamp: Date.now(),
            playerCount: worldState.players.length,
            unitCount: worldState.agents.filter((a) => a.customData?.type === 'unit').length,
            buildingCount: worldState.agents.filter((a) => a.customData?.type === 'building').length,
            isHealthy: true,
            issues: [],
        };
        // Detect anomalies
        const lastState = this.stateHistory[this.stateHistory.length - 1];
        if (lastState) {
            if (state.unitCount === 0 && lastState.unitCount > 0) {
                state.issues.push('All units eliminated');
            }
            if (state.unitCount > lastState.unitCount * 2) {
                state.issues.push('Unit count doubled in one tick');
            }
        }
        state.isHealthy = state.issues.length === 0 && this.errorCount === 0;
        this.stateHistory.push(state);
        if (this.stateHistory.length > this.maxStateHistory) {
            this.stateHistory.shift();
        }
    }
    checkHealth(worldState) {
        const now = Date.now();
        if (now - this.lastCheckpoint < this.config.checkpointIntervalMs) {
            return;
        }
        this.lastCheckpoint = now;
        const metrics = this.telemetry.getMetrics();
        const isHealthy = this.errorCount === 0 && worldState.agents.length > 0;
        this.logger.debug('Match health checkpoint', {
            matchId: this.match.matchId,
            tick: worldState.time.currentTick.number,
            observations: this.observationCount,
            commands: this.commandCount,
            errors: this.errorCount,
            agents: worldState.agents.length,
            isHealthy,
            telemetry: {
                avgUnits: metrics.averageUnitCount,
                avgBuildings: metrics.averageBuildingCount,
                unitTrend: metrics.unitCountTrend,
            },
        });
    }
    getMetrics() {
        return {
            observationCount: this.observationCount,
            commandCount: this.commandCount,
            errorCount: this.errorCount,
            telemetry: this.telemetry.getMetrics(),
            lastState: this.stateHistory[this.stateHistory.length - 1],
        };
    }
    getStateHistory() {
        return [...this.stateHistory];
    }
    getTelemetryMetrics() {
        return this.telemetry.getMetrics();
    }
    isHealthy() {
        return this.errorCount === 0 && this.observationCount > 0;
    }
    reset() {
        this.observationCount = 0;
        this.commandCount = 0;
        this.errorCount = 0;
        this.stateHistory = [];
        this.telemetry.clear();
    }
}
//# sourceMappingURL=match-monitor.js.map