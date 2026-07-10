import { describe, it, expect, beforeEach } from 'vitest';
import { DemoReport } from './demo-report.js';
import { Logger } from '../config/logger.js';
import type { DemoArtifacts } from './demo-artifacts.js';

describe('DemoReport', () => {
  let report: DemoReport;
  const logger = new Logger('error');

  beforeEach(() => {
    report = new DemoReport(logger);
  });

  describe('report generation', () => {
    it('should generate report from artifacts', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'test-match-1',
        timestamp: '2026-07-10T13:00:00Z',
        replay: {
          format: 'session-timeline-v1',
          entries: 100,
          startTime: '2026-07-10T13:00:00Z',
        },
        telemetry: {
          totalEvents: 100,
          eventTypes: {
            'match:started': 1,
            'observation:received': 30,
            'decision:completed': 30,
            'command:executed': 30,
            'match:ended': 1,
          },
          duration: 30,
        },
        logs: {
          matchStart: '[00:00:00] MATCH STARTED',
          matchEnd: '[00:00:30] MATCH ENDED',
          totalLines: 150,
        },
        summary: {
          map: 'alpine_mountains_3p',
          players: 2,
          winner: 'Player 1',
          ticks: 300,
          duration: '0h 0m 30s',
        },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.title).toContain('test-match-1');
      expect(reportData.timestamp).toBe('2026-07-10T13:00:00Z');
      expect(reportData.analysis.matchId).toBe('test-match-1');
      expect(reportData.analysis.duration).toBe(30);
      expect(reportData.analysis.playerCount).toBe(2);
      expect(reportData.analysis.totalEvents).toBe(100);
      expect(reportData.players.length).toBe(2);
      expect(reportData.insights.length).toBeGreaterThan(0);
      expect(reportData.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate event density', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'density-test',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 50, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 120,
          eventTypes: {},
          duration: 60,
        },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 100 },
        summary: {
          map: 'test_map',
          players: 1,
          winner: 'Winner',
          ticks: 600,
          duration: '1m',
        },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.analysis.eventDensity).toBeCloseTo(2, 1); // 120 events / 60s = 2/s
    });

    it('should calculate success rate', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'success-test',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 50, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 110,
          eventTypes: {
            'command:executed': 100,
            'error:occurred': 10,
          },
          duration: 30,
        },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 100 },
        summary: { map: 'test', players: 1, winner: 'W', ticks: 300, duration: '30s' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.analysis.successRate).toBeCloseTo(90, 0); // (100-10)/100 = 90%
    });
  });

  describe('insights generation', () => {
    it('should generate insights for quick match', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'quick-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 30, startTime: '2026-07-10T13:00:00Z' },
        telemetry: { totalEvents: 50, eventTypes: {}, duration: 15 },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 80 },
        summary: { map: 'test', players: 2, winner: 'W', ticks: 150, duration: '15s' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.insights.some(i => i.includes('Quick match'))).toBe(true);
    });

    it('should generate insights for extended match', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'long-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 300, startTime: '2026-07-10T13:00:00Z' },
        telemetry: { totalEvents: 500, eventTypes: {}, duration: 300 },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 400 },
        summary: { map: 'test', players: 2, winner: 'W', ticks: 3000, duration: '5m' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.insights.some(i => i.includes('Extended'))).toBe(true);
    });

    it('should flag errors', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'error-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 50, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 110,
          eventTypes: { 'error:occurred': 5 },
          duration: 30,
        },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 100 },
        summary: { map: 'test', players: 1, winner: 'W', ticks: 300, duration: '30s' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.insights.some(i => i.includes('error'))).toBe(true);
    });
  });

  describe('recommendations generation', () => {
    it('should recommend increased decision frequency for slow matches', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'slow-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 10, startTime: '2026-07-10T13:00:00Z' },
        telemetry: { totalEvents: 20, eventTypes: {}, duration: 60 },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 50 },
        summary: { map: 'test', players: 1, winner: 'W', ticks: 600, duration: '1m' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.recommendations.some(r => r.includes('decision frequency'))).toBe(true);
    });

    it('should recommend command validation improvements for high error rate', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'error-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 50, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 110,
          eventTypes: { 'command:executed': 100, 'error:occurred': 25 },
          duration: 30,
        },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 100 },
        summary: { map: 'test', players: 1, winner: 'W', ticks: 300, duration: '30s' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.recommendations.some(r => r.includes('command validation'))).toBe(true);
    });

    it('should provide nominal recommendation for good match', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'good-match',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 200, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 300,
          eventTypes: { 'command:executed': 300 }, // No errors = high success rate
          duration: 120,
        },
        logs: { matchStart: 'start', matchEnd: 'end', totalLines: 200 },
        summary: { map: 'test', players: 2, winner: 'W', ticks: 1200, duration: '2m' },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.recommendations.length).toBeGreaterThan(0);
      // Will have multiplay recommendation for 2 players
    });
  });

  describe('report export', () => {
    it('should export report as formatted text', () => {
      const reportData = {
        title: 'Match Report: test-match',
        timestamp: '2026-07-10T13:00:00Z',
        analysis: {
          matchId: 'test-match',
          duration: 30,
          playerCount: 2,
          totalEvents: 100,
          eventDensity: 3.33,
          successRate: 95,
          avgDecisionLatency: 1000,
          errorCount: 1,
        },
        players: [
          {
            playerId: 1,
            name: 'Player1',
            observations: 30,
            decisions: 30,
            commands: 30,
            avgConfidence: 0.85,
            successRate: 95,
          },
        ],
        insights: ['Quick match: Aggressive early game.', 'High activity detected.'],
        recommendations: ['No improvements recommended.'],
        summary: {
          map: 'alpine_mountains_3p',
          duration: '0h 0m 30s',
        },
      };

      const text = report.exportReport(reportData);

      expect(text).toContain('Match Report: test-match');
      expect(text).toContain('MATCH ANALYSIS');
      expect(text).toContain('PLAYER PERFORMANCE');
      expect(text).toContain('KEY INSIGHTS');
      expect(text).toContain('RECOMMENDATIONS');
      expect(text).toContain('Player 1');
      expect(text).toContain('alpine_mountains_3p');
    });
  });

  describe('realistic scenario', () => {
    it('should generate complete report for tournament match', () => {
      const artifacts: DemoArtifacts = {
        matchId: 'tournament-001',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 409, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 450,
          eventTypes: {
            'match:started': 1,
            'observation:received': 135,
            'decision:completed': 135,
            'command:executed': 135,
            'error:occurred': 3,
            'match:ended': 1,
          },
          duration: 135,
        },
        logs: {
          matchStart: '[00:00:00] MATCH STARTED',
          matchEnd: '[00:02:15] MATCH ENDED',
          totalLines: 300,
        },
        summary: {
          map: 'nomad_islands',
          players: 3,
          winner: 'NeuralRTS',
          ticks: 1350,
          duration: '0h 2m 15s',
        },
      };

      const reportData = report.generateReport(artifacts);

      expect(reportData.analysis.matchId).toBe('tournament-001');
      expect(reportData.analysis.duration).toBe(135);
      expect(reportData.analysis.playerCount).toBe(3);
      expect(reportData.players.length).toBe(3);
      expect(reportData.insights.length).toBeGreaterThan(0);
      expect(reportData.recommendations.length).toBeGreaterThan(0);

      const text = report.exportReport(reportData);

      expect(text).toContain('tournament-001');
      expect(text).toContain('nomad_islands');
      expect(text).toContain('135');
      expect(text).toMatch(/Player [123]/);
    });
  });
});
