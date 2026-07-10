import { describe, it, expect, beforeEach } from 'vitest';
import { SweepExecutor } from './sweep-executor.js';
import { ParameterSweeper } from './parameter-sweeps.js';
import { MatchArchive } from '../match/match-archive.js';
import { Logger } from '../config/logger.js';

describe('SweepExecutor', () => {
  let executor: SweepExecutor;
  let sweeper: ParameterSweeper;
  let archive: MatchArchive;
  const logger = new Logger('error');

  beforeEach(() => {
    sweeper = new ParameterSweeper(logger);
    archive = new MatchArchive('./test-matches', logger);
    executor = new SweepExecutor(sweeper, archive, logger);
  });

  describe('execution planning', () => {
    it('should plan a sweep execution', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'ollama:neural-rts',
        modelB: 'claude-opus-4-8',
        promptVersions: ['prompt-v1.0.0', 'prompt-v1.1.0'],
        temperatures: [0.5, 1.0],
        maps: ['alpine_mountains_3p', 'nomad_islands'],
        matchesPerConfiguration: 2,
      });

      expect(execution.sweepId).toBe('sweep-1');
      expect(execution.status).toBe('initialized');
      // 2 prompts × 2 temps × 2 maps × 2 matches = 16
      expect(execution.totalMatchesPlanned).toBe(16);
      expect(execution.results.length).toBe(8);
    });

    it('should generate all configurations', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1', 'p2', 'p3'],
        temperatures: [0.5, 1.0],
        maps: ['map1', 'map2'],
        matchesPerConfiguration: 1,
      });

      // 3 prompts × 2 temps × 2 maps = 12
      expect(execution.results.length).toBe(12);
    });
  });

  describe('result recording', () => {
    it('should record execution result', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 1,
      });

      const configId = execution.results[0].configurationId;

      const recorded = executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: configId,
        outcome: {
          winner: 1,
          duration: 5000,
          latency: 1000,
          commands: 450,
        },
      });

      expect(recorded).toBe(true);
      expect(execution.totalMatchesCompleted).toBe(1);
    });

    it('should calculate running average win rate', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 3,
      });

      const configId = execution.results[0].configurationId;

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: configId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-2',
        configurationId: configId,
        outcome: { winner: 2, duration: 5000, latency: 1000, commands: 450 },
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-3',
        configurationId: configId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      const config = execution.results[0];
      expect(config.matchCount).toBe(3);
      expect(config.avgWinRate).toBeCloseTo(2 / 3, 2);
    });

    it('should track failed matches', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 2,
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: execution.results[0].configurationId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-2',
        configurationId: execution.results[0].configurationId,
        error: 'Timeout',
      });

      expect(execution.totalMatchesCompleted).toBe(2);
      expect(execution.totalMatchesFailed).toBe(1);
    });
  });

  describe('execution status', () => {
    it('should complete sweep execution', () => {
      executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 1,
      });

      const completed = executor.completeSweepExecution('sweep-1');

      expect(completed?.status).toBe('completed');
      expect(completed?.endTime).toBeDefined();
    });

    it('should track progress', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 4,
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: execution.results[0].configurationId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-2',
        configurationId: execution.results[0].configurationId,
        outcome: { winner: 2, duration: 5000, latency: 1000, commands: 450 },
      });

      const progress = executor.getProgress('sweep-1');

      expect(progress?.total).toBe(4);
      expect(progress?.completed).toBe(2);
      expect(progress?.inProgress).toBe(2);
      expect(progress?.percentComplete).toBeCloseTo(50, 0);
    });
  });

  describe('best configuration', () => {
    it('should identify best configuration', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1', 'p2'],
        temperatures: [0.5, 1.0],
        maps: ['map1'],
        matchesPerConfiguration: 1,
      });

      // Record results for first config (50% win rate)
      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: execution.results[0].configurationId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      // Record results for second config (100% win rate)
      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-2',
        configurationId: execution.results[1].configurationId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      const best = executor.getBestConfiguration('sweep-1');

      expect(best).toBeDefined();
      expect(best?.configurationId).toBe(execution.results[1].configurationId);
      expect(best?.avgWinRate).toBe(1);
    });
  });

  describe('export', () => {
    it('should export summary', () => {
      const execution = executor.planExecution({
        sweepId: 'sweep-1',
        experimentId: 'exp-1',
        modelA: 'model-a',
        modelB: 'model-b',
        promptVersions: ['p1'],
        temperatures: [0.5],
        maps: ['map1'],
        matchesPerConfiguration: 2,
      });

      executor.recordExecutionResult('sweep-1', {
        matchId: 'match-1',
        configurationId: execution.results[0].configurationId,
        outcome: { winner: 1, duration: 5000, latency: 1000, commands: 450 },
      });

      executor.completeSweepExecution('sweep-1');

      const summary = executor.exportSummary('sweep-1');

      expect(summary).toBeDefined();
      const data = JSON.parse(summary!);
      expect(data.sweepId).toBe('sweep-1');
      expect(data.status).toBe('completed');
    });
  });

  describe('realistic scenario', () => {
    it('should support full sweep execution workflow', () => {
      // Plan sweep: 2 prompts × 2 temps × 2 maps × 3 matches = 24 total
      const execution = executor.planExecution({
        sweepId: 'optimize-prompt',
        experimentId: 'prompt-tuning-1',
        modelA: 'ollama:neural-rts',
        modelB: 'claude-opus-4-8',
        promptVersions: ['aggressive-v1.0.0', 'defensive-v1.0.0'],
        temperatures: [0.5, 1.5],
        maps: ['alpine_mountains_3p', 'nomad_islands'],
        matchesPerConfiguration: 3,
      });

      expect(execution.totalMatchesPlanned).toBe(24);

      // Simulate match execution with varying results
      let matchCount = 0;
      for (const result of execution.results) {
        for (let i = 0; i < 3; i++) {
          matchCount++;
          const winner = Math.random() > 0.5 ? 1 : 2;

          executor.recordExecutionResult('optimize-prompt', {
            matchId: `match-${matchCount}`,
            configurationId: result.configurationId,
            outcome: {
              winner,
              duration: 5000,
              latency: 900 + Math.random() * 200,
              commands: 400 + Math.random() * 100,
            },
          });
        }
      }

      // Check progress
      const progress = executor.getProgress('optimize-prompt');
      expect(progress?.completed).toBe(24);
      expect(progress?.percentComplete).toBe(100);

      // Get best configuration
      const best = executor.getBestConfiguration('optimize-prompt');
      expect(best).toBeDefined();
      expect(best?.avgWinRate).toBeGreaterThan(0);

      // Complete and export
      executor.completeSweepExecution('optimize-prompt');
      const summary = executor.exportSummary('optimize-prompt');

      expect(summary).toBeDefined();
      const data = JSON.parse(summary!);
      expect(data.statistics.totalCompleted).toBe(24);
      expect(data.bestConfiguration).toBeDefined();
    });
  });
});
