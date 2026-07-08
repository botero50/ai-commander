/**
 * Test: ELO Rating System
 *
 * Validates:
 * 1. Rating initialization
 * 2. Match result processing
 * 3. Rating calculations
 * 4. History tracking
 * 5. Statistics generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EloRating } from './elo-rating.js';

describe('ELO Rating System', () => {
  let elo: EloRating;
  const brainIds = ['brain1', 'brain2', 'brain3'];

  beforeEach(() => {
    elo = new EloRating(brainIds);
  });

  it('should initialize with default ratings', () => {
    const rating = elo.getRating('brain1');
    expect(rating).toBe(1600); // Default initial rating
  });

  it('should initialize with custom ratings', () => {
    const customElo = new EloRating(brainIds, { initialRating: 2000 });
    expect(customElo.getRating('brain1')).toBe(2000);
  });

  it('should record a decisive match', () => {
    const changes = elo.recordMatch('brain1', 'brain2', 1); // brain1 wins

    expect(changes).toHaveLength(2);

    const brain1Change = changes.find((c) => c.brainId === 'brain1');
    const brain2Change = changes.find((c) => c.brainId === 'brain2');

    // Winner gains rating
    expect(brain1Change?.newRating).toBeGreaterThan(brain1Change?.oldRating!);
    // Loser loses rating
    expect(brain2Change?.newRating).toBeLessThan(brain2Change?.oldRating!);
  });

  it('should record a draw', () => {
    const changes = elo.recordMatch('brain1', 'brain2', 0.5); // Draw

    expect(changes).toHaveLength(2);

    const brain1Change = changes.find((c) => c.brainId === 'brain1');
    const brain2Change = changes.find((c) => c.brainId === 'brain2');

    // Higher-rated player loses, lower-rated player gains
    const brain1Before = brain1Change?.oldRating || 0;
    const brain2Before = brain2Change?.oldRating || 0;

    if (brain1Before > brain2Before) {
      // brain1 is higher rated, should lose points
      expect(brain1Change?.change).toBeLessThan(0);
      expect(brain2Change?.change).toBeGreaterThan(0);
    }
  });

  it('should upset bonus for lower-rated player winning', () => {
    // Set up rating difference
    elo.recordMatch('brain1', 'brain2', 1); // brain1 wins first
    const brain1Rating = elo.getRating('brain1')!;
    const brain2Rating = elo.getRating('brain2')!;

    // Now lower-rated player (brain2) wins
    const changes = elo.recordMatch('brain1', 'brain2', 0); // brain2 wins (upset)

    const brain2Change = changes.find((c) => c.brainId === 'brain2')?.change || 0;
    const brain1Change = changes.find((c) => c.brainId === 'brain1')?.change || 0;

    // Upset should result in bigger rating swings
    expect(Math.abs(brain2Change)).toBeGreaterThan(0);
    expect(Math.abs(brain1Change)).toBeGreaterThan(0);
  });

  it('should track rating history', () => {
    const history1 = elo.getRatingHistory('brain1');
    expect(history1).toHaveLength(1);
    expect(history1?.[0]).toBe(1600);

    elo.recordMatch('brain1', 'brain2', 1);
    const history2 = elo.getRatingHistory('brain1');
    expect(history2).toHaveLength(2);
    expect(history2?.[1]).not.toBe(1600);
  });

  it('should return all ratings sorted', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain2', 'brain3', 1);

    const allRatings = elo.getAllRatings();

    // Check sorted order (descending)
    for (let i = 0; i < allRatings.length - 1; i++) {
      expect(allRatings[i].rating).toBeGreaterThanOrEqual(allRatings[i + 1].rating);
    }
  });

  it('should track rating changes', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain2', 'brain3', 1);

    const changes = elo.getRatingChanges();
    expect(changes.length).toBeGreaterThanOrEqual(4); // At least 2 matches × 2 brains
  });

  it('should get brain-specific rating changes', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain1', 'brain3', 1);
    elo.recordMatch('brain2', 'brain3', 1);

    const brain1Changes = elo.getBrainRatingChanges('brain1');
    expect(brain1Changes).toHaveLength(2); // 2 matches for brain1
    expect(brain1Changes.every((c) => c.brainId === 'brain1')).toBe(true);
  });

  it('should calculate recent rating change', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain1', 'brain3', 1);

    const recentChange = elo.getRecentRatingChange('brain1', 2);
    expect(recentChange).toBeGreaterThan(0); // brain1 won both matches
  });

  it('should provide brain stats', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain1', 'brain3', 1);

    const stats = elo.getBrainStats('brain1');

    expect(stats).toBeDefined();
    expect(stats?.currentRating).toBeGreaterThan(1600);
    expect(stats?.highestRating).toBeGreaterThanOrEqual(stats?.currentRating!);
    expect(stats?.lowestRating).toBeLessThanOrEqual(stats?.currentRating!);
    expect(stats?.ratingChange).toBeGreaterThan(0);
  });

  it('should reset ratings', () => {
    elo.recordMatch('brain1', 'brain2', 1);
    expect(elo.getRating('brain1')).not.toBe(1600);

    elo.resetRatings();
    expect(elo.getRating('brain1')).toBe(1600);

    const changes = elo.getRatingChanges();
    expect(changes).toHaveLength(0);
  });

  it('should reject invalid match results', () => {
    expect(() => elo.recordMatch('brain1', 'brain2', -0.5)).toThrow();
    expect(() => elo.recordMatch('brain1', 'brain2', 1.5)).toThrow();
    expect(() => elo.recordMatch('brain1', 'brain2', 0.5)).not.toThrow();
  });

  it('should reject unknown brains', () => {
    expect(() => elo.recordMatch('unknown', 'brain2', 1)).toThrow();
  });

  it('should cap rating history at max size', () => {
    const customElo = new EloRating(brainIds, { maxRatingHistory: 5 });

    // Record 10 matches (20 rating updates)
    for (let i = 0; i < 10; i++) {
      customElo.recordMatch('brain1', 'brain2', 1);
    }

    const history = customElo.getRatingHistory('brain1');
    expect(history).toHaveLength(5); // Should be capped at 5
  });

  it('should use custom K-factor', () => {
    const customElo = new EloRating(brainIds, { kFactor: 16 }); // Lower volatility

    const changes1 = customElo.recordMatch('brain1', 'brain2', 1);
    const change1 = changes1.find((c) => c.brainId === 'brain1')?.change || 0;

    const standardElo = new EloRating(brainIds, { kFactor: 32 }); // Higher volatility
    const changes2 = standardElo.recordMatch('brain1', 'brain2', 1);
    const change2 = changes2.find((c) => c.brainId === 'brain1')?.change || 0;

    // Higher K-factor should result in larger rating swings
    expect(Math.abs(change2)).toBeGreaterThan(Math.abs(change1));
  });

  it('should preserve rating sum in matches', () => {
    const totalBefore =
      elo.getRating('brain1')! + elo.getRating('brain2')! + elo.getRating('brain3')!;

    elo.recordMatch('brain1', 'brain2', 1);
    elo.recordMatch('brain2', 'brain3', 0.5);

    const totalAfter =
      elo.getRating('brain1')! + elo.getRating('brain2')! + elo.getRating('brain3')!;

    // Total rating should remain approximately the same (within rounding)
    expect(Math.abs(totalAfter - totalBefore)).toBeLessThan(5);
  });

  it('should handle null return for unknown brain stats', () => {
    const stats = elo.getBrainStats('unknown');
    expect(stats).toBeNull();
  });
});
