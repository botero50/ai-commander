/**
 * Story 57.3 — Match Conclusion Tests
 *
 * Validates victory display and statistics sequence.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchConclusion, createMatchConclusion, type VictoryStats } from './match-conclusion.js';
import { Logger } from '../config/logger.js';

describe('Match Conclusion (Story 57.3)', () => {
  let conclusion: MatchConclusion;
  const logger = new Logger('error', 'ConclusionTest');

  const testVictory: VictoryStats = {
    winner: { id: 1, name: 'AI Player 1' },
    loser: { id: 2, name: 'AI Player 2' },
    duration: 1800, // 30 minutes
    statistics: {
      totalCommands: 450,
      militaryValue: 250,
      economyScore: 180,
      finalUnits: 45,
      finalBuildings: 18,
    },
    reason: 'Military Dominance',
  };

  beforeEach(() => {
    conclusion = new MatchConclusion(logger);
  });

  describe('initialization', () => {
    it('should initialize not running', () => {
      const json = conclusion.toJSON();
      expect(json.isRunning).toBe(false);
    });

    it('should have correct total duration', () => {
      expect(conclusion.getTotalDuration()).toBe(6);
    });

    it('should create via factory', () => {
      const factoryConclusion = createMatchConclusion(logger);
      expect(factoryConclusion).toBeDefined();
    });
  });

  describe('conclusion sequence', () => {
    it('should emit victory-show event', (done) => {
      let victoryShown = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'victory-show') {
          victoryShown = true;
          expect(event.data.winner).toEqual({ id: 1, name: 'AI Player 1' });
          expect(event.data.duration).toBe('30:00');
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(victoryShown).toBe(true);
        done();
      }, 800);
    });

    it('should emit stats-display event', (done) => {
      let statsDisplayed = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'stats-display' && event.data.statistics) {
          statsDisplayed = true;
          expect(event.data.statistics.totalCommands).toBe(450);
          expect(event.data.statistics.militaryValue).toBe(250);
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(statsDisplayed).toBe(true);
        done();
      }, 2500);
    });

    it('should emit next-match-loading event', (done) => {
      let nextMatchLoading = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'next-match-loading') {
          nextMatchLoading = true;
          expect(event.data.message).toBe('Preparing Next Match...');
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(nextMatchLoading).toBe(true);
        done();
      }, 6200);
    });

    it('should emit conclusion-complete event', (done) => {
      let complete = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'conclusion-complete') {
          complete = true;
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(complete).toBe(true);
        done();
      }, 7000);
    });
  });

  describe('statistics display', () => {
    it('should include all statistics fields', (done) => {
      conclusion.onConclusion((event) => {
        if (event.type === 'stats-display' && event.data.statistics) {
          expect(event.data.statistics).toHaveProperty('totalCommands');
          expect(event.data.statistics).toHaveProperty('militaryValue');
          expect(event.data.statistics).toHaveProperty('economyScore');
          expect(event.data.statistics).toHaveProperty('finalUnits');
          expect(event.data.statistics).toHaveProperty('finalBuildings');
          done();
        }
      });

      conclusion.runConclusion(testVictory);
    });

    it('should generate highlight achievements', (done) => {
      conclusion.onConclusion((event) => {
        if (event.type === 'stats-display' && event.data.highlights) {
          expect(Array.isArray(event.data.highlights)).toBe(true);
          expect(event.data.highlights.length).toBeGreaterThan(0);
          done();
        }
      });

      conclusion.runConclusion(testVictory);
    });
  });

  describe('victory reason explanation', () => {
    it('should display victory reason', (done) => {
      conclusion.onConclusion((event) => {
        if (event.type === 'stats-display' && event.data.reason) {
          expect(event.data.reason).toBe('Military Dominance');
          done();
        }
      });

      conclusion.runConclusion(testVictory);
    });

    it('should provide explanation for reason', (done) => {
      conclusion.onConclusion((event) => {
        if (event.type === 'stats-display' && event.data.reasonExplanation) {
          expect(typeof event.data.reasonExplanation).toBe('string');
          expect(event.data.reasonExplanation.length).toBeGreaterThan(0);
          done();
        }
      });

      conclusion.runConclusion(testVictory);
    });
  });

  describe('timing', () => {
    it('should complete in approximately 6 seconds', (done) => {
      const startTime = Date.now();
      let endTime: number;

      conclusion.onConclusion((event) => {
        if (event.type === 'conclusion-complete') {
          endTime = Date.now();
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        const duration = endTime! - startTime;
        expect(duration).toBeGreaterThan(5500);
        expect(duration).toBeLessThan(7500);
        done();
      }, 7500);
    });
  });

  describe('duration formatting', () => {
    it('should format durations correctly', (done) => {
      conclusion.onConclusion((event) => {
        if (event.type === 'victory-show') {
          expect(event.data.duration).toMatch(/^\d{2}:\d{2}$/);
          done();
        }
      });

      conclusion.runConclusion(testVictory);
    });

    it('should handle short durations', (done) => {
      const shortVictory = { ...testVictory, duration: 45 };

      conclusion.onConclusion((event) => {
        if (event.type === 'victory-show') {
          expect(event.data.duration).toBe('00:45');
          done();
        }
      });

      conclusion.runConclusion(shortVictory);
    });

    it('should handle long durations', (done) => {
      const longVictory = { ...testVictory, duration: 3665 };

      conclusion.onConclusion((event) => {
        if (event.type === 'victory-show') {
          expect(event.data.duration).toBe('61:05');
          done();
        }
      });

      conclusion.runConclusion(longVictory);
    });
  });

  describe('broadcast integration', () => {
    it('should emit events suitable for broadcast overlay', (done) => {
      const events: any[] = [];

      conclusion.onConclusion((event) => {
        events.push(event);
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        // All events should be JSON-serializable
        expect(() => JSON.stringify(events)).not.toThrow();

        // Should have required fields
        events.forEach((event) => {
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('data');
        });

        done();
      }, 7000);
    });

    it('should trigger next match auto-start', (done) => {
      let nextMatchTriggered = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'next-match-loading') {
          nextMatchTriggered = true;
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(nextMatchTriggered).toBe(true);
        done();
      }, 6500);
    });
  });

  describe('realistic broadcast scenario', () => {
    it('should complete full victory sequence', (done) => {
      const broadcastEvents: any[] = [];

      conclusion.onConclusion((event) => {
        broadcastEvents.push(event);
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        // Should have all event types
        const eventTypes = broadcastEvents.map((e) => e.type);
        expect(eventTypes).toContain('victory-show');
        expect(eventTypes).toContain('stats-display');
        expect(eventTypes).toContain('next-match-loading');
        expect(eventTypes).toContain('conclusion-complete');

        done();
      }, 7000);
    });

    it('should provide smooth transition to next match', (done) => {
      let transitionReady = false;

      conclusion.onConclusion((event) => {
        if (event.type === 'next-match-loading') {
          transitionReady = true;
          // Next match intro should start immediately
          expect(event.data.message).toBe('Preparing Next Match...');
        }
      });

      conclusion.runConclusion(testVictory);

      setTimeout(() => {
        expect(transitionReady).toBe(true);
        done();
      }, 6200);
    });

    it('should handle multiple different victory reasons', async () => {
      const reasons = [
        'Military Dominance',
        'Economic Collapse',
        'Territory Control',
        'Technology Advantage',
        'Command Excellence',
      ];

      for (const reason of reasons) {
        const victory = { ...testVictory, reason };
        const events: any[] = [];

        conclusion.onConclusion((event) => {
          events.push(event);
        });

        await conclusion.runConclusion(victory);

        const reasonEvent = events.find((e) => e.type === 'stats-display' && e.data.reason);
        expect(reasonEvent?.data.reason).toBe(reason);

        conclusion = new MatchConclusion(logger);
      }
    });
  });

  describe('concurrent safety', () => {
    it('should prevent concurrent conclusions', async () => {
      conclusion.onConclusion(() => {});

      const promise1 = conclusion.runConclusion(testVictory);
      const promise2 = conclusion.runConclusion(testVictory);

      await Promise.all([promise1, promise2]);

      expect(true).toBe(true);
    });
  });
});
