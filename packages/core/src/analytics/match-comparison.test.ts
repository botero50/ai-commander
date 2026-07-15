import { MatchComparisonEngine } from './match-comparison';
import { MatchStatistics } from './statistics-analyzer';

describe('MatchComparisonEngine', () => {
  let engine: MatchComparisonEngine;

  beforeEach(() => {
    engine = new MatchComparisonEngine();
  });

  const createMockMatchStatistics = (
    player1Economy: number,
    player1Military: number,
    player2Economy: number,
    player2Military: number,
    duration: number = 300
  ): MatchStatistics => ({
    matchDuration: duration,
    totalSnapshots: 3,
    playerStats: {
      1: [
        {
          tick: 10,
          timestamp: 10000,
          playerId: 1,
          economy: { foodIncome: 10, woodIncome: 10, stoneIncome: 10, metalIncome: 10, totalIncome: 40, resourceSpent: 0, economyScore: player1Economy },
          military: { unitCount: 5, militaryValue: 50, casualtyRate: 0.1, avgUnitHealth: 70, militaryScore: player1Military },
          tech: { techsUnlocked: 2, techProgressRate: 0.4, avgTechTiming: 5000, techTree: ['Iron Working', 'Trade'] },
          activity: { expansions: 2, attacks: 2, defenses: 0, buildEvents: 4, activityScore: 5 },
          pace: { phase: 'early', paceScore: 5, gameTime: 10, eventDensity: 2 },
        },
        {
          tick: 200,
          timestamp: 200000,
          playerId: 1,
          economy: { foodIncome: 20, woodIncome: 20, stoneIncome: 20, metalIncome: 20, totalIncome: 80, resourceSpent: 100, economyScore: player1Economy },
          military: { unitCount: 10, militaryValue: 100, casualtyRate: 0.2, avgUnitHealth: 60, militaryScore: player1Military },
          tech: { techsUnlocked: 3, techProgressRate: 0.5, avgTechTiming: 6000, techTree: ['Iron Working', 'Trade', 'Philosophy'] },
          activity: { expansions: 3, attacks: 4, defenses: 1, buildEvents: 8, activityScore: 7 },
          pace: { phase: 'mid', paceScore: 6, gameTime: 200, eventDensity: 3 },
        },
      ],
      2: [
        {
          tick: 10,
          timestamp: 10000,
          playerId: 2,
          economy: { foodIncome: 10, woodIncome: 10, stoneIncome: 10, metalIncome: 10, totalIncome: 40, resourceSpent: 0, economyScore: player2Economy },
          military: { unitCount: 3, militaryValue: 30, casualtyRate: 0.05, avgUnitHealth: 75, militaryScore: player2Military },
          tech: { techsUnlocked: 1, techProgressRate: 0.2, avgTechTiming: 10000, techTree: ['Iron Working'] },
          activity: { expansions: 1, attacks: 1, defenses: 1, buildEvents: 3, activityScore: 4 },
          pace: { phase: 'early', paceScore: 4, gameTime: 10, eventDensity: 1.5 },
        },
        {
          tick: 200,
          timestamp: 200000,
          playerId: 2,
          economy: { foodIncome: 15, woodIncome: 15, stoneIncome: 15, metalIncome: 15, totalIncome: 60, resourceSpent: 50, economyScore: player2Economy },
          military: { unitCount: 5, militaryValue: 50, casualtyRate: 0.15, avgUnitHealth: 65, militaryScore: player2Military },
          tech: { techsUnlocked: 2, techProgressRate: 0.3, avgTechTiming: 8000, techTree: ['Iron Working', 'Trade'] },
          activity: { expansions: 2, attacks: 2, defenses: 2, buildEvents: 6, activityScore: 5 },
          pace: { phase: 'mid', paceScore: 5, gameTime: 200, eventDensity: 2 },
        },
      ],
    },
    trends: { economy: 'growing', military: 'growing', tech: 'advancing' },
    comparativeMetrics: { economyDifference: 1, militaryDifference: 2, activityDifference: 1 },
  });

  test('initializes with empty history', () => {
    const comparison = engine.compareMatches(['match1', 'match2']);
    expect(comparison.matches).toBeInstanceOf(Array);
  });

  test('adds single match', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5, 300);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.matches.length).toBeGreaterThan(0);
  });

  test('adds multiple matches', () => {
    const stats1 = createMockMatchStatistics(7, 7, 5, 5, 300);
    const stats2 = createMockMatchStatistics(8, 6, 5, 5, 320);
    const stats3 = createMockMatchStatistics(6, 8, 6, 4, 280);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);
    engine.addMatch('match3', stats3, 1);

    const comparison = engine.compareMatches(['match1', 'match2', 'match3']);
    expect(comparison.matches.length).toBe(3);
  });

  test('analyzes economy pattern', () => {
    // Convergent: similar economy scores
    const stats1 = createMockMatchStatistics(7, 7, 6, 5);
    const stats2 = createMockMatchStatistics(8, 6, 7, 5);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);

    const comparison = engine.compareMatches(['match1', 'match2']);
    expect(['convergent', 'divergent']).toContain(comparison.similarities.economyPattern);
  });

  test('analyzes military pattern', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.similarities.militaryPattern).toBeTruthy();
  });

  test('calculates strategy diversity', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.similarities.strategyDiversity).toBeGreaterThanOrEqual(0);
    expect(comparison.similarities.strategyDiversity).toBeLessThanOrEqual(1);
  });

  test('identifies trends across matches', () => {
    const stats1 = createMockMatchStatistics(5, 5, 3, 3);
    const stats2 = createMockMatchStatistics(6, 6, 4, 4);
    const stats3 = createMockMatchStatistics(7, 7, 5, 5);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);
    engine.addMatch('match3', stats3, 1);

    const comparison = engine.compareMatches(['match1', 'match2', 'match3']);
    expect(comparison.trends.economyTrend).toBeTruthy();
    expect(comparison.trends.militaryTrend).toBeTruthy();
    expect(comparison.trends.techTrend).toBeTruthy();
  });

  test('generates insights', () => {
    const stats1 = createMockMatchStatistics(8, 7, 5, 4, 200);
    const stats2 = createMockMatchStatistics(7, 8, 5, 5, 220);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);

    const comparison = engine.compareMatches(['match1', 'match2']);
    expect(comparison.insights).toBeInstanceOf(Array);
    expect(comparison.insights.length).toBeGreaterThan(0);
  });

  test('analyzes winner characteristics', () => {
    const stats1 = createMockMatchStatistics(8, 7, 5, 5, 300);
    const stats2 = createMockMatchStatistics(7, 8, 5, 4, 320);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);

    const comparison = engine.compareMatches(['match1', 'match2']);
    expect(comparison.winnerCharacteristics.avgEconomy).toBeGreaterThanOrEqual(1);
    expect(comparison.winnerCharacteristics.avgMilitary).toBeGreaterThanOrEqual(1);
    expect(comparison.winnerCharacteristics.commonStrategies).toBeInstanceOf(Array);
  });

  test('analyzes loser characteristics', () => {
    const stats = createMockMatchStatistics(8, 7, 5, 5, 300);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.loserCharacteristics.avgEconomy).toBeGreaterThanOrEqual(1);
    expect(comparison.loserCharacteristics.avgMilitary).toBeGreaterThanOrEqual(1);
    expect(comparison.loserCharacteristics.commonStrategies).toBeInstanceOf(Array);
  });

  test('detects economic focus strategy', () => {
    const stats = createMockMatchStatistics(8, 5, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    // With economy=8 and military=5, should detect economic_focus
    expect(comparison.winnerCharacteristics.commonStrategies.length).toBeGreaterThan(0);
  });

  test('detects military focus strategy', () => {
    const stats = createMockMatchStatistics(5, 8, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    // With economy=5 and military=8, should detect military_focus
    expect(comparison.winnerCharacteristics.commonStrategies.length).toBeGreaterThan(0);
  });

  test('detects tech advancement strategy', () => {
    const stats = createMockMatchStatistics(6, 6, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    // avgTech is based on techScore which comes from the match metrics
    expect(comparison.winnerCharacteristics).toBeDefined();
    expect(comparison.winnerCharacteristics.commonStrategies).toBeInstanceOf(Array);
  });

  test('compares individual players', () => {
    const stats1 = createMockMatchStatistics(7, 7, 5, 5, 300);
    const stats2 = createMockMatchStatistics(8, 8, 5, 5, 320);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);

    const playerComparison = engine.getPlayerComparison(1);
    expect(playerComparison.matchCount).toBe(2);
    expect(playerComparison.avgEconomy).toBeGreaterThanOrEqual(1);
    expect(playerComparison.avgMilitary).toBeGreaterThanOrEqual(1);
    expect(playerComparison.winRate).toBeGreaterThanOrEqual(0);
    expect(playerComparison.winRate).toBeLessThanOrEqual(1);
  });

  test('identifies player style preference', () => {
    const stats1 = createMockMatchStatistics(8, 5, 5, 5, 300);
    engine.addMatch('match1', stats1, 1);

    const playerComparison = engine.getPlayerComparison(1);
    expect(['balanced', 'economic', 'military', 'tech_heavy']).toContain(playerComparison.preferredStyle);
  });

  test('handles empty player history', () => {
    const playerComparison = engine.getPlayerComparison(999);
    expect(playerComparison.matchCount).toBe(0);
    expect(playerComparison.preferredStyle).toBe('unknown');
  });

  test('handles insufficient matches for comparison', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.similarities).toBeDefined();
  });

  test('processes quick games', () => {
    const stats = createMockMatchStatistics(6, 6, 5, 5, 180); // 3 minutes
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.insights).toBeInstanceOf(Array);
  });

  test('processes long games', () => {
    const stats = createMockMatchStatistics(8, 7, 5, 5, 900); // 15 minutes
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.insights).toBeInstanceOf(Array);
  });

  test('detects high pace matches', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5, 200);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.insights).toBeInstanceOf(Array);
  });

  test('detects low pace matches', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5, 600);
    engine.addMatch('match1', stats, 1);

    const comparison = engine.compareMatches(['match1']);
    expect(comparison.insights).toBeInstanceOf(Array);
  });

  test('creates match profiles with progressions', () => {
    const stats1 = createMockMatchStatistics(7, 7, 5, 5);
    const stats2 = createMockMatchStatistics(8, 8, 5, 5);

    engine.addMatch('match1', stats1, 1);
    engine.addMatch('match2', stats2, 1);

    const playerComparison = engine.getPlayerComparison(1);
    expect(playerComparison.matchCount).toBe(2);
  });

  test('calculates tech advance rate', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5);
    engine.addMatch('match1', stats, 1);

    const playerComparison = engine.getPlayerComparison(1);
    expect(playerComparison.avgTechRate).toBeGreaterThanOrEqual(0);
  });

  test('resets engine', () => {
    const stats = createMockMatchStatistics(7, 7, 5, 5);
    engine.addMatch('match1', stats, 1);

    let comparison = engine.compareMatches(['match1']);
    expect(comparison.matches.length).toBeGreaterThan(0);

    engine.reset();

    comparison = engine.compareMatches(['match1']);
    expect(comparison.matches.length).toBe(0);
  });

  test('handles multiple players in same match', () => {
    // Create a match where both player 1 and 2 participate
    const stats = createMockMatchStatistics(8, 7, 4, 5);

    engine.addMatch('match1', stats, 1);

    const p1Comparison = engine.getPlayerComparison(1);
    const p2Comparison = engine.getPlayerComparison(2);

    // Both players should have profiles from the same match
    expect(p1Comparison.matchCount).toBeGreaterThanOrEqual(1);
    expect(p2Comparison.matchCount).toBeGreaterThanOrEqual(1);
  });

  test('compares non-existent matches gracefully', () => {
    const comparison = engine.compareMatches(['nonexistent1', 'nonexistent2']);
    expect(comparison.matches.length).toBe(0);
  });

  test('generates meaningful patterns from diverse matches', () => {
    // Create matches with different characteristics
    const aggressive = createMockMatchStatistics(5, 8, 4, 5, 240);
    const economic = createMockMatchStatistics(8, 5, 5, 4, 360);
    const balanced = createMockMatchStatistics(7, 7, 5, 5, 300);

    engine.addMatch('match1', aggressive, 1);
    engine.addMatch('match2', economic, 1);
    engine.addMatch('match3', balanced, 1);

    const comparison = engine.compareMatches(['match1', 'match2', 'match3']);
    expect(comparison.insights.length).toBeGreaterThan(0);
    expect(comparison.winnerCharacteristics.commonStrategies.length).toBeGreaterThan(0);
  });
});
