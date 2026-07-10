import { describe, it, expect, beforeEach } from 'vitest';
import { SessionEventBus, type MatchStartedEvent, type DecisionCompletedEvent } from './session-events.js';
import { Logger } from '../config/logger.js';

describe('SessionEventBus', () => {
  let bus: SessionEventBus;
  const logger = new Logger('error');

  beforeEach(() => {
    bus = new SessionEventBus(logger);
  });

  describe('event emission', () => {
    it('should emit match started event', () => {
      const event: MatchStartedEvent = {
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [
          { id: 1, name: 'NeuralRTS', civilization: 'Athens' },
          { id: 2, name: 'Claude', civilization: 'Rome' },
        ],
        timestamp: new Date().toISOString(),
      };

      let emitted = false;
      bus.on('match:started', (data) => {
        emitted = true;
        expect(data.matchId).toBe('match-1');
        expect(data.players.length).toBe(2);
      });

      bus.emitMatchStarted(event);
      expect(emitted).toBe(true);
    });

    it('should emit observation received event', () => {
      let emitted = false;
      bus.on('observation:received', (data) => {
        emitted = true;
        expect(data.playerId).toBe(1);
        expect(data.observation.resources).toBeDefined();
      });

      bus.emitObservationReceived({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'NeuralRTS',
        tick: 100,
        observation: {
          gameTime: 100,
          resources: { wood: 500, stone: 300 },
          units: 15,
        },
        timestamp: new Date().toISOString(),
      });

      expect(emitted).toBe(true);
    });

    it('should emit decision completed event', () => {
      let emitted = false;
      bus.on('decision:completed', (data) => {
        emitted = true;
        expect(data.latency).toBe(1500);
        expect(data.decision.confidence).toBeCloseTo(0.85, 2);
      });

      bus.emitDecisionCompleted({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'NeuralRTS',
        tick: 100,
        model: 'ollama:neural-rts',
        prompt: 'aggressive-v1.0.0',
        decision: {
          objective: 'Build barracks',
          confidence: 0.85,
          reasoning: 'Need military production',
        },
        latency: 1500,
        cost: 0.0001,
        timestamp: new Date().toISOString(),
      });

      expect(emitted).toBe(true);
    });

    it('should emit command executed event', () => {
      let emitted = false;
      bus.on('command:executed', (data) => {
        emitted = true;
        expect(data.isValid).toBe(true);
        expect(data.command.action).toBe('build');
      });

      bus.emitCommandExecuted({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'NeuralRTS',
        tick: 100,
        command: {
          action: 'build',
          target: 'barracks',
          parameters: { position: { x: 100, y: 200 } },
        },
        isValid: true,
        timestamp: new Date().toISOString(),
      });

      expect(emitted).toBe(true);
    });

    it('should emit match ended event', () => {
      let emitted = false;
      bus.on('match:ended', (data) => {
        emitted = true;
        expect(data.winner.name).toBe('NeuralRTS');
        expect(data.duration.ticks).toBe(5000);
      });

      bus.emitMatchEnded({
        matchId: 'match-1',
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

      expect(emitted).toBe(true);
    });

    it('should emit error occurred event', () => {
      let emitted = false;
      bus.on('error:occurred', (data) => {
        emitted = true;
        expect(data.severity).toBe('error');
        expect(data.code).toBe('INVALID_COMMAND');
      });

      bus.emitErrorOccurred({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'NeuralRTS',
        severity: 'error',
        code: 'INVALID_COMMAND',
        message: 'Unknown command action',
        timestamp: new Date().toISOString(),
      });

      expect(emitted).toBe(true);
    });
  });

  describe('event history', () => {
    it('should record events in history', () => {
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      bus.emitDecisionCompleted({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'P1',
        tick: 100,
        model: 'model-1',
        prompt: 'prompt-1',
        decision: { objective: 'test', confidence: 0.5, reasoning: 'test' },
        latency: 1000,
        cost: 0.001,
        timestamp: new Date().toISOString(),
      });

      const history = bus.getHistory();
      expect(history.length).toBe(2);
      expect(history[0].event).toBe('match:started');
      expect(history[1].event).toBe('decision:completed');
    });

    it('should filter history by event type', () => {
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      bus.emitDecisionCompleted({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'P1',
        tick: 100,
        model: 'model-1',
        prompt: 'prompt-1',
        decision: { objective: 'test', confidence: 0.5, reasoning: 'test' },
        latency: 1000,
        cost: 0.001,
        timestamp: new Date().toISOString(),
      });

      bus.emitDecisionCompleted({
        matchId: 'match-1',
        playerId: 2,
        playerName: 'P2',
        tick: 100,
        model: 'model-2',
        prompt: 'prompt-1',
        decision: { objective: 'test', confidence: 0.5, reasoning: 'test' },
        latency: 1000,
        cost: 0.001,
        timestamp: new Date().toISOString(),
      });

      const decisions = bus.getHistoryByType('decision:completed');
      expect(decisions.length).toBe(2);
      expect(decisions.every(d => d.event === 'decision:completed')).toBe(true);
    });

    it('should filter history by match ID', () => {
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      bus.emitMatchStarted({
        matchId: 'match-2',
        map: 'nomad_islands',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      const match1Events = bus.getHistoryForMatch('match-1');
      expect(match1Events.length).toBe(1);
      expect(match1Events[0].data.matchId).toBe('match-1');
    });
  });

  describe('statistics', () => {
    it('should calculate event statistics', () => {
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      bus.emitDecisionCompleted({
        matchId: 'match-1',
        playerId: 1,
        playerName: 'P1',
        tick: 100,
        model: 'model-1',
        prompt: 'prompt-1',
        decision: { objective: 'test', confidence: 0.5, reasoning: 'test' },
        latency: 1000,
        cost: 0.001,
        timestamp: new Date().toISOString(),
      });

      bus.emitErrorOccurred({
        matchId: 'match-1',
        playerId: 1,
        severity: 'error',
        code: 'TEST_ERROR',
        message: 'Test error',
        timestamp: new Date().toISOString(),
      });

      const stats = bus.getStatistics();

      expect(stats.totalEvents).toBe(3);
      expect(stats.eventCounts['match:started']).toBe(1);
      expect(stats.eventCounts['decision:completed']).toBe(1);
      expect(stats.eventCounts['error:occurred']).toBe(1);
      expect(stats.matches).toBe(1);
      expect(stats.errors).toBe(1);
    });
  });

  describe('export', () => {
    it('should export event history', () => {
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [{ id: 1, name: 'P1', civilization: 'Athens' }],
        timestamp: new Date().toISOString(),
      });

      const exported = bus.exportHistory();
      const data = JSON.parse(exported);

      expect(data.timestamp).toBeDefined();
      expect(data.statistics).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
      expect(data.events.length).toBe(1);
    });
  });

  describe('realistic scenario', () => {
    it('should support complete match event lifecycle', () => {
      // Match starts
      bus.emitMatchStarted({
        matchId: 'match-1',
        map: 'alpine_mountains_3p',
        players: [
          { id: 1, name: 'NeuralRTS', civilization: 'Athens' },
          { id: 2, name: 'Claude', civilization: 'Rome' },
        ],
        timestamp: new Date().toISOString(),
      });

      // Players receive observations and make decisions
      for (let tick = 0; tick <= 100; tick += 25) {
        // Player 1 observes
        bus.emitObservationReceived({
          matchId: 'match-1',
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          observation: {
            gameTime: tick,
            resources: { wood: 500 + tick * 10, stone: 300 + tick * 5 },
            units: 10 + tick / 10,
          },
          timestamp: new Date().toISOString(),
        });

        // Player 1 decides
        bus.emitDecisionCompleted({
          matchId: 'match-1',
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          model: 'ollama:neural-rts',
          prompt: 'aggressive-v1.0.0',
          decision: {
            objective: `Action at tick ${tick}`,
            confidence: 0.8 + Math.random() * 0.2,
            reasoning: 'Strategic decision',
          },
          latency: 1000 + Math.random() * 500,
          cost: 0.0001,
          timestamp: new Date().toISOString(),
        });

        // Command executed
        bus.emitCommandExecuted({
          matchId: 'match-1',
          playerId: 1,
          playerName: 'NeuralRTS',
          tick,
          command: {
            action: tick % 25 === 0 ? 'build' : 'move',
            target: 'unit-1',
          },
          isValid: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Match ends
      bus.emitMatchEnded({
        matchId: 'match-1',
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

      // Verify complete history
      const history = bus.getHistory();
      expect(history.length).toBeGreaterThan(10);

      const match1Events = bus.getHistoryForMatch('match-1');
      expect(match1Events.length).toBeGreaterThan(10);

      const stats = bus.getStatistics();
      expect(stats.totalEvents).toBeGreaterThan(10);
      expect(stats.matches).toBe(1);

      // Export for streaming/archival
      const exported = bus.exportHistory();
      expect(exported).toBeDefined();
    });
  });
});
