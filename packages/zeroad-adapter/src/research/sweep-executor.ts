/**
 * Story 51.2 — Parameter Sweep Execution
 *
 * Execute parameter sweeps with real match generation.
 * Support multiple prompts, models, temperatures, and maps.
 * Store every generated match.
 */

import { Logger } from '../config/logger.js';
import { ParameterSweeper, type SweepConfiguration } from './parameter-sweeps.js';
import { MatchArchive } from '../match/match-archive.js';

export interface SweepExecutionConfig {
  sweepId: string;
  experimentId: string;
  modelA: string;
  modelB: string;
  promptVersions: string[];
  temperatures: number[];
  maps: string[];
  matchesPerConfiguration: number;
  maxConcurrent?: number;
}

export interface SweepExecution {
  sweepId: string;
  status: 'initialized' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  totalMatchesPlanned: number;
  totalMatchesCompleted: number;
  totalMatchesFailed: number;
  archiveDirectory: string;
  results: {
    configurationId: string;
    matchCount: number;
    avgWinRate: number;
    avgLatency: number;
    avgCost: number;
    configurations: {
      prompt: string;
      temperature: number;
      map: string;
      modelA: string;
      modelB: string;
    };
  }[];
}

export interface ExecutionResult {
  matchId: string;
  configurationId: string;
  outcome: {
    winner: number;
    duration: number;
    latency: number;
    commands: number;
  };
  error?: string;
}

export class SweepExecutor {
  private sweeper: ParameterSweeper;
  private archive: MatchArchive;
  private logger: Logger;
  private executions: Map<string, SweepExecution> = new Map();

  constructor(sweeper: ParameterSweeper, archive: MatchArchive, logger: Logger) {
    this.sweeper = sweeper;
    this.archive = archive;
    this.logger = logger;
  }

  /**
   * Plan a sweep execution
   */
  planExecution(config: SweepExecutionConfig): SweepExecution {
    const configurations = this.generateConfigurations(config);
    const totalMatches = configurations.length * config.matchesPerConfiguration;

    const execution: SweepExecution = {
      sweepId: config.sweepId,
      status: 'initialized',
      startTime: new Date().toISOString(),
      totalMatchesPlanned: totalMatches,
      totalMatchesCompleted: 0,
      totalMatchesFailed: 0,
      archiveDirectory: `./matches/${new Date().toISOString().split('T')[0]}/sweep-${config.sweepId}`,
      results: configurations.map(cfg => ({
        configurationId: `${cfg.prompt}-${cfg.temperature}-${cfg.map}`,
        matchCount: 0,
        avgWinRate: 0,
        avgLatency: 0,
        avgCost: 0,
        configurations: cfg,
      })),
    };

    this.executions.set(config.sweepId, execution);

    this.logger.info('Sweep execution planned', {
      sweepId: config.sweepId,
      totalMatches: totalMatches,
      configurations: configurations.length,
    });

    return execution;
  }

  /**
   * Generate all configurations from parameters
   */
  private generateConfigurations(
    config: SweepExecutionConfig
  ): Array<{
    prompt: string;
    temperature: number;
    map: string;
    modelA: string;
    modelB: string;
  }> {
    const configurations: Array<{
      prompt: string;
      temperature: number;
      map: string;
      modelA: string;
      modelB: string;
    }> = [];

    for (const prompt of config.promptVersions) {
      for (const temp of config.temperatures) {
        for (const map of config.maps) {
          configurations.push({
            prompt,
            temperature: temp,
            map,
            modelA: config.modelA,
            modelB: config.modelB,
          });
        }
      }
    }

    return configurations;
  }

  /**
   * Record match result from execution
   */
  recordExecutionResult(sweepId: string, result: ExecutionResult): boolean {
    const execution = this.executions.get(sweepId);
    if (!execution) return false;

    execution.totalMatchesCompleted++;

    if (result.error) {
      execution.totalMatchesFailed++;
    } else {
      const configResult = execution.results.find(
        r => r.configurationId === result.configurationId
      );

      if (configResult) {
        const prevCount = configResult.matchCount;
        configResult.matchCount++;

        // Running average
        configResult.avgWinRate =
          (configResult.avgWinRate * prevCount + (result.outcome.winner === 1 ? 1 : 0)) /
          configResult.matchCount;
        configResult.avgLatency =
          (configResult.avgLatency * prevCount + result.outcome.latency) / configResult.matchCount;
        configResult.avgCost =
          (configResult.avgCost * prevCount + (result.outcome.commands * 0.001)) /
          configResult.matchCount;
      }
    }

    return true;
  }

  /**
   * Complete sweep execution
   */
  completeSweepExecution(sweepId: string): SweepExecution | null {
    const execution = this.executions.get(sweepId);
    if (!execution) return null;

    execution.status = 'completed';
    execution.endTime = new Date().toISOString();

    this.logger.info('Sweep execution completed', {
      sweepId,
      completed: execution.totalMatchesCompleted,
      failed: execution.totalMatchesFailed,
      duration: execution.endTime,
    });

    return execution;
  }

  /**
   * Get execution status
   */
  getExecution(sweepId: string): SweepExecution | null {
    return this.executions.get(sweepId) || null;
  }

  /**
   * Get execution progress
   */
  getProgress(sweepId: string): {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    percentComplete: number;
  } | null {
    const execution = this.executions.get(sweepId);
    if (!execution) return null;

    const inProgress = execution.totalMatchesPlanned - execution.totalMatchesCompleted;

    return {
      total: execution.totalMatchesPlanned,
      completed: execution.totalMatchesCompleted,
      failed: execution.totalMatchesFailed,
      inProgress,
      percentComplete: (execution.totalMatchesCompleted / execution.totalMatchesPlanned) * 100,
    };
  }

  /**
   * Get best configuration from execution
   */
  getBestConfiguration(sweepId: string): {
    configurationId: string;
    prompt: string;
    temperature: number;
    map: string;
    avgWinRate: number;
  } | null {
    const execution = this.executions.get(sweepId);
    if (!execution || execution.results.length === 0) return null;

    const best = execution.results.reduce((a, b) =>
      a.avgWinRate > b.avgWinRate ? a : b
    );

    return {
      configurationId: best.configurationId,
      prompt: best.configurations.prompt,
      temperature: best.configurations.temperature,
      map: best.configurations.map,
      avgWinRate: best.avgWinRate,
    };
  }

  /**
   * Export execution summary
   */
  exportSummary(sweepId: string): string | null {
    const execution = this.executions.get(sweepId);
    if (!execution) return null;

    const summary = {
      sweepId: execution.sweepId,
      status: execution.status,
      duration: {
        start: execution.startTime,
        end: execution.endTime,
      },
      statistics: {
        totalPlanned: execution.totalMatchesPlanned,
        totalCompleted: execution.totalMatchesCompleted,
        totalFailed: execution.totalMatchesFailed,
        successRate:
          (execution.totalMatchesCompleted / execution.totalMatchesPlanned) * 100,
      },
      bestConfiguration: this.getBestConfiguration(sweepId),
      configurations: execution.results
        .sort((a, b) => b.avgWinRate - a.avgWinRate)
        .slice(0, 5)
        .map(r => ({
          config: r.configurationId,
          matches: r.matchCount,
          winRate: r.avgWinRate.toFixed(3),
          latency: r.avgLatency.toFixed(0),
        })),
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Clear execution data (for testing)
   */
  clear(): void {
    this.executions.clear();
  }
}
