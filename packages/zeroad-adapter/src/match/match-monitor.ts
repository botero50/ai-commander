import { WorldState, Command } from '@ai-commander/domain';
import { Match } from './match.js';
import { MatchTelemetry, TelemetryMetrics } from './match-telemetry.js';
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

export class MatchMonitor {
  private match: Match;
  private logger: Logger;
  private config: MonitorConfig;
  private telemetry: MatchTelemetry;
  private lastCheckpoint: number = Date.now();
  private observationCount: number = 0;
  private commandCount: number = 0;
  private errorCount: number = 0;
  private stateHistory: MatchState[] = [];
  private maxStateHistory: number = 1000;

  constructor(match: Match, config: MonitorConfig, logger: Logger) {
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

  recordObservation(worldState: WorldState): void {
    this.observationCount++;

    if (this.config.enableTelemetry) {
      this.telemetry.recordSnapshot(worldState);
    }

    if (this.config.enableStateTracking) {
      this.trackState(worldState);
    }

    this.checkHealth(worldState);
  }

  recordCommands(commands: Command[]): void {
    this.commandCount += commands.length;
  }

  recordError(error: Error): void {
    this.errorCount++;
    this.logger.warn('Match monitor recorded error', {
      matchId: this.match.matchId,
      errorCount: this.errorCount,
      message: error.message,
    });
  }

  private trackState(worldState: WorldState): void {
    const state: MatchState = {
      tick: worldState.time.currentTick.number,
      timestamp: Date.now(),
      playerCount: worldState.players.length,
      unitCount: worldState.agents.filter((a) => (a.customData as any)?.type === 'unit').length,
      buildingCount: worldState.agents.filter((a) => (a.customData as any)?.type === 'building').length,
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

  private checkHealth(worldState: WorldState): void {
    const now = Date.now();
    if (now - this.lastCheckpoint < this.config.checkpointIntervalMs!) {
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

  getStateHistory(): MatchState[] {
    return [...this.stateHistory];
  }

  getTelemetryMetrics(): TelemetryMetrics {
    return this.telemetry.getMetrics();
  }

  isHealthy(): boolean {
    return this.errorCount === 0 && this.observationCount > 0;
  }

  reset(): void {
    this.observationCount = 0;
    this.commandCount = 0;
    this.errorCount = 0;
    this.stateHistory = [];
    this.telemetry.clear();
  }
}
