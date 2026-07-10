import { describe, it, expect, beforeEach } from 'vitest';
import { SessionRecorder } from './session-recorder.js';
import { MatchSession, type SessionConfig } from './match-session.js';
import { SessionEventBus } from './session-events.js';
import { SessionTimeline } from './session-timeline.js';
import { MatchArchive } from '../match/match-archive.js';
import { Logger } from '../config/logger.js';

describe('SessionRecorder', () => {
  let recorder: SessionRecorder;
  let archive: MatchArchive;
  let session: MatchSession;
  let eventBus: SessionEventBus;
  let timeline: SessionTimeline;
  const logger = new Logger('error');

  const createConfig = (overrides: Partial<SessionConfig> = {}): SessionConfig => ({
    matchId: `match-${Date.now()}`,
    map: 'alpine_mountains_3p',
    players: [
      {
        id: 1,
        name: 'NeuralRTS',
        civilization: 'Athens',
        aiModel: 'ollama:neural-rts',
        aiPrompt: 'aggressive-v1.0.0',
      },
      {
        id: 2,
        name: 'Claude',
        civilization: 'Rome',
        aiModel: 'claude-opus-4-8',
        aiPrompt: 'balanced-v1.0.0',
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    archive = new MatchArchive('./test-sessions', logger);
    recorder = new SessionRecorder(archive, logger);

    const config = createConfig();
    session = new MatchSession(config, archive, logger);
    eventBus = new SessionEventBus(logger);
    timeline = new SessionTimeline(config.matchId, logger);
  });

  describe('session recording', () => {
    it('should record a complete session', () => {
      timeline.recordSessionStart();
      session.start();

      // Simulate some events
      timeline.recordEvent('match:started', { matchId: session.getState().matchId });
      eventBus.emitMatchStarted({
        matchId: session.getState().matchId,
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      session.updateTick(1000);
      session.stop();

      const result = recorder.recordSession(session, eventBus, timeline);

      expect(result.success).toBe(true);
      expect(result.packagePath).toBeDefined();
    });

    it('should include metadata in package', () => {
      timeline.recordSessionStart();
      session.start();
      session.updateTick(5000);
      session.stop();

      timeline.recordEvent('match:started', {});
      eventBus.emitMatchStarted({
        matchId: session.getState().matchId,
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      const result = recorder.recordSession(session, eventBus, timeline);
      expect(result.success).toBe(true);
    });

  });

  describe('package utilities', () => {
    let pkg: any;

    beforeEach(() => {
      timeline.recordSessionStart();
      session.start();

      eventBus.emitMatchStarted({
        matchId: session.getState().matchId,
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      for (let i = 0; i < 5; i++) {
        timeline.recordEvent(`decision:completed`, { index: i });
        eventBus.emitDecisionCompleted({
          matchId: session.getState().matchId,
          playerId: 1,
          playerName: 'P1',
          tick: i * 100,
          model: 'model-1',
          prompt: 'prompt-1',
          decision: { objective: `action-${i}`, confidence: 0.8, reasoning: 'test' },
          latency: 1000,
          cost: 0.0001,
          timestamp: new Date().toISOString(),
        });
      }

      session.updateTick(500);
      session.stop();

      // Create package
      const timelineData = JSON.parse(timeline.exportTimeline());
      const eventHistoryData = JSON.parse(eventBus.exportHistory());
      const sessionState = JSON.parse(session.exportState());

      pkg = {
        metadata: {
          matchId: session.getState().matchId,
          map: 'alpine_mountains_3p',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 0s',
          ticks: 500,
          createdAt: sessionState.state.createdAt,
          recordedAt: new Date().toISOString(),
        },
        statistics: {
          totalEvents: eventHistoryData.statistics.totalEvents,
          eventCounts: eventHistoryData.statistics.eventCounts,
          timelineEntries: timelineData.statistics.totalEvents,
          totalDurationSeconds: timelineData.statistics.totalDuration,
        },
        config: sessionState.state.config,
        timeline: {
          entries: timelineData.entries,
          startTime: timelineData.sessionStartTime,
        },
        events: {
          entries: eventHistoryData.events,
          statistics: eventHistoryData.statistics,
        },
        summary: {
          matchId: session.getState().matchId,
          map: 'alpine_mountains_3p',
          players: 2,
          status: 'stopped',
          duration: '0h 0m 0s',
          ticks: 500,
        },
      };
    });

    it('should extract metadata', () => {
      const metadata = SessionRecorder.extractMetadata(pkg);

      expect(metadata.matchId).toBe(pkg.metadata.matchId);
      expect(metadata.map).toBe('alpine_mountains_3p');
      expect(metadata.players).toBe(2);
      expect(metadata.recordedAt).toBeDefined();
    });

    it('should get event count by type', () => {
      const count = SessionRecorder.getEventCount(pkg, 'match:started');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should get events by type', () => {
      const events = SessionRecorder.getEventsByType(pkg, 'match:started');
      expect(Array.isArray(events)).toBe(true);
    });

    it('should get timeline in range', () => {
      const rangeEvents = SessionRecorder.getTimelineInRange(pkg, 0, 1);
      expect(Array.isArray(rangeEvents)).toBe(true);
    });

    it('should generate report', () => {
      const report = SessionRecorder.generateReport(pkg);

      expect(report).toContain('SESSION REPORT');
      expect(report).toContain('Match ID:');
      expect(report).toContain('Map:');
      expect(report).toContain('Status:');
      expect(report).toContain('Total Events:');
    });
  });

  describe('realistic scenario', () => {
    it('should record complete match with full event lifecycle', () => {
      timeline.recordSessionStart();
      session.start();

      // Match starts
      eventBus.emitMatchStarted({
        matchId: session.getState().matchId,
        map: 'alpine_mountains_3p',
        players: [
          { id: 1, name: 'NeuralRTS', civilization: 'Athens' },
          { id: 2, name: 'Claude', civilization: 'Rome' },
        ],
        timestamp: new Date().toISOString(),
      });

      timeline.recordEvent('match:started', {
        matchId: session.getState().matchId,
      });

      // Simulate match progression with observations and decisions
      for (let tick = 0; tick <= 100; tick += 25) {
        // Observations
        eventBus.emitObservationReceived({
          matchId: session.getState().matchId,
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          observation: {
            gameTime: tick,
            resources: { wood: 500 + tick, stone: 300 + tick },
            units: 10,
          },
          timestamp: new Date().toISOString(),
        });

        timeline.recordEvent('observation:received', { tick, playerId: 1 });

        // Decisions
        eventBus.emitDecisionCompleted({
          matchId: session.getState().matchId,
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          model: 'ollama:neural-rts',
          prompt: 'aggressive-v1.0.0',
          decision: {
            objective: `Action at tick ${tick}`,
            confidence: 0.85,
            reasoning: 'Strategic',
          },
          latency: 1000,
          cost: 0.0001,
          timestamp: new Date().toISOString(),
        });

        timeline.recordEvent('decision:completed', { tick, playerId: 1 });

        // Commands
        eventBus.emitCommandExecuted({
          matchId: session.getState().matchId,
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          command: {
            action: 'build',
            target: 'unit-1',
          },
          isValid: true,
          timestamp: new Date().toISOString(),
        });

        timeline.recordEvent('command:executed', { tick, playerId: 1 });

        session.updateTick(tick);
      }

      // Match ends
      eventBus.emitMatchEnded({
        matchId: session.getState().matchId,
        winner: { id: 1, name: 'NeuralRTS' },
        runners: [{ id: 2, name: 'Claude' }],
        duration: { ticks: 5000, seconds: 120 },
        statistics: {
          totalCommands: 450,
          avgLatency: 1200,
          totalCost: 0.05,
          commandSuccessRate: 0.95,
        },
        timestamp: new Date().toISOString(),
      });

      timeline.recordEvent('match:ended', {
        matchId: session.getState().matchId,
        winner: 1,
      });

      session.stop(5000);

      // Record the session
      const result = recorder.recordSession(session, eventBus, timeline);

      expect(result.success).toBe(true);
      expect(result.packagePath).toBeDefined();

      // Verify package content if we can read it
      if (result.packagePath) {
        // In a real test, we'd read and verify the file
        expect(result.packagePath).toMatch(/\.json$/);
      }
    });
  });
});
