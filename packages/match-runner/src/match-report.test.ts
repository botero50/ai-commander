import { describe, it, expect } from 'vitest';
import { MatchReportGenerator, type MatchReport } from './match-report.js';
import type { MatchResult } from './ollama-match-executor.js';

const mockResult: MatchResult = {
  winner: null,
  totalTicks: 1000,
  duration: 60000,
  player1Stats: {
    commandsExecuted: 500,
    commandsFailed: 50,
    goalsCompleted: 10,
    averageLatencyMs: 1200,
  },
  player2Stats: {
    commandsExecuted: 450,
    commandsFailed: 75,
    goalsCompleted: 8,
    averageLatencyMs: 1400,
  },
};

describe('MatchReportGenerator', () => {
  it('should generate a valid match report', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report).toHaveProperty('matchId');
    expect(report).toHaveProperty('timestamp');
    expect(report).toHaveProperty('duration');
    expect(report).toHaveProperty('totalTicks');
    expect(report).toHaveProperty('winner');
    expect(report).toHaveProperty('player1');
    expect(report).toHaveProperty('player2');
    expect(report).toHaveProperty('gameMetrics');
    expect(report).toHaveProperty('analysis');
    expect(report).toHaveProperty('summary');
  });

  it('should calculate winner correctly', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.winner).toBe('Player 1'); // Has more commands and goals
    expect(report.winnerScore).toBeGreaterThan(report.loserScore);
  });

  it('should calculate accuracy correctly', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    // Player 1: 500 / (500 + 50) = 90%
    expect(report.player1.accuracy).toBe(91); // With rounding
    // Player 2: 450 / (450 + 75) = 85.7%
    expect(report.player2.accuracy).toBeGreaterThan(80);
  });

  it('should include player models', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.player1.model).toBe('mistral');
    expect(report.player2.model).toBe('llama2');
  });

  it('should generate economy timeline', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.gameMetrics.economyTimeline).toBeDefined();
    expect(report.gameMetrics.economyTimeline.length).toBeGreaterThan(0);
    expect(report.gameMetrics.economyTimeline[0]).toHaveProperty('tick');
    expect(report.gameMetrics.economyTimeline[0]).toHaveProperty('economyP1');
    expect(report.gameMetrics.economyTimeline[0]).toHaveProperty('economyP2');
  });

  it('should generate military timeline', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.gameMetrics.militaryTimeline).toBeDefined();
    expect(report.gameMetrics.militaryTimeline.length).toBeGreaterThan(0);
    expect(report.gameMetrics.militaryTimeline[0]).toHaveProperty('militaryStrengthP1');
    expect(report.gameMetrics.militaryTimeline[0]).toHaveProperty('militaryStrengthP2');
  });

  it('should format as markdown', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');
    const markdown = MatchReportGenerator.formatMarkdown(report);

    expect(markdown).toContain('# Match Report');
    expect(markdown).toContain('match-001');
    expect(markdown).toContain('Result');
    expect(markdown).toContain('Player 1');
    expect(markdown).toContain('Player 2');
    expect(markdown).toContain('Game Metrics');
  });

  it('should format as JSON', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');
    const json = MatchReportGenerator.formatJSON(report);

    const parsed = JSON.parse(json);
    expect(parsed.matchId).toBe('match-001');
    expect(parsed.player1.model).toBe('mistral');
    expect(parsed.gameMetrics).toBeDefined();
  });

  it('should handle draw scenario', () => {
    const drawResult: MatchResult = {
      ...mockResult,
      player1Stats: {
        ...mockResult.player1Stats,
        commandsExecuted: 500,
        goalsCompleted: 10,
      },
      player2Stats: {
        ...mockResult.player2Stats,
        commandsExecuted: 500,
        goalsCompleted: 10,
      },
    };

    const report = MatchReportGenerator.generateReport('match-draw', drawResult, 'mistral', 'llama2');

    expect(report.winner).toBe('Draw');
  });

  it('should include total commands in metrics', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.gameMetrics.totalCommandsExecuted).toBe(
      mockResult.player1Stats.commandsExecuted + mockResult.player2Stats.commandsExecuted
    );
  });

  it('should include failed commands in metrics', () => {
    const report = MatchReportGenerator.generateReport('match-001', mockResult, 'mistral', 'llama2');

    expect(report.gameMetrics.totalCommandsFailed).toBe(
      mockResult.player1Stats.commandsFailed + mockResult.player2Stats.commandsFailed
    );
  });
});
