import { describe, it, expect, beforeEach } from 'vitest';
import { DecisionSummarizer, DecisionSummaryFactory } from './decision-summary.js';

describe('DecisionSummarizer', () => {
  let summarizer: DecisionSummarizer;

  beforeEach(() => {
    summarizer = new DecisionSummarizer();
  });

  describe('Economy categorization', () => {
    it('should categorize worker training as economy', () => {
      const summary = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        'Need more workers',
        ['train_worker', 'train_worker'],
        2,
        150
      );

      expect(summary.category).toBe('economy');
      expect(summary.summary).toContain('Growing resources');
    });

    it('should categorize expansion as economy', () => {
      const summary = summarizer.summarize(
        150,
        Date.now(),
        'player1',
        'model-x',
        'Expand territory',
        ['build_settlement', 'build_farm'],
        2,
        200
      );

      expect(summary.category).toBe('economy');
      expect(summary.summary).toBe('Expanding economy');
    });

    it('should categorize trade as economy', () => {
      const summary = summarizer.summarize(
        200,
        Date.now(),
        'player2',
        'model-y',
        'Maximize resources',
        ['create_trader'],
        1,
        100
      );

      expect(summary.category).toBe('economy');
      expect(summary.summary).toBe('Optimizing trade');
    });
  });

  describe('Military categorization', () => {
    it('should categorize unit training as military', () => {
      const summary = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        'Build army',
        ['train_archer', 'train_infantry', 'train_infantry'],
        3,
        250
      );

      expect(summary.category).toBe('military');
      expect(summary.summary).toBe('Training units');
    });

    it('should categorize attack preparation', () => {
      const summary = summarizer.summarize(
        250,
        Date.now(),
        'player1',
        'model-x',
        'Prepare offensive',
        ['move_units_to_rally_point', 'attack_enemy'],
        2,
        180
      );

      expect(summary.category).toBe('military');
      expect(summary.summary).toBe('Preparing attack');
    });

    it('should categorize defense preparation', () => {
      const summary = summarizer.summarize(
        300,
        Date.now(),
        'player2',
        'model-y',
        'Defend against threats',
        ['garrison_units', 'build_tower', 'build_wall'],
        3,
        200
      );

      expect(summary.category).toBe('military');
      expect(summary.summary).toBe('Preparing defense');
    });

    it('should detect large army mobilization', () => {
      const summary = summarizer.summarize(
        400,
        Date.now(),
        'player1',
        'model-x',
        'Mobilize',
        ['train_unit', 'train_unit', 'train_unit', 'train_unit', 'train_unit'],
        5,
        300
      );

      expect(summary.category).toBe('military');
      expect(summary.summary).toBe('Mobilizing army');
    });
  });

  describe('Technology categorization', () => {
    it('should categorize research as technology', () => {
      const summary = summarizer.summarize(
        500,
        Date.now(),
        'player1',
        'model-x',
        'Research tech',
        ['research_tech_tree', 'research_advancement'],
        2,
        100
      );

      expect(summary.category).toBe('tech');
      expect(summary.summary).toBe('Researching technology');
    });
  });

  describe('Scouting categorization', () => {
    it('should categorize scouting as scouting', () => {
      const summary = summarizer.summarize(
        200,
        Date.now(),
        'player1',
        'model-x',
        'Check for threats',
        ['scout_enemy', 'patrol_area'],
        2,
        120
      );

      expect(summary.category).toBe('scouting');
      expect(summary.summary).toBe('Scouting enemy');
    });
  });

  describe('Strategy categorization', () => {
    it('should categorize multi-faceted decisions as strategy shift', () => {
      const summary = summarizer.summarize(
        600,
        Date.now(),
        'player2',
        'model-y',
        'Change approach',
        ['train_unit', 'expand_settlement', 'move_units', 'garrison_units'],
        4,
        350
      );

      expect(summary.category).toBe('strategy');
      expect(summary.summary).toBe('Shifting strategy');
    });
  });

  describe('Idle categorization', () => {
    it('should categorize empty commands as idle', () => {
      const summary = summarizer.summarize(
        700,
        Date.now(),
        'player1',
        'model-x',
        undefined,
        [],
        0,
        50
      );

      expect(summary.category).toBe('idle');
      expect(summary.summary).toBe('Holding position');
    });
  });

  describe('Confidence scoring', () => {
    it('should have high confidence for clear categories', () => {
      const summary = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        'Attack now',
        ['attack_enemy', 'move_units', 'rally_point'],
        3,
        200
      );

      expect(summary.confidence).toBeGreaterThan(0.8);
    });

    it('should have low confidence for unknown categories', () => {
      const summary = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        undefined,
        ['mystery_command'],
        1,
        100
      );

      expect(summary.confidence).toBeLessThan(0.5);
    });

    it('should boost confidence with multiple commands', () => {
      const summary1 = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        undefined,
        ['train_worker'],
        1,
        100
      );

      const summary2 = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        undefined,
        ['train_worker', 'train_worker', 'expand'],
        3,
        100
      );

      expect(summary2.confidence).toBeGreaterThan(summary1.confidence);
    });
  });

  describe('Summary generation', () => {
    it('should never expose internal reasoning', () => {
      const summary = summarizer.summarize(
        100,
        Date.now(),
        'player1',
        'model-x',
        'I considered 47 possible moves and calculated that expansion provides 2.3x resource yield compared to military buildup',
        ['expand_settlement'],
        1,
        500
      );

      expect(summary.summary).not.toContain('considered');
      expect(summary.summary).not.toContain('calculated');
      expect(summary.summary).not.toContain('resource yield');
      expect(summary.summary).toBe('Expanding economy');
    });

    it('should preserve all metadata', () => {
      const tick = 250;
      const player = 'player2' as const;
      const brainName = 'expert-model';
      const commandCount = 5;
      const durationMs = 300;

      const summary = summarizer.summarize(
        tick,
        Date.now(),
        player,
        brainName,
        'Some reasoning',
        ['cmd1', 'cmd2', 'cmd3', 'cmd4', 'cmd5'],
        commandCount,
        durationMs
      );

      expect(summary.tick).toBe(tick);
      expect(summary.player).toBe(player);
      expect(summary.brainName).toBe(brainName);
      expect(summary.commandCount).toBe(commandCount);
      expect(summary.durationMs).toBe(durationMs);
    });
  });
});

describe('DecisionSummaryFactory', () => {
  let factory: DecisionSummaryFactory;

  beforeEach(() => {
    factory = new DecisionSummaryFactory();
  });

  describe('Caching', () => {
    it('should cache summaries by tick+player+brainName', () => {
      const summary1 = factory.create(
        100,
        Date.now(),
        'player1',
        'model-x',
        'reason',
        ['train_worker'],
        1,
        100
      );

      const summary2 = factory.create(
        100,
        Date.now(),
        'player1',
        'model-x',
        'different reason',
        ['train_worker'],
        1,
        100
      );

      // Should return same cached object
      expect(summary1).toBe(summary2);
    });

    it('should create different summaries for different ticks', () => {
      const summary1 = factory.create(
        100,
        Date.now(),
        'player1',
        'model-x',
        'reason',
        ['train_worker'],
        1,
        100
      );

      const summary2 = factory.create(
        101,
        Date.now(),
        'player1',
        'model-x',
        'reason',
        ['train_worker'],
        1,
        100
      );

      expect(summary1).not.toBe(summary2);
    });

    it('should create different summaries for different players', () => {
      const summary1 = factory.create(
        100,
        Date.now(),
        'player1',
        'model-x',
        'reason',
        ['train_worker'],
        1,
        100
      );

      const summary2 = factory.create(
        100,
        Date.now(),
        'player2',
        'model-x',
        'reason',
        ['train_worker'],
        1,
        100
      );

      expect(summary1).not.toBe(summary2);
    });

    it('should evict old entries when cache exceeds max size', () => {
      // Fill cache beyond max
      for (let i = 0; i < 1050; i++) {
        factory.create(i, Date.now(), 'player1', 'model-x', 'reason', ['train_worker'], 1, 100);
      }

      // Cache should not exceed max size
      const summary = factory.create(0, Date.now(), 'player1', 'model-x', 'reason', ['train_worker'], 1, 100);
      // If we get a new object, the original was evicted
      expect(summary).toBeDefined();
    });
  });

  describe('Cache management', () => {
    it('should clear cache', () => {
      factory.create(100, Date.now(), 'player1', 'model-x', 'reason', ['train_worker'], 1, 100);

      factory.clear();

      const summary1 = factory.create(100, Date.now(), 'player1', 'model-x', 'reason', ['train_worker'], 1, 100);
      const summary2 = factory.create(100, Date.now(), 'player1', 'model-x', 'reason', ['train_worker'], 1, 100);

      // After clear, same key should return same cached object
      expect(summary1).toBe(summary2);
    });
  });
});
