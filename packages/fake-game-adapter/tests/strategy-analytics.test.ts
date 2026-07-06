import { describe, it, expect, beforeEach } from 'vitest';
import { StrategyAnalyzer } from '../src/world/strategy-analytics.js';
import { MatchRunner, type MatchConfig } from '../src/world/match-runner.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';

describe('Strategy Analytics', () => {
  let replay: Awaited<ReturnType<MatchRunner['runMatch']>>;

  beforeEach(async () => {
    const config: MatchConfig = {
      maxTicks: 5,
      player1Brain: new BuiltinBrain(),
      player2Brain: new BuiltinBrain(),
    };

    const runner = new MatchRunner(config);
    replay = await runner.runMatch();
  });

  describe('Strategy Analysis', () => {
    it('analyzes both players', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      expect(player1).toBeDefined();
      expect(player2).toBeDefined();
      expect(player1.player).toBe('player1');
      expect(player2.player).toBe('player2');
    });

    it('classifies strategy type', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      const validStrategies = ['rush', 'expand', 'turtle', 'tech', 'boom', 'harassment'];
      expect(validStrategies).toContain(player1.strategy);
    });

    it('calculates strategy confidence', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.confidence).toBeGreaterThanOrEqual(0);
      expect(player1.confidence).toBeLessThanOrEqual(1);
    });

    it('includes play style description', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.playStyle).toBeDefined();
      expect(typeof player1.playStyle).toBe('string');
      expect(player1.playStyle.length).toBeGreaterThan(0);
    });
  });

  describe('Strategy Metrics', () => {
    it('counts aggressive decisions', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.metrics.aggressiveDecisions).toBeGreaterThanOrEqual(0);
    });

    it('counts economic decisions', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.metrics.economicDecisions).toBeGreaterThanOrEqual(0);
    });

    it('counts defensive decisions', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.metrics.defensiveDecisions).toBeGreaterThanOrEqual(0);
    });

    it('counts harassment decisions', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.metrics.harassmentDecisions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Score Calculations', () => {
    it('calculates aggression score', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.aggressionScore).toBeGreaterThanOrEqual(0);
      expect(player1.aggressionScore).toBeLessThanOrEqual(1);
    });

    it('calculates defense score', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.defenseScore).toBeGreaterThanOrEqual(0);
      expect(player1.defenseScore).toBeLessThanOrEqual(1);
    });

    it('calculates economy score', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.economyScore).toBeGreaterThanOrEqual(0);
      expect(player1.economyScore).toBeLessThanOrEqual(1);
    });

    it('scores influence classification', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      // High aggression should tend toward rush/harassment
      if (player1.aggressionScore > 0.6) {
        expect(['rush', 'harassment']).toContain(player1.strategy);
      }

      // High defense should tend toward turtle
      if (player1.defenseScore > 0.4) {
        expect(['turtle', 'harassment']).toContain(player1.strategy);
      }

      // High economy should tend toward expand/boom
      if (player1.economyScore > 0.7) {
        expect(['expand', 'boom']).toContain(player1.strategy);
      }
    });
  });

  describe('Strategy Comparison', () => {
    it('compares two strategies', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      const comparison = analyzer.compareStrategies(player1, player2);
      expect(comparison).toBeDefined();
      expect(typeof comparison).toBe('string');
    });

    it('describes same strategy', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      const comparison = analyzer.compareStrategies(player1, player1);
      expect(comparison).toContain('Both players');
    });

    it('describes different strategies', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      if (player1.strategy !== player2.strategy) {
        const comparison = analyzer.compareStrategies(player1, player2);
        expect(comparison).toContain('vs');
      }
    });
  });

  describe('Matchup Analysis', () => {
    it('analyzes matchup advantages', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      const matchup = analyzer.analyzeMatchup(player1, player2);
      expect(matchup).toBeDefined();
      expect(matchup.advantaged).toBeDefined();
      expect(matchup.disadvantaged).toBeDefined();
      expect(matchup.reason).toBeDefined();
    });

    it('matchup has valid strategies', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      const matchup = analyzer.analyzeMatchup(player1, player2);
      const validStrategies = ['rush', 'expand', 'turtle', 'tech', 'boom', 'harassment'];

      expect(validStrategies).toContain(matchup.advantaged);
      expect(validStrategies).toContain(matchup.disadvantaged);
    });

    it('advantaged and disadvantaged differ', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      const matchup = analyzer.analyzeMatchup(player1, player2);

      // For different strategies, they should differ
      if (player1.strategy !== player2.strategy) {
        expect(matchup.advantaged).not.toBe(matchup.disadvantaged);
      }
    });

    it('includes matchup explanation', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      const matchup = analyzer.analyzeMatchup(player1, player2);
      expect(matchup.reason.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Provider Analysis', () => {
    it('analyzes builtin vs claude', async () => {
      const config: MatchConfig = {
        maxTicks: 5,
        player1Brain: new BuiltinBrain(),
        player2Brain: new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' }),
      };

      const runner = new MatchRunner(config);
      const matchReplay = await runner.runMatch();

      const analyzer = new StrategyAnalyzer(matchReplay);
      const { player1, player2 } = analyzer.analyzeStrategies();

      expect(player1.strategy).toBeDefined();
      expect(player2.strategy).toBeDefined();
    });
  });

  describe('Strategy Profiles', () => {
    it('includes all profile fields', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.player).toBeDefined();
      expect(player1.strategy).toBeDefined();
      expect(player1.confidence).toBeDefined();
      expect(player1.metrics).toBeDefined();
      expect(player1.aggressionScore).toBeDefined();
      expect(player1.defenseScore).toBeDefined();
      expect(player1.economyScore).toBeDefined();
      expect(player1.playStyle).toBeDefined();
    });

    it('metrics include all decision types', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      expect(player1.metrics.aggressiveDecisions).toBeGreaterThanOrEqual(0);
      expect(player1.metrics.economicDecisions).toBeGreaterThanOrEqual(0);
      expect(player1.metrics.defensiveDecisions).toBeGreaterThanOrEqual(0);
      expect(player1.metrics.technologyDecisions).toBeGreaterThanOrEqual(0);
      expect(player1.metrics.harassmentDecisions).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Play Style Descriptions', () => {
    it('includes strategy name in description', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      const strategies = ['rush', 'expand', 'turtle', 'tech', 'boom', 'harassment'];
      let found = false;
      for (const strategy of strategies) {
        if (player1.playStyle.includes(strategy)) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('describes aggression level', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      if (player1.aggressionScore > 0.6) {
        expect(player1.playStyle).toContain('aggressive');
      }
    });

    it('describes defensive posture when applicable', () => {
      const analyzer = new StrategyAnalyzer(replay);
      const { player1 } = analyzer.analyzeStrategies();

      if (player1.defenseScore > 0.4) {
        expect(player1.playStyle).toContain('defensive');
      }
    });
  });

  describe('Determinism', () => {
    it('same replay produces consistent analysis', () => {
      const analyzer1 = new StrategyAnalyzer(replay);
      const analysis1 = analyzer1.analyzeStrategies();

      const analyzer2 = new StrategyAnalyzer(replay);
      const analysis2 = analyzer2.analyzeStrategies();

      expect(analysis1.player1.strategy).toBe(analysis2.player1.strategy);
      expect(analysis1.player1.confidence).toBe(analysis2.player1.confidence);
      expect(analysis1.player1.aggressionScore).toBe(analysis2.player1.aggressionScore);
    });
  });
});
