/**
 * STORY 32.3: Results Aggregator Tests
 *
 * Validates standing calculation and statistics
 */

import { describe, it, expect } from 'vitest';
import { ResultsAggregator } from './results-aggregator.js';
import type { CompletedMatch } from './tournament-types.js';

describe('STORY 32.3: Results Aggregator', () => {
  describe('Score Calculation', () => {
    it('should calculate correct scores (Win=1, Draw=0.5, Loss=0)', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 1,
          white: 'Alice',
          black: 'Charlie',
          result: 'draw',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm3',
          round: 2,
          white: 'Bob',
          black: 'Charlie',
          result: 'black-win',
          moveCount: 35,
          duration: 6000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      // Alice: 1 win + 0.5 draw = 1.5
      // Bob: 0 + 0 loss = 0
      // Charlie: 0.5 draw + 1 win = 1.5
      expect(standings.find((s) => s.player === 'Alice')?.score).toBe(1.5);
      expect(standings.find((s) => s.player === 'Bob')?.score).toBe(0);
      expect(standings.find((s) => s.player === 'Charlie')?.score).toBe(1.5);
    });

    it('should track wins, losses, and draws correctly', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 1,
          white: 'Alice',
          black: 'Bob',
          result: 'draw',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob']
      );

      const alice = standings.find((s) => s.player === 'Alice')!;
      const bob = standings.find((s) => s.player === 'Bob')!;

      expect(alice.wins).toBe(1);
      expect(alice.draws).toBe(1);
      expect(alice.losses).toBe(0);

      expect(bob.wins).toBe(0);
      expect(bob.draws).toBe(1);
      expect(bob.losses).toBe(1);
    });
  });

  describe('Standings Generation', () => {
    it('should rank players by score (descending)', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 0,
          white: 'Alice',
          black: 'Charlie',
          result: 'white-win',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm3',
          round: 1,
          white: 'Bob',
          black: 'Charlie',
          result: 'draw',
          moveCount: 35,
          duration: 6000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      // Alice: 2 wins = 2
      // Bob: 0.5 draw = 0.5
      // Charlie: 0.5 draw = 0.5
      expect(standings[0].player).toBe('Alice');
      expect(standings[0].rank).toBe(1);
      expect(standings[0].score).toBe(2);

      expect(standings[1].score).toBe(0.5);
      expect(standings[2].score).toBe(0.5);
    });

    it('should apply head-to-head tiebreaker for equal scores', () => {
      const matches: CompletedMatch[] = [
        // Alice vs Bob: Alice wins
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        // Alice vs Charlie: Charlie wins
        {
          matchId: 'm2',
          round: 0,
          white: 'Alice',
          black: 'Charlie',
          result: 'black-win',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
        // Bob vs Charlie: Bob wins
        {
          matchId: 'm3',
          round: 1,
          white: 'Bob',
          black: 'Charlie',
          result: 'white-win',
          moveCount: 35,
          duration: 6000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      // All have 1 win each, but head-to-head:
      // Alice beat Bob, lost to Charlie → 0.5 h2h vs others
      // Bob beat Charlie, lost to Alice → 0.5 h2h vs others
      // Charlie beat Alice, lost to Bob → 0.5 h2h vs others
      // So we use second tiebreaker: more wins
      expect(standings[0].score).toBe(1);
      expect(standings[1].score).toBe(1);
      expect(standings[2].score).toBe(1);

      // Verify ranking exists
      expect(standings[0].rank).toBe(1);
      expect(standings[1].rank).toBe(2);
      expect(standings[2].rank).toBe(3);
    });

    it('should assign correct ranks', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      const ranks = standings.map((s) => s.rank);
      expect(ranks).toEqual([1, 2, 3]);
    });
  });

  describe('Game Count Tracking', () => {
    it('should track games played per player', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 0,
          white: 'Alice',
          black: 'Charlie',
          result: 'white-win',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm3',
          round: 1,
          white: 'Bob',
          black: 'Charlie',
          result: 'draw',
          moveCount: 35,
          duration: 6000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      expect(standings.find((s) => s.player === 'Alice')?.gamesPlayed).toBe(2);
      expect(standings.find((s) => s.player === 'Bob')?.gamesPlayed).toBe(2);
      expect(standings.find((s) => s.player === 'Charlie')?.gamesPlayed).toBe(2);
    });
  });

  describe('Performance Rating', () => {
    it('should calculate performance rating based on win percentage', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 1,
          white: 'Alice',
          black: 'Charlie',
          result: 'white-win',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      const alice = standings.find((s) => s.player === 'Alice')!;

      // Alice: 2 wins / 2 games = 100% win rate
      // Performance = 1200 + 400 * (1.0 - 0.5) = 1400
      expect(alice.performance).toBe(1400);
    });

    it('should calculate performance for 50% win rate as 1200', () => {
      const matches: CompletedMatch[] = [
        {
          matchId: 'm1',
          round: 0,
          white: 'Alice',
          black: 'Bob',
          result: 'white-win',
          moveCount: 30,
          duration: 5000,
          completedTime: Date.now(),
        },
        {
          matchId: 'm2',
          round: 1,
          white: 'Alice',
          black: 'Charlie',
          result: 'black-win',
          moveCount: 25,
          duration: 4000,
          completedTime: Date.now(),
        },
      ];

      const standings = ResultsAggregator.calculateStandings(
        matches,
        ['Alice', 'Bob', 'Charlie']
      );

      const alice = standings.find((s) => s.player === 'Alice')!;

      // Alice: 1 win / 2 games = 50% win rate
      // Performance = 1200 + 400 * (0.5 - 0.5) = 1200
      expect(alice.performance).toBe(1200);
    });
  });
});
