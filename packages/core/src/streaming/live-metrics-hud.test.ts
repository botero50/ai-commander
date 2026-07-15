/**
 * Story 57.4 — Live Metrics HUD Tests
 *
 * Validates real-time player statistics display.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LiveMetricsHUD, createLiveMetricsHUD } from './live-metrics-hud.js';
import { Logger } from '../config/logger.js';

describe('Live Metrics HUD (Story 57.4)', { timeout: 10000 }, () => {
  let hud: LiveMetricsHUD;
  const logger = new Logger('error', 'HUDTest');

  const createObservation = (playerId: number = 1, playerName: string = 'Player1') => ({
    tick: 100,
    playerId,
    playerName,
    observation: {
      resources: { wood: 500, stone: 300, food: 250, metal: 50 },
      units: 25,
      buildings: 8,
      population: 45,
    },
  });

  beforeEach(() => {
    hud = new LiveMetricsHUD(logger);
  });

  describe('initialization', () => {
    it('should initialize empty', () => {
      const json = hud.toJSON();
      expect(json.activeMetrics).toBe(0);
      expect(json.historySize).toBe(0);
    });

    it('should create via factory', () => {
      const factoryHUD = createLiveMetricsHUD(logger);
      expect(factoryHUD).toBeDefined();
    });

    it('should allow subscription', () => {
      let received = false;
      hud.onMetricsUpdate(() => {
        received = true;
      });

      expect(hud.listenerCount('metrics')).toBeGreaterThan(0);
    });
  });

  describe('metrics update', () => {
    it('should accept and store metrics', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1);
      expect(metrics).toBeDefined();
      expect(metrics?.playerName).toBe('Player1');
      expect(metrics?.resources.wood).toBe(500);
    });

    it('should emit metrics-update event', () => {
      return new Promise<void>((resolve) => {
        hud.onMetricsUpdate((update) => {
          expect(update.type).toBe('metrics-update');
          expect(update.players.length).toBeGreaterThan(0);
          resolve();
        });

        hud.updateMetrics(createObservation());
      });
    });

    it('should track multiple players', () => {
      return new Promise<void>((resolve) => {
        hud.onMetricsUpdate(() => {});

        const obs1 = createObservation(1, 'Player1');
        const obs2 = createObservation(2, 'Player2');
        obs2.tick = 101; // Different tick for second player

        hud.updateMetrics(obs1);
        hud.updateMetrics(obs2);

        const all = hud.getAllMetrics();
        expect(all.length).toBe(2);
        resolve();
      });
    });

    it('should skip duplicate ticks', () => {
      return new Promise<void>((resolve) => {
        let updateCount = 0;

        hud.onMetricsUpdate(() => {
          updateCount++;
        });

        hud.updateMetrics(createObservation());
        hud.updateMetrics(createObservation()); // Same tick
        hud.updateMetrics(createObservation()); // Same tick again

        setTimeout(() => {
          expect(updateCount).toBe(1); // Only first update emitted
          resolve();
        }, 100);
      });
    });
  });

  describe('metrics calculation', () => {
    it('should calculate military value from units', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1);
      expect(metrics?.units.militaryValue).toBe(250); // 25 units * 10
    });

    it('should calculate resource rates', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1);
      expect(metrics?.economy.woodRate).toBeGreaterThan(0);
      expect(metrics?.economy.stoneRate).toBeGreaterThan(0);
      expect(metrics?.economy.foodRate).toBeGreaterThan(0);
    });

    it('should handle missing data gracefully', () => {
      hud.updateMetrics({
        tick: 100,
        playerId: 1,
        playerName: 'Player1',
        observation: {}, // Empty observation
      });

      const metrics = hud.getPlayerMetrics(1);
      expect(metrics?.resources.wood).toBe(0);
      expect(metrics?.units.count).toBe(0);
    });
  });

  describe('display formatting', () => {
    it('should format metrics for display', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1)!;
      const formatted = hud.formatForDisplay(metrics);

      expect(formatted.player).toContain('Player1');
      expect(formatted.resources.wood).toBe('500');
      expect(formatted.military.units).toBe('25');
      expect(formatted.buildings).toBe('8');
    });

    it('should format economy rates with /s suffix', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1)!;
      const formatted = hud.formatForDisplay(metrics);

      expect(formatted.economy.wood).toContain('/s');
      expect(formatted.economy.stone).toContain('/s');
      expect(formatted.economy.food).toContain('/s');
    });

    it('should format population as fraction', () => {
      hud.updateMetrics(createObservation());

      const metrics = hud.getPlayerMetrics(1)!;
      const formatted = hud.formatForDisplay(metrics);

      expect(formatted.population).toContain('/');
      expect(formatted.population).toContain('45');
      expect(formatted.population).toContain('300');
    });
  });

  describe('competitive comparison', () => {
    it('should compare two players', () => {
      const obs1 = createObservation(1, 'Player1');
      const obs2 = createObservation(2, 'Player2');
      obs2.tick = 101; // Different tick

      hud.updateMetrics(obs1);
      hud.updateMetrics(obs2);

      const comparison = hud.compareMetrics(1, 2);

      expect(comparison.player1).toBe('Player1');
      expect(comparison.player2).toBe('Player2');
      expect(comparison.resourceLead).toBeDefined();
      expect(comparison.militaryLead).toBeDefined();
    });

    it('should calculate resource lead', () => {
      hud.updateMetrics(createObservation(1, 'Player1'));
      hud.updateMetrics({
        tick: 101, // Different tick
        playerId: 2,
        playerName: 'Player2',
        observation: {
          resources: { wood: 300, stone: 200, food: 150 },
        },
      });

      const comparison = hud.compareMetrics(1, 2);
      const p1Total = 500 + 300 + 250;
      const p2Total = 300 + 200 + 150;

      expect(comparison.resourceLead.player1).toBe(p1Total);
      expect(comparison.resourceLead.player2).toBe(p2Total);
    });
  });

  describe('history tracking', () => {
    it('should maintain metrics history', () => {
      for (let i = 0; i < 5; i++) {
        const obs = createObservation();
        obs.tick = 100 + i;
        hud.updateMetrics(obs);
      }

      const history = hud.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should limit history size', () => {
      // Add more updates than max history
      for (let i = 0; i < 150; i++) {
        const obs = createObservation();
        obs.tick = i;
        hud.updateMetrics(obs);
      }

      const json = hud.toJSON();
      expect(json.historySize).toBeLessThanOrEqual(100);
    });

    it('should retrieve limited history', () => {
      for (let i = 0; i < 20; i++) {
        const obs = createObservation();
        obs.tick = i;
        hud.updateMetrics(obs);
      }

      const history = hud.getMetricsHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('reset', () => {
    it('should clear metrics on reset', () => {
      hud.updateMetrics(createObservation());
      expect(hud.getAllMetrics().length).toBeGreaterThan(0);

      hud.reset();
      expect(hud.getAllMetrics().length).toBe(0);
      expect(hud.getMetricsHistory().length).toBe(0);
    });
  });

  describe('broadcast integration', () => {
    it('should emit broadcast-ready events', () => {
      return new Promise<void>((resolve) => {
        hud.onMetricsUpdate((update) => {
          expect(update.timestamp).toBeDefined();
          expect(update.tick).toBeDefined();
          expect(update.players).toBeInstanceOf(Array);

          // Should be JSON serializable
          expect(() => JSON.stringify(update)).not.toThrow();
          resolve();
        });

        hud.updateMetrics(createObservation());
      });
    });

    it('should handle continuous stream of observations', () => {
      return new Promise<void>((resolve) => {
        const updates: any[] = [];

        hud.onMetricsUpdate((update) => {
          updates.push(update);
        });

        // Simulate continuous observations
        for (let tick = 0; tick < 10; tick++) {
          const obs = createObservation();
          obs.tick = tick;
          hud.updateMetrics(obs);
        }

        setTimeout(() => {
          expect(updates.length).toBeGreaterThan(0);
          resolve();
        }, 100);
      });
    });

    it('should provide data for HUD overlay', () => {
      const obs1 = createObservation(1, 'AI Player 1');
      const obs2 = createObservation(2, 'AI Player 2');
      obs2.tick = 101; // Different tick

      hud.updateMetrics(obs1);
      hud.updateMetrics(obs2);

      const metrics = hud.getAllMetrics();
      const comparison = hud.compareMetrics(1, 2);

      // Overlay can use both raw metrics and comparison
      expect(metrics.length).toBe(2);
      expect(comparison.player1).toBeDefined();
      expect(comparison.militaryLead).toBeDefined();
    });
  });

  describe('realistic match scenario', () => {
    it('should track player progression through match', () => {
      return new Promise<void>((resolve) => {
        const updates: any[] = [];

        hud.onMetricsUpdate((update) => {
          updates.push(update);
        });

        // Early game: players building up
        for (let tick = 0; tick < 5; tick++) {
          const obs = createObservation();
          obs.tick = tick * 50;
          obs.observation.resources = {
            wood: 300 + tick * 50,
            stone: 200 + tick * 30,
            food: 150 + tick * 20,
          };
          hud.updateMetrics(obs);
        }

        setTimeout(() => {
          const history = hud.getMetricsHistory();
          expect(history.length).toBeGreaterThan(0);

          // Verify progression
          const firstMetrics = history[0].metrics[0].resources.wood;
          const lastMetrics = history[history.length - 1].metrics[0].resources.wood;
          expect(lastMetrics).toBeGreaterThan(firstMetrics);

          resolve();
        }, 100);
      });
    });

    it('should support multi-player HUD display', () => {
      // Simulate 2-player match
      const obs1 = createObservation(1, 'Ollama AI');
      const obs2 = createObservation(2, 'Claude AI');
      obs2.tick = 101; // Different tick

      hud.updateMetrics(obs1);
      hud.updateMetrics(obs2);

      const all = hud.getAllMetrics();
      expect(all.length).toBe(2);

      // Format both for display
      const display = all.map((m) => hud.formatForDisplay(m));
      expect(display.length).toBe(2);

      // Get comparison for scoreboard
      const comparison = hud.compareMetrics(1, 2);
      expect(comparison).toBeDefined();
    });
  });
});
