/**
 * Analytics Service Tests
 *
 * Tests for match analytics and statistics collection
 * - Metric collection and aggregation
 * - Win rate calculations
 * - Performance tracking
 * - Statistical summaries
 */

import { describe, it, expect, beforeEach } from 'vitest';

interface MatchMetric {
  playerId: string;
  matchId: string;
  timestamp: number;
  duration: number;
  result: 'win' | 'loss' | 'draw';
  score: number;
  actions: number;
}

interface PlayerStats {
  playerId: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgScore: number;
  avgDuration: number;
  avgActions: number;
}

class MockAnalyticsService {
  private metrics: MatchMetric[] = [];
  private players: Set<string> = new Set();

  recordMatch(metric: MatchMetric): void {
    this.metrics.push(metric);
    this.players.add(metric.playerId);
  }

  getPlayerStats(playerId: string): PlayerStats {
    const playerMetrics = this.metrics.filter(m => m.playerId === playerId);

    if (playerMetrics.length === 0) {
      return {
        playerId,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        avgScore: 0,
        avgDuration: 0,
        avgActions: 0,
      };
    }

    const wins = playerMetrics.filter(m => m.result === 'win').length;
    const losses = playerMetrics.filter(m => m.result === 'loss').length;
    const draws = playerMetrics.filter(m => m.result === 'draw').length;

    const totalScore = playerMetrics.reduce((sum, m) => sum + m.score, 0);
    const totalDuration = playerMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalActions = playerMetrics.reduce((sum, m) => sum + m.actions, 0);

    return {
      playerId,
      matches: playerMetrics.length,
      wins,
      losses,
      draws,
      winRate: wins / playerMetrics.length,
      avgScore: totalScore / playerMetrics.length,
      avgDuration: totalDuration / playerMetrics.length,
      avgActions: totalActions / playerMetrics.length,
    };
  }

  getLeaderboard(): PlayerStats[] {
    return Array.from(this.players).map(id => this.getPlayerStats(id)).sort((a, b) => b.winRate - a.winRate);
  }

  getTotalMatches(): number {
    return this.metrics.length;
  }

  getMetrics(): MatchMetric[] {
    return [...this.metrics];
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  getMatchesByResult(result: 'win' | 'loss' | 'draw'): MatchMetric[] {
    return this.metrics.filter(m => m.result === result);
  }

  clearAnalytics(): void {
    this.metrics = [];
    this.players.clear();
  }

  getMatchStats(matchId: string): { players: string[]; results: Record<string, string> } {
    const matchMetrics = this.metrics.filter(m => m.matchId === matchId);
    const players = [...new Set(matchMetrics.map(m => m.playerId))];
    const results: Record<string, string> = {};

    for (const metric of matchMetrics) {
      results[metric.playerId] = metric.result;
    }

    return { players, results };
  }
}

describe('AnalyticsService', () => {
  let analytics: MockAnalyticsService;

  beforeEach(() => {
    analytics = new MockAnalyticsService();
  });

  describe('Metric Collection', () => {
    it('should record match metrics', () => {
      const metric: MatchMetric = {
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'win',
        score: 100,
        actions: 45,
      };

      analytics.recordMatch(metric);
      expect(analytics.getTotalMatches()).toBe(1);
    });

    it('should track multiple matches', () => {
      for (let i = 0; i < 10; i++) {
        analytics.recordMatch({
          playerId: `p${i % 3}`,
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600 + i * 100,
          result: i % 2 === 0 ? 'win' : 'loss',
          score: 100 + i * 10,
          actions: 40 + i,
        });
      }

      expect(analytics.getTotalMatches()).toBe(10);
    });

    it('should preserve metric data', () => {
      const metric: MatchMetric = {
        playerId: 'p1',
        matchId: 'm1',
        timestamp: 1000,
        duration: 3600,
        result: 'win',
        score: 150,
        actions: 50,
      };

      analytics.recordMatch(metric);
      const metrics = analytics.getMetrics();
      expect(metrics[0]).toEqual(metric);
    });
  });

  describe('Player Statistics', () => {
    it('should calculate win rate', () => {
      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'win',
        score: 100,
        actions: 45,
      });

      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm2',
        timestamp: Date.now(),
        duration: 3600,
        result: 'loss',
        score: 80,
        actions: 40,
      });

      const stats = analytics.getPlayerStats('p1');
      expect(stats.winRate).toBe(0.5);
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
    });

    it('should calculate average metrics', () => {
      for (let i = 0; i < 3; i++) {
        analytics.recordMatch({
          playerId: 'p1',
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600,
          result: 'win',
          score: 100,
          actions: 50,
        });
      }

      const stats = analytics.getPlayerStats('p1');
      expect(stats.avgScore).toBe(100);
      expect(stats.avgDuration).toBe(3600);
      expect(stats.avgActions).toBe(50);
    });

    it('should handle players with no matches', () => {
      const stats = analytics.getPlayerStats('unknown');
      expect(stats.matches).toBe(0);
      expect(stats.winRate).toBe(0);
      expect(stats.wins).toBe(0);
    });

    it('should track draws', () => {
      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'draw',
        score: 90,
        actions: 45,
      });

      const stats = analytics.getPlayerStats('p1');
      expect(stats.draws).toBe(1);
      expect(stats.matches).toBe(1);
    });
  });

  describe('Leaderboard', () => {
    it('should generate sorted leaderboard', () => {
      // Player 1: 3 wins, 0 losses = 100% win rate
      for (let i = 0; i < 3; i++) {
        analytics.recordMatch({
          playerId: 'p1',
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600,
          result: 'win',
          score: 100,
          actions: 45,
        });
      }

      // Player 2: 1 win, 2 losses = 33% win rate
      for (let i = 0; i < 3; i++) {
        analytics.recordMatch({
          playerId: 'p2',
          matchId: `m${i + 3}`,
          timestamp: Date.now(),
          duration: 3600,
          result: i === 0 ? 'win' : 'loss',
          score: 80,
          actions: 40,
        });
      }

      const board = analytics.getLeaderboard();
      expect(board[0].playerId).toBe('p1');
      expect(board[1].playerId).toBe('p2');
    });

    it('should include all players', () => {
      for (let i = 0; i < 5; i++) {
        analytics.recordMatch({
          playerId: `p${i}`,
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600,
          result: 'win',
          score: 100,
          actions: 45,
        });
      }

      const board = analytics.getLeaderboard();
      expect(board.length).toBe(5);
    });
  });

  describe('Match Statistics', () => {
    it('should retrieve match results by player', () => {
      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'win',
        score: 100,
        actions: 45,
      });

      analytics.recordMatch({
        playerId: 'p2',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'loss',
        score: 80,
        actions: 40,
      });

      const match = analytics.getMatchStats('m1');
      expect(match.players).toContain('p1');
      expect(match.players).toContain('p2');
      expect(match.results['p1']).toBe('win');
      expect(match.results['p2']).toBe('loss');
    });
  });

  describe('Result Filtering', () => {
    it('should filter by result type', () => {
      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'win',
        score: 100,
        actions: 45,
      });

      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm2',
        timestamp: Date.now(),
        duration: 3600,
        result: 'loss',
        score: 80,
        actions: 40,
      });

      const wins = analytics.getMatchesByResult('win');
      const losses = analytics.getMatchesByResult('loss');

      expect(wins.length).toBe(1);
      expect(losses.length).toBe(1);
    });
  });

  describe('Performance', () => {
    it('should handle large metric volumes', () => {
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        analytics.recordMatch({
          playerId: `p${i % 10}`,
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600,
          result: ['win', 'loss', 'draw'][i % 3] as 'win' | 'loss' | 'draw',
          score: 80 + Math.random() * 40,
          actions: 40 + Math.random() * 20,
        });
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should record 1000 metrics in <1 second
      expect(analytics.getTotalMatches()).toBe(1000);
    });

    it('should efficiently calculate leaderboard', () => {
      for (let i = 0; i < 100; i++) {
        for (let j = 0; j < 10; j++) {
          analytics.recordMatch({
            playerId: `p${i}`,
            matchId: `m${i}-${j}`,
            timestamp: Date.now(),
            duration: 3600,
            result: j % 2 === 0 ? 'win' : 'loss',
            score: 100,
            actions: 45,
          });
        }
      }

      const start = Date.now();
      const board = analytics.getLeaderboard();
      const elapsed = Date.now() - start;

      expect(board.length).toBe(100);
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Data Management', () => {
    it('should clear all analytics', () => {
      analytics.recordMatch({
        playerId: 'p1',
        matchId: 'm1',
        timestamp: Date.now(),
        duration: 3600,
        result: 'win',
        score: 100,
        actions: 45,
      });

      expect(analytics.getTotalMatches()).toBe(1);
      analytics.clearAnalytics();
      expect(analytics.getTotalMatches()).toBe(0);
    });

    it('should track unique players', () => {
      for (let i = 0; i < 5; i++) {
        analytics.recordMatch({
          playerId: `p${i}`,
          matchId: `m${i}`,
          timestamp: Date.now(),
          duration: 3600,
          result: 'win',
          score: 100,
          actions: 45,
        });
      }

      expect(analytics.getPlayerCount()).toBe(5);
    });
  });
});
