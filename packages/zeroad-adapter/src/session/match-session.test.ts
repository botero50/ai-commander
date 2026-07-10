import { describe, it, expect, beforeEach } from 'vitest';
import { MatchSession, type SessionConfig } from './match-session.js';
import { MatchArchive } from '../match/match-archive.js';
import { Logger } from '../config/logger.js';

describe('MatchSession', () => {
  let session: MatchSession;
  let archive: MatchArchive;
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
    const config = createConfig();
    session = new MatchSession(config, archive, logger);
  });

  describe('session creation', () => {
    it('should create a session in created state', () => {
      const state = session.getState();

      expect(state.status).toBe('created');
      expect(state.createdAt).toBeDefined();
      expect(state.elapsedSeconds).toBe(0);
      expect(state.currentTick).toBe(0);
    });

    it('should track session configuration', () => {
      const state = session.getState();

      expect(state.config.map).toBe('alpine_mountains_3p');
      expect(state.config.players.length).toBe(2);
    });
  });

  describe('session lifecycle', () => {
    it('should transition from created to started', () => {
      const started = session.start();

      expect(started).toBe(true);

      const state = session.getState();
      expect(state.status).toBe('started');
      expect(state.startedAt).toBeDefined();
    });

    it('should not start if already started', () => {
      session.start();
      const started = session.start();

      expect(started).toBe(false);
    });

    it('should pause and resume', () => {
      session.start();

      const paused = session.pause();
      expect(paused).toBe(true);
      expect(session.isPaused()).toBe(true);

      const resumed = session.resume();
      expect(resumed).toBe(true);
      expect(session.isRunning()).toBe(true);
    });

    it('should not pause if not running', () => {
      const paused = session.pause();
      expect(paused).toBe(false);
    });

    it('should stop the session', () => {
      session.start();

      const stopped = session.stop(5000);
      expect(stopped).toBe(true);

      const state = session.getState();
      expect(state.status).toBe('stopped');
      expect(state.stoppedAt).toBeDefined();
      expect(state.currentTick).toBe(5000);
    });

    it('should not stop if not running', () => {
      const stopped = session.stop();
      expect(stopped).toBe(false);
    });
  });

  describe('tick tracking', () => {
    it('should update tick counter', () => {
      session.start();

      session.updateTick(1000);
      let state = session.getState();
      expect(state.currentTick).toBe(1000);

      session.updateTick(2000);
      state = session.getState();
      expect(state.currentTick).toBe(2000);
    });

    it('should preserve tick on stop', () => {
      session.start();
      session.updateTick(5000);
      session.stop();

      const state = session.getState();
      expect(state.currentTick).toBe(5000);
    });
  });

  describe('elapsed time', () => {
    it('should track elapsed time while running', async () => {
      session.start();

      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = session.getMetrics();
      expect(metrics.elapsedSeconds).toBeGreaterThanOrEqual(0);
    });

    it('should pause elapsed time when paused', async () => {
      session.start();

      await new Promise(resolve => setTimeout(resolve, 50));
      session.pause();

      const pausedMetrics = session.getMetrics();
      const pausedSeconds = pausedMetrics.elapsedSeconds;

      await new Promise(resolve => setTimeout(resolve, 100));

      const stillPausedMetrics = session.getMetrics();
      expect(stillPausedMetrics.elapsedSeconds).toBe(pausedSeconds);
    });

    it('should resume elapsed time when resumed', async () => {
      session.start();

      await new Promise(resolve => setTimeout(resolve, 100));
      session.pause();

      const pausedMetrics = session.getMetrics();
      const pausedSeconds = pausedMetrics.elapsedSeconds;

      session.resume();

      await new Promise(resolve => setTimeout(resolve, 100));

      const resumedMetrics = session.getMetrics();
      expect(resumedMetrics.elapsedSeconds).toBeGreaterThanOrEqual(pausedSeconds);
    });
  });

  describe('pause/resume tracking', () => {
    it('should count pause operations', () => {
      session.start();

      session.pause();
      session.resume();
      session.pause();
      session.resume();

      const metrics = session.getMetrics();
      expect(metrics.pauseCount).toBe(2);
      expect(metrics.resumeCount).toBe(2);
    });
  });

  describe('status queries', () => {
    it('should report running status', () => {
      expect(session.isRunning()).toBe(false);

      session.start();
      expect(session.isRunning()).toBe(true);

      session.pause();
      expect(session.isRunning()).toBe(false);

      session.resume();
      expect(session.isRunning()).toBe(true);
    });

    it('should report paused status', () => {
      session.start();

      expect(session.isPaused()).toBe(false);

      session.pause();
      expect(session.isPaused()).toBe(true);

      session.resume();
      expect(session.isPaused()).toBe(false);
    });

    it('should report stopped status', () => {
      session.start();

      expect(session.isStopped()).toBe(false);

      session.stop();
      expect(session.isStopped()).toBe(true);
    });
  });

  describe('export and summary', () => {
    it('should export state', () => {
      session.start();
      session.updateTick(1000);

      const exported = session.exportState();
      const data = JSON.parse(exported);

      expect(data.state.status).toBe('started');
      expect(data.state.currentTick).toBe(1000);
      expect(data.metrics).toBeDefined();
    });

    it('should generate summary', () => {
      session.start();
      session.updateTick(5000);

      const summary = session.getSummary();

      expect(summary.matchId).toBeDefined();
      expect(summary.map).toBe('alpine_mountains_3p');
      expect(summary.players).toBe(2);
      expect(summary.status).toBe('started');
      expect(summary.ticks).toBe(5000);
      expect(summary.duration).toBeDefined();
    });
  });

  describe('realistic scenario', () => {
    it('should support complete match session lifecycle', async () => {
      // Create and verify initial state
      let state = session.getState();
      expect(state.status).toBe('created');

      // Start match
      session.start();
      state = session.getState();
      expect(state.status).toBe('started');
      expect(state.startedAt).toBeDefined();

      // Simulate match progression
      for (let tick = 0; tick <= 5000; tick += 500) {
        session.updateTick(tick);
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Pause for diagnostics
      session.pause();
      let metrics = session.getMetrics();
      expect(metrics.pauseCount).toBe(1);

      // Resume match
      session.resume();
      metrics = session.getMetrics();
      expect(metrics.resumeCount).toBe(1);

      // Continue and finish
      session.updateTick(5000);
      session.stop();

      // Verify final state
      state = session.getState();
      expect(state.status).toBe('stopped');
      expect(state.stoppedAt).toBeDefined();
      expect(state.currentTick).toBe(5000);

      // Get summary
      const summary = session.getSummary();
      expect(summary.status).toBe('stopped');
      expect(summary.ticks).toBe(5000);

      // Export for archive
      const exported = session.exportState();
      expect(exported).toBeDefined();
      const data = JSON.parse(exported);
      expect(data.state.matchId).toBeDefined();
    });
  });
});
