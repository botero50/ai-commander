import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveLearningSystem, globalAdaptiveLearning } from '../src/world/adaptive-learning.js';
import { createInitialWorld } from '../src/world/fake-world-state.js';

describe('Adaptive Learning System', () => {
  let learning: AdaptiveLearningSystem;
  let world = createInitialWorld();

  beforeEach(() => {
    learning = new AdaptiveLearningSystem();
    world = createInitialWorld();
  });

  describe('Match Recording', () => {
    it('records match outcome', () => {
      learning.recordMatchOutcome('aggressive', 'opponent1', true, 500, 0.85);

      const history = learning.getMatchHistory();
      expect(history.length).toBe(1);
      expect(history[0].strategyUsed).toBe('aggressive');
      expect(history[0].won).toBe(true);
    });

    it('tracks multiple matches', () => {
      learning.recordMatchOutcome('aggressive', 'opponent1', true, 500, 0.85);
      learning.recordMatchOutcome('defensive', 'opponent2', false, 600, 0.70);
      learning.recordMatchOutcome('aggressive', 'opponent1', false, 400, 0.75);

      const history = learning.getMatchHistory();
      expect(history.length).toBe(3);
    });

    it('calculates strategy win rate', () => {
      learning.recordMatchOutcome('aggressive', 'opponent1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opponent1', true, 450, 0.80);
      learning.recordMatchOutcome('aggressive', 'opponent1', false, 600, 0.75);

      const metrics = learning.analyzeStrategyEffectiveness();
      // 2 wins out of 3 matches
      expect(metrics.bestStrategy).toBe('aggressive');
    });

    it('tracks average duration', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp1', true, 600, 0.85);

      // Average should be 550
      const history = learning.getMatchHistory();
      expect(history[0].duration).toBe(500);
      expect(history[1].duration).toBe(600);
    });

    it('tracks resource efficiency', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.95);

      const history = learning.getMatchHistory();
      expect(history[0].resourceEfficiency).toBe(0.85);
      expect(history[1].resourceEfficiency).toBe(0.95);
    });
  });

  describe('Strategy Effectiveness Analysis', () => {
    it('analyzes overall win rate', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp2', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp3', false, 500, 0.75);

      const metrics = learning.analyzeStrategyEffectiveness();
      // 2 wins out of 3 = 66.7%
      expect(metrics.averageWinRate).toBeGreaterThan(60);
      expect(metrics.averageWinRate).toBeLessThan(70);
    });

    it('tracks total matches', () => {
      for (let i = 0; i < 10; i++) {
        learning.recordMatchOutcome('strategy', `opp${i}`, i % 2 === 0, 500, 0.80);
      }

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.totalMatches).toBe(10);
    });

    it('identifies best strategy', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp2', true, 500, 0.85);
      learning.recordMatchOutcome('defensive', 'opp3', false, 500, 0.75);

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.bestStrategy).toBe('aggressive');
    });

    it('identifies worst strategy', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('passive', 'opp2', false, 500, 0.50);
      learning.recordMatchOutcome('passive', 'opp3', false, 500, 0.45);

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.worstStrategy).toBe('passive');
    });

    it('calculates learning rate', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp2', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp3', true, 500, 0.85);

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.learningRate).toBeGreaterThan(0);
      expect(metrics.learningRate).toBeLessThanOrEqual(100);
    });

    it('calculates confidence level', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.confidenceLevel).toBeGreaterThan(0);
      expect(metrics.confidenceLevel).toBeLessThanOrEqual(100);
    });

    it('increases confidence with more matches', () => {
      const metrics1 = learning.analyzeStrategyEffectiveness();

      for (let i = 0; i < 10; i++) {
        learning.recordMatchOutcome('strategy', `opp${i}`, true, 500, 0.85);
      }

      const metrics2 = learning.analyzeStrategyEffectiveness();
      expect(metrics2.confidenceLevel).toBeGreaterThan(metrics1.confidenceLevel);
    });
  });

  describe('Strategy Recommendation', () => {
    it('provides recommendation when data exists', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('passive', 'opp2', false, 500, 0.50);

      const recommendation = learning.getStrategyRecommendation();
      expect(recommendation.recommendation).toBeDefined();
      expect(recommendation.rationale).toBeDefined();
    });

    it('recommends best strategy', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('aggressive', 'opp2', true, 500, 0.85);
      learning.recordMatchOutcome('passive', 'opp3', false, 500, 0.50);

      const recommendation = learning.getStrategyRecommendation();
      expect(recommendation.recommendation).toContain('aggressive');
    });

    it('provides win rate improvement estimate', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('passive', 'opp2', false, 500, 0.50);

      const recommendation = learning.getStrategyRecommendation();
      expect(recommendation.expectedWinRateImprovement).toBeGreaterThanOrEqual(0);
    });

    it('provides confidence score', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);

      const recommendation = learning.getStrategyRecommendation();
      expect(recommendation.confidence).toBeGreaterThanOrEqual(0);
      expect(recommendation.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Opponent Adaptation', () => {
    it('adapts tactics for new opponent', () => {
      const adaptation = learning.adaptTactic('new-opponent');

      expect(adaptation.recommendation).toBeDefined();
      expect(adaptation.rationale).toContain('No prior');
    });

    it('adapts against strong opponent we keep losing to', () => {
      // Record losses against opponent we can't beat
      learning.recordMatchOutcome('strategy', 'strong-opp', false, 500, 0.50);
      learning.recordMatchOutcome('strategy', 'strong-opp', false, 500, 0.50);
      learning.recordMatchOutcome('strategy', 'strong-opp', false, 500, 0.50);
      learning.recordMatchOutcome('strategy', 'strong-opp', false, 500, 0.50);

      const adaptation = learning.adaptTactic('strong-opp');
      expect(adaptation.recommendation).toContain('unconventional');
    });

    it('maintains strategy when winning consistently', () => {
      // Record wins against opponent
      learning.recordMatchOutcome('strategy', 'weak-opp', true, 500, 0.90);
      learning.recordMatchOutcome('strategy', 'weak-opp', true, 500, 0.90);
      learning.recordMatchOutcome('strategy', 'weak-opp', true, 500, 0.90);
      learning.recordMatchOutcome('strategy', 'weak-opp', true, 500, 0.90);

      const adaptation = learning.adaptTactic('weak-opp');
      expect(adaptation.recommendation).toContain('winning');
    });

    it('tracks adaptation history', () => {
      // Create opponents with match history first
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp2', true, 500, 0.85);

      learning.adaptTactic('opp1');
      learning.adaptTactic('opp2');
      learning.adaptTactic('opp1');

      const history = learning.getAdaptationHistory();
      expect(history.length).toBe(3);
    });

    it('calculates adaptation confidence', () => {
      learning.recordMatchOutcome('strategy', 'opp', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp', false, 500, 0.75);

      const adaptation = learning.adaptTactic('opp');
      expect(adaptation.confidence).toBeGreaterThan(0);
    });
  });

  describe('Weakness Identification', () => {
    it('detects no units remaining', () => {
      const snapshot = {
        ...world,
        workers: [],
        militaryUnits: [],
      } as any;

      const weakness = learning.identifyWeakness(snapshot);
      expect(weakness).toContain('No units');
    });

    it('detects no workers with military', () => {
      const snapshot = {
        ...world,
        workers: [],
        militaryUnits: [{ id: 'm1', type: 'infantry', x: 0, y: 0, health: 100 }],
      } as any;

      const weakness = learning.identifyWeakness(snapshot);
      expect(weakness).toContain('No workers');
    });

    it('detects no military defense', () => {
      const snapshot = {
        ...world,
        workers: [{ id: 0, x: 0, y: 0, carrying: 0, busy: false }],
        militaryUnits: [],
        knownEnemies: [{ unitId: 'e1', x: 20, y: 20, lastSeen: 0 }],
      } as any;

      const weakness = learning.identifyWeakness(snapshot);
      expect(weakness).toContain('No military');
    });

    it('detects resource scarcity', () => {
      const snapshot = {
        ...world,
        workers: [{ id: 0, x: 0, y: 0, carrying: 0, busy: false }],
        militaryUnits: [],
        playerResources: 30,
      } as any;

      const weakness = learning.identifyWeakness(snapshot);
      expect(weakness).toBeDefined();
    });

    it('reports normal status', () => {
      const weakness = learning.identifyWeakness(world);
      expect(weakness).toBeDefined();
    });
  });

  describe('Lessons Learned', () => {
    it('generates lessons from data', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp2', true, 500, 0.90);

      const lessons = learning.getLessonsLearned();
      expect(Array.isArray(lessons)).toBe(true);
    });

    it('notes high win rate', () => {
      for (let i = 0; i < 20; i++) {
        learning.recordMatchOutcome('effective', `opp${i}`, i < 18, 500, 0.85);
      }

      const lessons = learning.getLessonsLearned();
      expect(lessons.some((l) => l.includes('High win rate'))).toBe(true);
    });

    it('notes low win rate', () => {
      for (let i = 0; i < 20; i++) {
        learning.recordMatchOutcome('ineffective', `opp${i}`, i > 17, 500, 0.50);
      }

      const lessons = learning.getLessonsLearned();
      expect(lessons.some((l) => l.includes('Low win rate'))).toBe(true);
    });

    it('notes limited strategy diversity', () => {
      learning.recordMatchOutcome('only-strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('only-strategy', 'opp2', true, 500, 0.85);

      const lessons = learning.getLessonsLearned();
      expect(lessons.some((l) => l.includes('Limited strategy'))).toBe(true);
    });

    it('notes resource efficiency', () => {
      learning.recordMatchOutcome('efficient', 'opp1', true, 500, 0.95);
      learning.recordMatchOutcome('inefficient', 'opp2', true, 500, 0.50);

      const lessons = learning.getLessonsLearned();
      expect(lessons.length).toBeGreaterThan(0);
    });
  });

  describe('Report Generation', () => {
    it('generates comprehensive report', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('defensive', 'opp2', false, 600, 0.70);

      const report = learning.generateLearningReport();
      expect(report).toContain('ADAPTIVE LEARNING REPORT');
      expect(report).toContain('PERFORMANCE METRICS');
      expect(report).toContain('STRATEGY ANALYSIS');
      expect(report).toContain('OPPONENT ANALYSIS');
      expect(report).toContain('RECOMMENDATION');
    });

    it('includes match statistics in report', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp2', false, 600, 0.70);

      const report = learning.generateLearningReport();
      expect(report).toContain('Total Matches: 2');
      expect(report).toContain('Total Wins: 1');
      expect(report).toContain('Total Losses: 1');
    });

    it('includes strategy details', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);

      const report = learning.generateLearningReport();
      expect(report).toContain('aggressive');
      expect(report).toContain('Win Rate');
    });

    it('includes opponent analysis', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);

      const report = learning.generateLearningReport();
      expect(report).toContain('OPPONENT ANALYSIS');
      expect(report).toContain('opp1');
    });

    it('includes recommendations', () => {
      learning.recordMatchOutcome('aggressive', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('passive', 'opp2', false, 500, 0.50);

      const report = learning.generateLearningReport();
      expect(report).toContain('RECOMMENDATION');
    });

    it('includes lessons learned', () => {
      for (let i = 0; i < 20; i++) {
        learning.recordMatchOutcome('strategy', `opp${i}`, i < 18, 500, 0.85);
      }

      const report = learning.generateLearningReport();
      expect(report).toContain('LESSONS LEARNED');
    });
  });

  describe('Reset Functionality', () => {
    it('clears all learning data', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.recordMatchOutcome('strategy', 'opp2', false, 600, 0.70);

      learning.reset();

      const history = learning.getMatchHistory();
      const metrics = learning.analyzeStrategyEffectiveness();
      expect(history.length).toBe(0);
      expect(metrics.totalMatches).toBe(0);
    });

    it('clears adaptation history on reset', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);
      learning.adaptTactic('opp1');

      learning.reset();

      expect(learning.getAdaptationHistory().length).toBe(0);
    });
  });

  describe('Global Learning Instance', () => {
    it('provides global instance', () => {
      expect(globalAdaptiveLearning).toBeDefined();
      expect(globalAdaptiveLearning.recordMatchOutcome).toBeDefined();
    });

    it('persists data globally', () => {
      globalAdaptiveLearning.recordMatchOutcome('global-strategy', 'opp1', true, 500, 0.85);

      const history = globalAdaptiveLearning.getMatchHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Scenarios', () => {
    it('learns from tournament series', () => {
      // Simulate tournament
      const opponents = ['opus', 'sonnet', 'haiku'];
      const strategies = ['aggressive', 'defensive', 'balanced'];

      for (let round = 0; round < 3; round++) {
        for (let i = 0; i < opponents.length; i++) {
          const won = Math.random() > 0.5;
          learning.recordMatchOutcome(strategies[round], opponents[i], won, 400 + Math.random() * 200, 0.7 + Math.random() * 0.25);
        }
      }

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.totalMatches).toBe(9);
      expect(metrics.bestStrategy).toBeDefined();
    });

    it('identifies meta trends', () => {
      // Build pattern of opponent dominance
      for (let i = 0; i < 5; i++) {
        learning.recordMatchOutcome('meta-strategy', 'strong-opp', i < 1, 500, 0.6 + i * 0.05);
      }

      const adaptation = learning.adaptTactic('strong-opp');
      expect(adaptation.expectedWinRateImprovement).toBeGreaterThan(0);
    });

    it('tracks long-term improvement', () => {
      // Simulate learning curve
      for (let i = 0; i < 50; i++) {
        const winRate = Math.min(0.95, 0.3 + (i / 100)); // Improving over time
        const won = Math.random() < winRate;
        learning.recordMatchOutcome('learning', `opp${i % 10}`, won, 500, 0.5 + i * 0.008);
      }

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.totalMatches).toBe(50);
      expect(metrics.averageWinRate).toBeGreaterThan(30);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty learning state', () => {
      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.totalMatches).toBe(0);
      expect(metrics.averageWinRate).toBe(0);
    });

    it('handles single match', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.totalMatches).toBe(1);
      expect(metrics.totalWins).toBe(1);
      expect(metrics.totalLosses).toBe(0);
    });

    it('handles all wins', () => {
      for (let i = 0; i < 10; i++) {
        learning.recordMatchOutcome('winning-strategy', `opp${i}`, true, 500, 0.90);
      }

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.averageWinRate).toBe(100);
    });

    it('handles all losses', () => {
      for (let i = 0; i < 10; i++) {
        learning.recordMatchOutcome('losing-strategy', `opp${i}`, false, 500, 0.50);
      }

      const metrics = learning.analyzeStrategyEffectiveness();
      expect(metrics.averageWinRate).toBe(0);
    });

    it('freezes history arrays', () => {
      learning.recordMatchOutcome('strategy', 'opp1', true, 500, 0.85);

      const history = learning.getMatchHistory();
      expect(() => {
        (history as any).push({ strategyUsed: 'hack' });
      }).toThrow();
    });
  });
});
