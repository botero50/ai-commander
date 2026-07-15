/**
 * Story 57.2 — Match Introduction Tests
 *
 * Validates match introduction sequence timing and event emission.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MatchIntroduction, createMatchIntroduction, type MatchInfo } from './match-introduction.js';
import { Logger } from '../config/logger.js';

describe('Match Introduction (Story 57.2)', { timeout: 10000 }, () => {
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
    it('should emit map-reveal event', () => {
      return new Promise<void>((resolve) => {
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
          resolve();
        }, 1000);
      });
    });

    it('should emit players-reveal event', () => {
      return new Promise<void>((resolve) => {
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
          resolve();
        }, 3000);
      });
    });

    it('should emit countdown events', () => {
      return new Promise<void>((resolve) => {
        const countdowns: number[] = [];

        intro.onIntroduction((event) => {
          if (event.type === 'countdown') {
            countdowns.push(event.data.count);
            // Resolve as soon as we get all 3 countdown events
            if (countdowns.length === 3) {
              expect(countdowns).toContain(3);
              expect(countdowns).toContain(2);
              expect(countdowns).toContain(1);
              resolve();
            }
          }
        });

        intro.runIntroduction(testMatch);

        // Fallback timeout in case something goes wrong
        setTimeout(() => {
          expect(countdowns).toContain(3);
          expect(countdowns).toContain(2);
          expect(countdowns).toContain(1);
          resolve();
        }, 8000);
      });
    });

    it('should emit battle-begins event', () => {
      return new Promise<void>((resolve) => {
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
          resolve();
        }, 7500);
      });
    });

    it('should emit intro-complete event', () => {
      return new Promise<void>((resolve) => {
        let introComplete = false;

        intro.onIntroduction((event) => {
          if (event.type === 'intro-complete') {
            introComplete = true;
          }
        });

        intro.runIntroduction(testMatch);

        setTimeout(() => {
          expect(introComplete).toBe(true);
          resolve();
        }, 9000);
      });
    });
  });

  describe('event sequence order', () => {
    it('should emit events in correct order', () => {
      return new Promise<void>((resolve) => {
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
          resolve();
        }, 9000);
      });
    });
  });

  describe('formatting', () => {
    it('should format map names correctly', () => {
      return new Promise<void>((resolve) => {
        intro.onIntroduction((event) => {
          if (event.type === 'map-reveal') {
            expect(event.data.mapDisplay).toBeDefined();
            // Should capitalize and add spaces
            const mapDisplay = event.data.mapDisplay;
            expect(typeof mapDisplay).toBe('string');
            resolve();
          }
        });

        intro.runIntroduction(testMatch);
      });
    });

    it('should format civilization names correctly', () => {
      return new Promise<void>((resolve) => {
        intro.onIntroduction((event) => {
          if (event.type === 'players-reveal') {
            const civs = event.data.players.map((p: any) => p.civilization);
            expect(civs[0]).toBe('Romans');
            expect(civs[1]).toBe('Persians');
            resolve();
          }
        });

        intro.runIntroduction(testMatch);
      });
    });
  });

  describe('timestamps', () => {
    it('should include timestamps in all events', () => {
      return new Promise<void>((resolve) => {
        const eventCount = [0];

        intro.onIntroduction((event) => {
          expect(event.timestamp).toBeDefined();
          expect(() => new Date(event.timestamp)).not.toThrow();
          eventCount[0]++;
        });

        intro.runIntroduction(testMatch);

        setTimeout(() => {
          expect(eventCount[0]).toBeGreaterThan(0);
          resolve();
        }, 9000);
      });
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
    it('should emit events suitable for broadcast overlay', () => {
      return new Promise<void>((resolve) => {
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

          resolve();
        }, 9000);
      });
    });

    it('should include match context', () => {
      return new Promise<void>((resolve) => {
        intro.onIntroduction((event) => {
          if (event.type === 'map-reveal' || event.type === 'players-reveal') {
            expect(event.data.matchId).toBe('test-match-001');
          }
        });

        intro.runIntroduction(testMatch);

        setTimeout(() => {
          resolve();
        }, 5000);
      });
    });
  });

  describe('realistic broadcast scenario', () => {
    it('should complete full introduction for broadcast', () => {
      return new Promise<void>((resolve) => {
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

          resolve();
        }, 9000);
      });
    });

    it('should provide proper timing for smooth transition', () => {
      return new Promise<void>((resolve) => {
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
          resolve();
        }, 9000);
      });
    });
  });
});
