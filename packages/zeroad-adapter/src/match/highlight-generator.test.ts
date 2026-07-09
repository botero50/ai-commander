import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HighlightGenerator, type HighlightGeneratorState } from './highlight-generator.js';

describe('Highlight Generator', () => {
  let generator: HighlightGenerator;

  beforeEach(() => {
    generator = new HighlightGenerator('match-123');
  });

  describe('Initialization', () => {
    it('should create generator', () => {
      expect(generator).toBeDefined();
    });

    it('should have no highlights initially', () => {
      expect(generator.getAllHighlights().length).toBe(0);
    });

    it('should not be complete initially', () => {
      expect(generator['isComplete']).toBe(false);
    });
  });

  describe('Biggest battle recording', () => {
    it('should record biggest battle', () => {
      const marker = generator.recordBiggestBattle(300, 30000, 45, 25, 20);

      expect(marker.type).toBe('biggest_battle');
      expect(marker.value).toBe(45);
      expect(marker.description).toContain('25v20');
    });

    it('should track unit counts', () => {
      const marker = generator.recordBiggestBattle(300, 30000, 45, 25, 20);

      expect(marker.metadata.player1Units).toBe(25);
      expect(marker.metadata.player2Units).toBe(20);
      expect(marker.metadata.totalUnits).toBe(45);
    });

    it('should mark both players', () => {
      const marker = generator.recordBiggestBattle(300, 30000, 45, 25, 20);

      expect(marker.relatedPlayer).toBe('both');
    });
  });

  describe('Largest army recording', () => {
    it('should record largest army', () => {
      const marker = generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);

      expect(marker.type).toBe('largest_army');
      expect(marker.value).toBe(5000);
      expect(marker.relatedPlayer).toBe('player1');
    });

    it('should track army metrics', () => {
      const marker = generator.recordLargestArmy(400, 40000, 'player2', 4500, 25);

      expect(marker.metadata.armyValue).toBe(4500);
      expect(marker.metadata.unitCount).toBe(25);
    });
  });

  describe('Fastest expansion recording', () => {
    it('should record fastest expansion', () => {
      const marker = generator.recordFastestExpansion(200, 20000, 'player1', 2000, 8, 15.5);

      expect(marker.type).toBe('fastest_expansion');
      expect(marker.value).toBe(15.5);
    });

    it('should track expansion metrics', () => {
      const marker = generator.recordFastestExpansion(200, 20000, 'player2', 1800, 7, 14.2);

      expect(marker.metadata.resourcesGathered).toBe(1800);
      expect(marker.metadata.buildingCount).toBe(7);
      expect(marker.metadata.expansionRate).toBe(14.2);
    });
  });

  describe('Largest economy recording', () => {
    it('should record largest economy', () => {
      const marker = generator.recordLargestEconomy(350, 35000, 'player1', 5500, {
        food: 1500,
        wood: 1500,
        stone: 1000,
        metal: 500,
      });

      expect(marker.type).toBe('largest_economy');
      expect(marker.value).toBe(5500);
    });

    it('should track resource breakdown', () => {
      const breakdown = { food: 1200, wood: 1300, stone: 900, metal: 400 };
      const marker = generator.recordLargestEconomy(350, 35000, 'player2', 3800, breakdown);

      expect(marker.metadata.resourceBreakdown).toEqual(breakdown);
    });
  });

  describe('Decisive attack recording', () => {
    it('should record decisive attack', () => {
      const marker = generator.recordDecisiveAttack(450, 45000, 'player1', 'barracks', 10, true);

      expect(marker.type).toBe('decisive_attack');
      expect(marker.relatedPlayer).toBe('player1');
      expect(marker.description).toContain('barracks');
    });

    it('should track attack outcome', () => {
      const marker = generator.recordDecisiveAttack(450, 45000, 'player2', 'storehouse', 5, false);

      expect(marker.metadata.targetType).toBe('storehouse');
      expect(marker.metadata.unitsLost).toBe(5);
      expect(marker.metadata.targetDestroyed).toBe(false);
    });
  });

  describe('Victory push recording', () => {
    it('should record victory push', () => {
      const marker = generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base');

      expect(marker.type).toBe('victory_push');
      expect(marker.value).toBe(40);
      expect(marker.description).toContain('main base');
    });

    it('should mark winning player', () => {
      const marker = generator.recordVictoryPush(500, 50000, 'player2', 35, 'primary base');

      expect(marker.relatedPlayer).toBe('player2');
      expect(marker.title).toContain('Player 2');
    });
  });

  describe('Reel finalization', () => {
    beforeEach(() => {
      generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);
      generator.recordDecisiveAttack(450, 45000, 'player1', 'barracks', 10, true);
      generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base');
    });

    it('should finalize reel', () => {
      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(reel.id).toBeDefined();
      expect(reel.matchId).toBe('match-123');
      expect(reel.winner).toBe('player1');
      expect(reel.highlights.length).toBe(4);
    });

    it('should include all highlights', () => {
      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(reel.highlights.length).toBe(4);
      expect(reel.highlights.every((h) => h.id)).toBe(true);
    });

    it('should order by importance', () => {
      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      // Victory push should be first
      expect(reel.sequenceOrder[0]!.type).toBe('victory_push');
      // Decisive attack should be second
      expect(reel.sequenceOrder[1]!.type).toBe('decisive_attack');
    });

    it('should mark as complete', () => {
      generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(generator['isComplete']).toBe(true);
    });
  });

  describe('Highlight retrieval', () => {
    beforeEach(() => {
      generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      generator.recordBiggestBattle(350, 35000, 50, 28, 22);
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);
      generator.recordLargestArmy(420, 42000, 'player2', 4500, 25);
      generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base');
    });

    it('should get highlights by type', () => {
      const battles = generator.getHighlightsByType('biggest_battle');

      expect(battles.length).toBe(2);
      expect(battles.every((b) => b.type === 'biggest_battle')).toBe(true);
    });

    it('should get highlights for player', () => {
      const p1Highlights = generator.getHighlightsForPlayer('player1');

      expect(p1Highlights.length).toBeGreaterThan(0);
      expect(
        p1Highlights.every((h) => h.relatedPlayer === 'player1' || h.relatedPlayer === 'both')
      ).toBe(true);
    });

    it('should get all highlights', () => {
      const all = generator.getAllHighlights();

      expect(all.length).toBe(5);
    });

    it('should get highlight counts', () => {
      const counts = generator.getHighlightCounts();

      expect(counts.biggest_battle).toBe(2);
      expect(counts.largest_army).toBe(2);
      expect(counts.victory_push).toBe(1);
      expect(counts.decisive_attack).toBe(0);
    });
  });

  describe('Reel duration calculation', () => {
    beforeEach(() => {
      generator.recordBiggestBattle(300, 30000, 45, 25, 20, 300); // 9900ms
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30, 200); // 6600ms
      generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base', 400); // 13200ms
    });

    it('should calculate estimated reel duration', () => {
      const duration = generator.getEstimatedReelDuration();

      expect(duration).toBeGreaterThan(0);
      expect(duration).toBe(9900 + 6600 + 13200);
    });

    it('should include total duration in reel', () => {
      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(reel.totalDuration).toBe(9900 + 6600 + 13200);
    });
  });

  describe('Subscription', () => {
    it('should allow subscribers', () => {
      const callback = vi.fn<[HighlightGeneratorState], void>();

      generator.subscribe(callback);

      expect(callback).toHaveBeenCalled();
    });

    it('should send state on highlight record', () => {
      const callback = vi.fn<[HighlightGeneratorState], void>();
      generator.subscribe(callback);

      generator.recordBiggestBattle(300, 30000, 45, 25, 20);

      expect(callback.mock.calls.length).toBeGreaterThan(1);
    });

    it('should support unsubscribe', () => {
      const callback = vi.fn<[HighlightGeneratorState], void>();
      const unsubscribe = generator.subscribe(callback);

      const callCountBefore = callback.mock.calls.length;

      unsubscribe();

      generator.recordBiggestBattle(300, 30000, 45, 25, 20);

      expect(callback.mock.calls.length).toBe(callCountBefore);
    });

    it('should include totals in state', () => {
      const callback = vi.fn<[HighlightGeneratorState], void>();

      generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);
      generator.subscribe(callback);

      const state = callback.mock.calls[0]![0]!;
      expect(state.totalHighlights).toBe(2);
      expect(state.highlightsByType.biggest_battle).toBe(1);
      expect(state.highlightsByType.largest_army).toBe(1);
    });
  });

  describe('Optimal sequencing', () => {
    it('should prioritize victory push', () => {
      generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base');
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);

      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(reel.sequenceOrder[0]!.type).toBe('victory_push');
    });

    it('should prioritize decisive attack over largest army', () => {
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);
      generator.recordDecisiveAttack(450, 45000, 'player1', 'barracks', 10, true);

      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      expect(reel.sequenceOrder[0]!.type).toBe('decisive_attack');
      expect(reel.sequenceOrder[1]!.type).toBe('largest_army');
    });

    it('should sort by value when same type', () => {
      generator.recordLargestArmy(400, 40000, 'player1', 5000, 30);
      generator.recordLargestArmy(420, 42000, 'player1', 6000, 35);

      const reel = generator.finalizeReel(60000, 'player1', 500, 50000);

      // Highest value should be first
      expect(reel.sequenceOrder[0]!.value).toBe(6000);
      expect(reel.sequenceOrder[1]!.value).toBe(5000);
    });
  });

  describe('Reset', () => {
    it('should clear all highlights', () => {
      generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      generator.recordVictoryPush(500, 50000, 'player1', 40, 'main base');

      generator.reset();

      expect(generator.getAllHighlights().length).toBe(0);
    });

    it('should reset ID counter', () => {
      const marker1 = generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      expect(marker1.id).toContain('highlight-0');

      generator.reset();

      const marker2 = generator.recordBiggestBattle(300, 30000, 45, 25, 20);
      expect(marker2.id).toContain('highlight-0');
    });

    it('should reset completion state', () => {
      generator.finalizeReel(60000, 'player1', 500, 50000);
      generator.reset();

      expect(generator['isComplete']).toBe(false);
    });
  });
});
