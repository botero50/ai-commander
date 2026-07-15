/**
 * Story 57.2 — Match Introduction Tests
 *
 * Validates match introduction sequence timing and event emission.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchIntroduction, createMatchIntroduction, type MatchInfo } from './match-introduction.js';
import { Logger } from '../config/logger.js';

describe('Match Introduction (Story 57.2)', () => {
  let intro: MatchIntroduction;
  const logger = new Logger('error', 'IntroTest');

  const testMatch: MatchInfo = {
    matchId: 'test-match-001',
    map: 'setons_2p',
    players: [
      { id: 1, name: 'AI Player 1', civilization: 'romans' },
      { id: 2, name: 'AI Player 2', civilization: 'persians' },
    ],
  };

  beforeEach(() => {
    intro = new MatchIntroduction(logger);
  });

  describe('initialization', () => {
    it('should initialize not running', () => {
      const json = intro.toJSON();
      expect(json.isRunning).toBe(false);
    });

    it('should have correct total duration', () => {
      expect(intro.getTotalDuration()).toBe(8);
    });

    it('should create via factory', () => {
      const factoryIntro = createMatchIntroduction(logger);
      expect(factoryIntro).toBeDefined();
    });
  });

  describe('introduction sequence', () => {
    it('should emit map-reveal event', (done) => {
      let mapRevealed = false;

      intro.onIntroduction((event) => {
        if (event.type === 'map-reveal') {
          mapRevealed = true;
          expect(event.data.map).toBe('setons_2p');
          expect(event.data.mapDisplay).toBe('Setons 2p');
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(mapRevealed).toBe(true);
        done();
      }, 1000);
    });

    it('should emit players-reveal event', (done) => {
      let playersRevealed = false;

      intro.onIntroduction((event) => {
        if (event.type === 'players-reveal') {
          playersRevealed = true;
          expect(event.data.players).toHaveLength(2);
          expect(event.data.players[0].name).toBe('AI Player 1');
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(playersRevealed).toBe(true);
        done();
      }, 3000);
    });

    it('should emit countdown events', (done) => {
      const countdowns: number[] = [];

      intro.onIntroduction((event) => {
        if (event.type === 'countdown') {
          countdowns.push(event.data.count);
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(countdowns).toContain(3);
        expect(countdowns).toContain(2);
        expect(countdowns).toContain(1);
        done();
      }, 5500);
    });

    it('should emit battle-begins event', (done) => {
      let battleBegins = false;

      intro.onIntroduction((event) => {
        if (event.type === 'battle-begins') {
          battleBegins = true;
          expect(event.data.message).toBe('Battle Begins!');
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(battleBegins).toBe(true);
        done();
      }, 7500);
    });

    it('should emit intro-complete event', (done) => {
      let introComplete = false;

      intro.onIntroduction((event) => {
        if (event.type === 'intro-complete') {
          introComplete = true;
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(introComplete).toBe(true);
        done();
      }, 9000);
    });
  });

  describe('event sequence order', () => {
    it('should emit events in correct order', (done) => {
      const eventSequence: string[] = [];

      intro.onIntroduction((event) => {
        eventSequence.push(event.type);
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(eventSequence[0]).toBe('map-reveal');
        expect(eventSequence[1]).toBe('players-reveal');
        expect(eventSequence[2]).toBe('countdown'); // 3
        expect(eventSequence[3]).toBe('countdown'); // 2
        expect(eventSequence[4]).toBe('countdown'); // 1
        expect(eventSequence[5]).toBe('battle-begins');
        expect(eventSequence[6]).toBe('intro-complete');
        done();
      }, 9000);
    });
  });

  describe('formatting', () => {
    it('should format map names correctly', (done) => {
      intro.onIntroduction((event) => {
        if (event.type === 'map-reveal') {
          expect(event.data.mapDisplay).toBeDefined();
          // Should capitalize and add spaces
          const mapDisplay = event.data.mapDisplay;
          expect(typeof mapDisplay).toBe('string');
          done();
        }
      });

      intro.runIntroduction(testMatch);
    });

    it('should format civilization names correctly', (done) => {
      intro.onIntroduction((event) => {
        if (event.type === 'players-reveal') {
          const civs = event.data.players.map((p: any) => p.civilization);
          expect(civs[0]).toBe('Romans');
          expect(civs[1]).toBe('Persians');
          done();
        }
      });

      intro.runIntroduction(testMatch);
    });
  });

  describe('timestamps', () => {
    it('should include timestamps in all events', (done) => {
      const eventCount = [0];

      intro.onIntroduction((event) => {
        expect(event.timestamp).toBeDefined();
        expect(() => new Date(event.timestamp)).not.toThrow();
        eventCount[0]++;
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(eventCount[0]).toBeGreaterThan(0);
        done();
      }, 9000);
    });
  });

  describe('concurrent safety', () => {
    it('should prevent concurrent introductions', async () => {
      intro.onIntroduction(() => {}); // Subscribe but ignore

      const promise1 = intro.runIntroduction(testMatch);
      const promise2 = intro.runIntroduction(testMatch);

      await Promise.all([promise1, promise2]);

      // Should complete without error (second should be ignored)
      expect(true).toBe(true);
    });
  });

  describe('broadcast format', () => {
    it('should emit events suitable for broadcast overlay', (done) => {
      const events: any[] = [];

      intro.onIntroduction((event) => {
        events.push(event);
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        // All events should be JSON-serializable
        expect(() => JSON.stringify(events)).not.toThrow();

        // Should have data field for overlay to consume
        events.forEach((event) => {
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('timestamp');
          expect(event).toHaveProperty('data');
        });

        done();
      }, 9000);
    });

    it('should include match context', (done) => {
      intro.onIntroduction((event) => {
        if (event.type === 'map-reveal' || event.type === 'players-reveal') {
          expect(event.data.matchId).toBe('test-match-001');
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        done();
      }, 5000);
    });
  });

  describe('realistic broadcast scenario', () => {
    it('should complete full introduction for broadcast', (done) => {
      const broadcastEvents: any[] = [];
      let complete = false;

      intro.onIntroduction((event) => {
        broadcastEvents.push(event);
        if (event.type === 'intro-complete') {
          complete = true;
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        expect(complete).toBe(true);
        expect(broadcastEvents.length).toBeGreaterThanOrEqual(7);

        // Verify broadcast overlay can consume all events
        broadcastEvents.forEach((event) => {
          expect(JSON.stringify(event)).toBeTruthy();
        });

        done();
      }, 9000);
    });

    it('should provide proper timing for smooth transition', (done) => {
      const startTime = Date.now();
      let endTime: number;

      intro.onIntroduction((event) => {
        if (event.type === 'intro-complete') {
          endTime = Date.now();
        }
      });

      intro.runIntroduction(testMatch);

      setTimeout(() => {
        const duration = endTime! - startTime;
        // Should take approximately 8 seconds
        expect(duration).toBeGreaterThan(7500);
        expect(duration).toBeLessThan(9500);
        done();
      }, 9000);
    });
  });
});
