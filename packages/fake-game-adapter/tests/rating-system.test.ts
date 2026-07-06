import { describe, it, expect, beforeEach } from 'vitest';
import { RatingSystem, RatingTracker } from '../src/world/rating-system.js';

describe('Rating System', () => {
  let rating: RatingSystem;

  beforeEach(() => {
    rating = new RatingSystem();
  });

  describe('Initialization', () => {
    it('starts with default rating', () => {
      const snapshot = rating.getSnapshot();
      expect(snapshot.rating).toBe(1600);
    });

    it('accepts custom initial rating', () => {
      const custom = new RatingSystem({ initialRating: 2000 });
      expect(custom.getSnapshot().rating).toBe(2000);
    });

    it('starts with zero matches', () => {
      const snapshot = rating.getSnapshot();
      expect(snapshot.totalMatches).toBe(0);
      expect(snapshot.wins).toBe(0);
      expect(snapshot.losses).toBe(0);
      expect(snapshot.draws).toBe(0);
    });
  });

  describe('ELO Rating', () => {
    it('increases rating on win vs equal opponent', () => {
      const before = rating.getSnapshot().rating;
      rating.recordMatch(1600, 'win');
      const after = rating.getSnapshot().rating;

      expect(after).toBeGreaterThan(before);
    });

    it('decreases rating on loss vs equal opponent', () => {
      const before = rating.getSnapshot().rating;
      rating.recordMatch(1600, 'loss');
      const after = rating.getSnapshot().rating;

      expect(after).toBeLessThan(before);
    });

    it('gains more from beating stronger opponent', () => {
      const r1 = new RatingSystem();
      const r2 = new RatingSystem();

      const before1 = r1.getSnapshot().rating;
      r1.recordMatch(1200, 'win'); // weaker
      const gain1 = r1.getSnapshot().rating - before1;

      const before2 = r2.getSnapshot().rating;
      r2.recordMatch(2000, 'win'); // stronger
      const gain2 = r2.getSnapshot().rating - before2;

      expect(gain2).toBeGreaterThan(gain1);
    });

    it('loses more to weaker opponent', () => {
      const r1 = new RatingSystem();
      const r2 = new RatingSystem();

      const before1 = r1.getSnapshot().rating;
      r1.recordMatch(1200, 'loss'); // weaker
      const loss1 = before1 - r1.getSnapshot().rating;

      const before2 = r2.getSnapshot().rating;
      r2.recordMatch(2000, 'loss'); // stronger
      const loss2 = before2 - r2.getSnapshot().rating;

      expect(loss1).toBeGreaterThan(loss2);
    });

    it('handles draws', () => {
      const before = rating.getSnapshot().rating;
      rating.recordMatch(1600, 'draw');
      const after = rating.getSnapshot().rating;

      // Draw vs equal should be small change
      expect(Math.abs(after - before)).toBeLessThan(16);
    });

    it('uses custom k-factor', () => {
      const standard = new RatingSystem({ kFactor: 32 });
      const aggressive = new RatingSystem({ kFactor: 64 });

      standard.recordMatch(1600, 'win');
      aggressive.recordMatch(1600, 'win');

      const stdGain = standard.getSnapshot().rating - 1600;
      const aggGain = aggressive.getSnapshot().rating - 1600;

      expect(aggGain).toBeGreaterThan(stdGain);
    });
  });

  describe('Match History', () => {
    it('tracks wins', () => {
      rating.recordMatch(1600, 'win');
      rating.recordMatch(1600, 'win');
      const snapshot = rating.getSnapshot();

      expect(snapshot.wins).toBe(2);
      expect(snapshot.totalMatches).toBe(2);
    });

    it('tracks losses', () => {
      rating.recordMatch(1600, 'loss');
      rating.recordMatch(1600, 'loss');
      const snapshot = rating.getSnapshot();

      expect(snapshot.losses).toBe(2);
      expect(snapshot.totalMatches).toBe(2);
    });

    it('tracks draws', () => {
      rating.recordMatch(1600, 'draw');
      rating.recordMatch(1600, 'draw');
      const snapshot = rating.getSnapshot();

      expect(snapshot.draws).toBe(2);
      expect(snapshot.totalMatches).toBe(2);
    });
  });

  describe('Win Rate', () => {
    it('calculates win rate excluding draws', () => {
      rating.recordMatch(1600, 'win');
      rating.recordMatch(1600, 'win');
      rating.recordMatch(1600, 'loss');
      rating.recordMatch(1600, 'draw');

      const snapshot = rating.getSnapshot();
      expect(snapshot.winRate).toBeCloseTo(2 / 3, 2);
    });

    it('handles no decisions', () => {
      rating.recordMatch(1600, 'draw');
      const snapshot = rating.getSnapshot();

      expect(snapshot.winRate).toBe(0);
    });

    it('100% win rate', () => {
      rating.recordMatch(1600, 'win');
      rating.recordMatch(1600, 'win');
      const snapshot = rating.getSnapshot();

      expect(snapshot.winRate).toBe(1);
    });
  });

  describe('Draw Rate', () => {
    it('calculates draw rate', () => {
      rating.recordMatch(1600, 'draw');
      rating.recordMatch(1600, 'draw');
      rating.recordMatch(1600, 'win');
      const snapshot = rating.getSnapshot();

      expect(snapshot.drawRate).toBeCloseTo(2 / 3, 2);
    });

    it('zero draws', () => {
      rating.recordMatch(1600, 'win');
      const snapshot = rating.getSnapshot();

      expect(snapshot.drawRate).toBe(0);
    });
  });

  describe('Confidence Interval', () => {
    it('has larger margin with fewer matches', () => {
      const r1 = new RatingSystem();
      r1.recordMatch(1600, 'win');
      const ci1 = r1.getSnapshot().confidenceInterval;

      const r2 = new RatingSystem();
      for (let i = 0; i < 10; i++) {
        r2.recordMatch(1600, 'win');
      }
      const ci2 = r2.getSnapshot().confidenceInterval;

      expect(ci1.margin).toBeGreaterThan(ci2.margin);
    });

    it('narrows with more matches', () => {
      const margins: number[] = [];

      for (let i = 0; i < 5; i++) {
        rating.recordMatch(1600, 'win');
        margins.push(rating.getSnapshot().confidenceInterval.margin);
      }

      for (let i = 1; i < margins.length; i++) {
        expect(margins[i]).toBeLessThan(margins[i - 1]);
      }
    });

    it('is 95% confidence', () => {
      const snapshot = rating.getSnapshot();
      expect(snapshot.confidenceInterval.lower).toBeLessThan(snapshot.rating);
      expect(snapshot.confidenceInterval.upper).toBeGreaterThan(snapshot.rating);
    });

    it('includes rating in interval', () => {
      rating.recordMatch(1600, 'win');
      rating.recordMatch(1600, 'loss');

      const snapshot = rating.getSnapshot();
      expect(snapshot.confidenceInterval.lower).toBeLessThan(snapshot.rating);
      expect(snapshot.confidenceInterval.upper).toBeGreaterThan(snapshot.rating);
    });
  });

  describe('Reset', () => {
    it('resets rating to initial', () => {
      rating.recordMatch(1600, 'win');
      expect(rating.getSnapshot().rating).toBeGreaterThan(1600);

      rating.reset();
      const snapshot = rating.getSnapshot();

      expect(snapshot.rating).toBe(1600);
      expect(snapshot.wins).toBe(0);
      expect(snapshot.losses).toBe(0);
      expect(snapshot.draws).toBe(0);
    });
  });
});

describe('Rating Tracker', () => {
  let tracker: RatingTracker;

  beforeEach(() => {
    tracker = new RatingTracker();
  });

  describe('Multi-Player Tracking', () => {
    it('tracks multiple players', () => {
      tracker.recordMatch('p1', 'p2', 'player1');
      tracker.recordMatch('p1', 'p3', 'player1');

      const rankings = tracker.getRankings();
      expect(rankings.length).toBeGreaterThanOrEqual(2);
    });

    it('records match results', () => {
      tracker.recordMatch('p1', 'p2', 'player1');

      const p1 = tracker.getRating('p1').getSnapshot();
      const p2 = tracker.getRating('p2').getSnapshot();

      expect(p1.wins).toBe(1);
      expect(p2.losses).toBe(1);
    });

    it('both players start at same rating', () => {
      tracker.recordMatch('p1', 'p2', 'player1');

      const p1 = tracker.getRating('p1').getSnapshot();
      const p2 = tracker.getRating('p2').getSnapshot();

      // Equal rating before match, then diverge
      expect(p1.rating).toBeGreaterThan(1600);
      expect(p2.rating).toBeLessThan(1600);
    });
  });

  describe('Rankings', () => {
    it('sorts by rating descending', () => {
      tracker.recordMatch('p1', 'p2', 'player1');
      tracker.recordMatch('p1', 'p3', 'player1');
      tracker.recordMatch('p2', 'p3', 'player1');

      const rankings = tracker.getRankings();

      for (let i = 0; i < rankings.length - 1; i++) {
        expect(rankings[i].snapshot.rating).toBeGreaterThanOrEqual(rankings[i + 1].snapshot.rating);
      }
    });

    it('includes all players', () => {
      tracker.recordMatch('p1', 'p2', 'player1');
      tracker.recordMatch('p2', 'p3', 'player1');

      const rankings = tracker.getRankings();
      const ids = rankings.map((r) => r.playerId);

      expect(ids).toContain('p1');
      expect(ids).toContain('p2');
      expect(ids).toContain('p3');
    });
  });

  describe('Draw Handling', () => {
    it('records draws for both players', () => {
      tracker.recordMatch('p1', 'p2', 'draw');

      const p1 = tracker.getRating('p1').getSnapshot();
      const p2 = tracker.getRating('p2').getSnapshot();

      expect(p1.draws).toBe(1);
      expect(p2.draws).toBe(1);
    });

    it('updates ratings for draws vs different ratings', () => {
      // Create imbalanced match
      const p1System = tracker.getRating('p1');
      p1System.recordMatch(1200, 'win'); // p1 is now stronger

      const p1Before = p1System.getSnapshot().rating;

      tracker.recordMatch('p1', 'p2', 'draw');

      const p1After = tracker.getRating('p1').getSnapshot().rating;
      const p2 = tracker.getRating('p2').getSnapshot().rating;

      // p1 loses rating (expected to win), p2 gains rating (expected to lose)
      expect(p1After).toBeLessThan(p1Before);
      expect(p2).not.toBe(1600);
    });
  });

  describe('Reset', () => {
    it('clears all ratings', () => {
      tracker.recordMatch('p1', 'p2', 'player1');
      tracker.resetAll();

      const rankings = tracker.getRankings();
      expect(rankings.length).toBe(0);
    });

    it('allows fresh ratings after reset', () => {
      tracker.recordMatch('p1', 'p2', 'player1');
      tracker.resetAll();

      tracker.recordMatch('p1', 'p2', 'player2');

      const p1 = tracker.getRating('p1').getSnapshot();
      const p2 = tracker.getRating('p2').getSnapshot();

      expect(p1.losses).toBe(1);
      expect(p2.wins).toBe(1);
    });
  });

  describe('Convergence', () => {
    it('ratings converge over many matches', () => {
      // p1 is stronger, beats p2 repeatedly
      for (let i = 0; i < 20; i++) {
        tracker.recordMatch('p1', 'p2', 'player1');
      }

      const p1Rating = tracker.getRating('p1').getSnapshot().rating;
      const p2Rating = tracker.getRating('p2').getSnapshot().rating;

      expect(p1Rating).toBeGreaterThan(1600);
      expect(p2Rating).toBeLessThan(1600);
      expect(p1Rating - p2Rating).toBeGreaterThan(100);
    });
  });
});
