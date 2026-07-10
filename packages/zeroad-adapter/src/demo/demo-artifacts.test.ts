import { describe, it, expect, beforeEach } from 'vitest';
import { DemoArtifacts as DemoArtifactsService } from './demo-artifacts.js';
import { Logger } from '../config/logger.js';
import type { SessionPackage } from '../session/session-recorder.js';

describe('DemoArtifacts', () => {
  let service: DemoArtifactsService;
  const logger = new Logger('error');

  beforeEach(() => {
    service = new DemoArtifactsService(logger);
  });

  describe('artifact generation', () => {
    it('should generate artifacts from session package', () => {
      const pkg: SessionPackage = {
        metadata: {
          matchId: 'test-match-1',
          map: 'alpine_mountains_3p',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 30s',
          ticks: 300,
          createdAt: '2026-07-10T13:00:00Z',
          recordedAt: '2026-07-10T13:01:00Z',
        },
        statistics: {
          totalEvents: 100,
          eventCounts: {
            'match:started': 1,
            'observation:received': 20,
            'decision:completed': 20,
            'command:executed': 20,
            'match:ended': 1,
          },
          timelineEntries: 62,
          totalDurationSeconds: 30,
        },
        config: {},
        timeline: {
          entries: [],
          startTime: '2026-07-10T13:00:00Z',
        },
        events: {
          entries: [
            { event: 'match:started', data: { matchId: 'test-match-1' } },
            { event: 'match:ended', data: { winner: { name: 'Winner' } } },
          ],
          statistics: {},
        },
        summary: {
          matchId: 'test-match-1',
          map: 'alpine_mountains_3p',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 30s',
          ticks: 300,
        },
      };

      const artifacts = service.generateArtifacts(pkg);

      expect(artifacts.matchId).toBe('test-match-1');
      expect(artifacts.timestamp).toBe('2026-07-10T13:01:00Z');
      expect(artifacts.replay.format).toBe('session-timeline-v1');
      expect(artifacts.replay.entries).toBe(62);
      expect(artifacts.telemetry.totalEvents).toBe(100);
      expect(artifacts.telemetry.duration).toBe(30);
      expect(artifacts.summary.map).toBe('alpine_mountains_3p');
      expect(artifacts.summary.players).toBe(2);
      expect(artifacts.summary.ticks).toBe(300);
    });

    it('should extract event type breakdown', () => {
      const pkg: SessionPackage = {
        metadata: {
          matchId: 'test-match-2',
          map: 'nomad_islands',
          players: 3,
          status: 'stopped',
          duration: '0h 1m 0s',
          ticks: 600,
          createdAt: '2026-07-10T13:00:00Z',
          recordedAt: '2026-07-10T13:02:00Z',
        },
        statistics: {
          totalEvents: 200,
          eventCounts: {
            'match:started': 1,
            'observation:received': 60,
            'decision:completed': 60,
            'command:executed': 60,
            'error:occurred': 5,
            'match:ended': 1,
          },
          timelineEntries: 187,
          totalDurationSeconds: 60,
        },
        config: {},
        timeline: {
          entries: [],
          startTime: '2026-07-10T13:00:00Z',
        },
        events: {
          entries: [],
          statistics: {},
        },
        summary: {
          matchId: 'test-match-2',
          map: 'nomad_islands',
          players: 3,
          status: 'stopped',
          duration: '0h 1m 0s',
          ticks: 600,
        },
      };

      const artifacts = service.generateArtifacts(pkg);

      expect(artifacts.telemetry.eventTypes['observation:received']).toBe(60);
      expect(artifacts.telemetry.eventTypes['decision:completed']).toBe(60);
      expect(artifacts.telemetry.eventTypes['command:executed']).toBe(60);
      expect(artifacts.telemetry.eventTypes['error:occurred']).toBe(5);
    });
  });

  describe('log generation', () => {
    it('should generate logs from session package', () => {
      const pkg: SessionPackage = {
        metadata: {
          matchId: 'log-test',
          map: 'test_map',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 10s',
          ticks: 100,
          createdAt: '2026-07-10T13:00:00Z',
          recordedAt: '2026-07-10T13:00:10Z',
        },
        statistics: {
          totalEvents: 50,
          eventCounts: {
            'match:started': 1,
            'decision:completed': 20,
            'match:ended': 1,
          },
          timelineEntries: 50,
          totalDurationSeconds: 10,
        },
        config: {},
        timeline: {
          entries: [],
          startTime: '2026-07-10T13:00:00Z',
        },
        events: {
          entries: [
            { event: 'match:started', data: { matchId: 'log-test' } },
            { event: 'decision:completed', data: { tick: 10 } },
            { event: 'decision:completed', data: { tick: 20 } },
            { event: 'match:ended', data: { winner: { name: 'TestWinner' }, duration: { seconds: 10, ticks: 100 } } },
          ],
          statistics: {},
        },
        summary: {
          matchId: 'log-test',
          map: 'test_map',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 10s',
          ticks: 100,
        },
      };

      const artifacts = service.generateArtifacts(pkg);

      expect(artifacts.logs.totalLines).toBeGreaterThan(0);
      expect(artifacts.logs.matchStart.length).toBeGreaterThan(0);
      expect(artifacts.logs.matchEnd.length).toBeGreaterThan(0);
    });

    it('should handle error events in logs', () => {
      const pkg: SessionPackage = {
        metadata: {
          matchId: 'error-log-test',
          map: 'test_map',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 5s',
          ticks: 50,
          createdAt: '2026-07-10T13:00:00Z',
          recordedAt: '2026-07-10T13:00:05Z',
        },
        statistics: {
          totalEvents: 20,
          eventCounts: { 'error:occurred': 2 },
          timelineEntries: 20,
          totalDurationSeconds: 5,
        },
        config: {},
        timeline: {
          entries: [],
          startTime: '2026-07-10T13:00:00Z',
        },
        events: {
          entries: [
            { event: 'match:started', data: {} },
            { event: 'error:occurred', data: { code: 'INVALID_CMD', message: 'Unknown command' } },
            { event: 'match:ended', data: {} },
          ],
          statistics: {},
        },
        summary: {
          matchId: 'error-log-test',
          map: 'test_map',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 5s',
          ticks: 50,
        },
      };

      const artifacts = service.generateArtifacts(pkg);

      expect(artifacts.logs.totalLines).toBeGreaterThan(0);
      // Error events should be captured in logs
    });
  });

  describe('report export', () => {
    it('should export artifacts as readable report', () => {
      const artifacts = {
        matchId: 'report-test',
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
            'decision:completed': 40,
            'command:executed': 40,
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
          winner: 'Player1',
          ticks: 300,
          duration: '0h 0m 30s',
        },
      };

      const report = service.exportReport(artifacts);

      expect(report).toContain('DEMO MATCH ARTIFACTS');
      expect(report).toContain('report-test');
      expect(report).toContain('REPLAY');
      expect(report).toContain('TELEMETRY');
      expect(report).toContain('MATCH SUMMARY');
      expect(report).toContain('Artifacts ready for broadcast!');
    });

    it('should include all event types in report', () => {
      const artifacts = {
        matchId: 'full-report',
        timestamp: '2026-07-10T13:00:00Z',
        replay: { format: 'session-timeline-v1', entries: 200, startTime: '2026-07-10T13:00:00Z' },
        telemetry: {
          totalEvents: 300,
          eventTypes: {
            'match:started': 1,
            'observation:received': 80,
            'decision:completed': 80,
            'command:executed': 80,
            'error:occurred': 5,
            'match:ended': 1,
          },
          duration: 60,
        },
        logs: {
          matchStart: '[00:00:00] MATCH STARTED',
          matchEnd: '[00:01:00] MATCH ENDED',
          totalLines: 200,
        },
        summary: {
          map: 'nomad_islands',
          players: 3,
          winner: 'NeuralRTS',
          ticks: 600,
          duration: '0h 1m 0s',
        },
      };

      const report = service.exportReport(artifacts);

      expect(report).toContain('observation:received');
      expect(report).toContain('decision:completed');
      expect(report).toContain('command:executed');
      expect(report).toContain('error:occurred');
      expect(report).toContain('300');
    });
  });

  describe('realistic scenario', () => {
    it('should generate complete artifact set from tournament match', () => {
      const pkg: SessionPackage = {
        metadata: {
          matchId: 'tournament-001',
          map: 'nomad_islands',
          players: 3,
          status: 'stopped',
          duration: '0h 2m 15s',
          ticks: 1350,
          createdAt: '2026-07-10T13:00:00Z',
          recordedAt: '2026-07-10T13:02:30Z',
        },
        statistics: {
          totalEvents: 450,
          eventCounts: {
            'match:started': 1,
            'observation:received': 135,
            'decision:completed': 135,
            'command:executed': 135,
            'error:occurred': 3,
            'match:ended': 1,
          },
          timelineEntries: 409,
          totalDurationSeconds: 135,
        },
        config: {
          players: [
            { name: 'NeuralRTS', civilization: 'Athens' },
            { name: 'Claude', civilization: 'Rome' },
            { name: 'Opponent', civilization: 'Carthage' },
          ],
        },
        timeline: {
          entries: [],
          startTime: '2026-07-10T13:00:00Z',
        },
        events: {
          entries: [
            { event: 'match:started', data: { matchId: 'tournament-001', players: 3 } },
            { event: 'observation:received', data: { tick: 50 } },
            { event: 'decision:completed', data: { confidence: 0.9 } },
            { event: 'command:executed', data: { action: 'build' } },
            { event: 'error:occurred', data: { code: 'TIMEOUT', message: 'Decision timeout' } },
            {
              event: 'match:ended',
              data: {
                winner: { name: 'NeuralRTS' },
                duration: { seconds: 135, ticks: 1350 },
              },
            },
          ],
          statistics: {},
        },
        summary: {
          matchId: 'tournament-001',
          map: 'nomad_islands',
          players: 3,
          status: 'stopped',
          duration: '0h 2m 15s',
          ticks: 1350,
        },
      };

      const artifacts = service.generateArtifacts(pkg);

      expect(artifacts.matchId).toBe('tournament-001');
      expect(artifacts.replay.entries).toBe(409);
      expect(artifacts.telemetry.totalEvents).toBe(450);
      expect(artifacts.telemetry.duration).toBe(135);
      expect(artifacts.summary.players).toBe(3);

      const report = service.exportReport(artifacts);
      expect(report).toContain('tournament-001');
      expect(report).toContain('nomad_islands');
      expect(report).toContain('450'); // total events
      expect(report).toContain('Artifacts ready for broadcast!');
    });
  });
});
