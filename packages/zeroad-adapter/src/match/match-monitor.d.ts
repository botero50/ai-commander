import { WorldState, Command } from '@ai-commander/domain';
import { Match } from './match.js';
import { TelemetryMetrics } from './match-telemetry.js';
import { Logger } from '../config/logger.js';
export interface MonitorConfig {
    enableTelemetry?: boolean;
    enableStateTracking?: boolean;
    checkpointIntervalMs?: number;
}
export interface MatchState {
    tick: number;
    timestamp: number;
    playerCount: number;
    unitCount: number;
    buildingCount: number;
    isHealthy: boolean;
    issues: string[];
}
export declare class MatchMonitor {
    private match;
    private logger;
    private config;
    private telemetry;
    private lastCheckpoint;
    private observationCount;
    private commandCount;
    private errorCount;
    private stateHistory;
    private maxStateHistory;
    constructor(match: Match, config: MonitorConfig, logger: Logger);
    recordObservation(worldState: WorldState): void;
    recordCommands(commands: Command[]): void;
    recordError(error: Error): void;
    private trackState;
    private checkHealth;
    getMetrics(): {
        observationCount: number;
        commandCount: number;
        errorCount: number;
        telemetry: TelemetryMetrics;
        lastState: MatchState;
    };
    getStateHistory(): MatchState[];
    getTelemetryMetrics(): TelemetryMetrics;
    isHealthy(): boolean;
    reset(): void;
}
//# sourceMappingURL=match-monitor.d.ts.map