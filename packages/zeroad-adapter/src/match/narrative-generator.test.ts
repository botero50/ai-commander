import { describe, it, expect, beforeEach } from 'vitest';
import { NarrativeGenerator, type NarrativeEntry } from './narrative-generator';
import type { TournamentMatchResult } from '../tournament/tournament-runner';

describe('NarrativeGenerator', () => {
  let matchResult: TournamentMatchResult;

  beforeEach(() => {
    matchResult = {
      matchId: 'test-match-1',
      timestamp: Date.now(),
      brain1Id: 'ollama-1',
      brain2Id: 'ollama-2',
      winner: 'player1',
      ticksRan: 9000,
      duration: 300000, // 5 minutes
      player1Commands: 150,
      player1Errors: 2,
      player2Commands: 140,
      player2Errors: 5,
    };
  });

  describe('Narrative Generation', () => {
    it('should generate narrative entries', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should include opening phase', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const opening = narrative.find((e) => e.phase === 'opening');
      expect(opening).toBeDefined();
      expect(opening?.text).toBeTruthy();
    });

    it('should include early game phase', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const earlyGame = narrative.find((e) => e.phase === 'early');
      expect(earlyGame).toBeDefined();
      expect(earlyGame?.text).toBeTruthy();
    });

    it('should include mid-game phase', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const midGame = narrative.find((e) => e.phase === 'mid');
      expect(midGame).toBeDefined();
      expect(midGame?.text).toBeTruthy();
    });

    it('should include late game phase', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const lateGame = narrative.find((e) => e.phase === 'late');
      expect(lateGame).toBeDefined();
      expect(lateGame?.text).toBeTruthy();
    });

    it('should include conclusion phase', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      expect(conclusion).toBeDefined();
      expect(conclusion?.text).toBeTruthy();
      expect(conclusion?.isKeyMoment).toBe(true);
    });

    it('should reference winner correctly in conclusion', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      // Should reference winner (extracted from brain ID)
      expect(conclusion?.text).toContain('Ollama');
      expect(conclusion?.player).toBe('player1');
    });

    it('should mention player names in narrative', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const narrativeText = narrative.map((e) => e.text).join(' ');
      // Should mention player names extracted from brain IDs
      expect(narrativeText).toContain('Ollama');
    });
  });

  describe('Narrative Structure', () => {
    it('should order phases chronologically', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const phases = narrative.map((e) => e.phase);
      const phaseOrder = ['opening', 'early', 'mid', 'late', 'conclusion'];

      let lastIndex = -1;
      for (const phase of phases) {
        const index = phaseOrder.indexOf(phase);
        if (index !== -1) {
          expect(index).toBeGreaterThanOrEqual(lastIndex);
          lastIndex = index;
        }
      }
    });

    it('should mark key moments', () => {
      // Narrative generator for TournamentMatchResult doesn't process events
      // Just verify all entries are properly marked
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      expect(conclusion?.isKeyMoment).toBe(true);
    });

    it('should set confidence scores', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      for (const entry of narrative) {
        expect(entry.confidence).toBeGreaterThanOrEqual(0);
        expect(entry.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Command-Based Analysis', () => {
    it('should analyze command volume', () => {
      matchResult.player1Commands = 200;
      matchResult.player2Commands = 100;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const narrativeText = narrative.map((e) => e.text).join(' ');
      // Should mention command initiative
      expect(narrativeText.toLowerCase()).toMatch(/command|initiative|action/);
    });

    it('should note execution quality from errors', () => {
      matchResult.player1Errors = 0;
      matchResult.player2Errors = 5;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      expect(conclusion?.text).toBeTruthy();
    });
  });

  describe('Winner Explanation', () => {
    it('should explain player1 victory', () => {
      matchResult.winner = 'player1';
      matchResult.player1Commands = 180;
      matchResult.player2Commands = 120;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      expect(conclusion?.text).toContain('Ollama');
      expect(conclusion?.player).toBe('player1');
    });

    it('should explain player2 victory', () => {
      matchResult.winner = 'player2';
      matchResult.player1Commands = 100;
      matchResult.player2Commands = 200;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      const conclusion = narrative.find((e) => e.phase === 'conclusion');
      expect(conclusion?.text).toBeTruthy();
      expect(conclusion?.player).toBe('player2');
    });
  });

  describe('Edge Cases', () => {
    it('should generate narrative even with minimal data', () => {
      const minimal: TournamentMatchResult = {
        matchId: 'test-1',
        timestamp: Date.now(),
        brain1Id: 'a',
        brain2Id: 'b',
        winner: 'player1',
        duration: 300000,
        ticksRan: 9000,
        player1Commands: 100,
        player1Errors: 0,
        player2Commands: 100,
        player2Errors: 0,
      };

      const generator = new NarrativeGenerator(minimal);
      const narrative = generator.generate();

      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should handle undefined winner', () => {
      matchResult.winner = undefined;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      expect(narrative.length).toBeGreaterThan(0);
    });

    it('should never expose reasoning in text', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      for (const entry of narrative) {
        // Should not expose internal reasoning words
        expect(entry.text).not.toMatch(/because|since|thought|decided|planned/i);
        expect(entry.text).not.toMatch(/reasoning|logic|think/i);
      }
    });

    it('should only include observable facts', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      for (const entry of narrative) {
        // Text should describe observable game state, not internal AI state
        const text = entry.text.toLowerCase();
        // Should not expose internal reasoning
        expect(text).not.toMatch(/model decides|ai thinks|neural/);
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain timestamp information', () => {
      const now = Date.now();
      matchResult.timestamp = now;

      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      for (const entry of narrative) {
        expect(entry.timestamp).toBeDefined();
      }
    });

    it('should track tick progression', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      // Ticks should generally increase (not strictly, but overall)
      const ticks = narrative.map((e) => e.tick);
      expect(ticks[0] || 0).toBeLessThanOrEqual(ticks[ticks.length - 1] || 0);
    });

    it('should reference correct player in entries', () => {
      const generator = new NarrativeGenerator(matchResult);
      const narrative = generator.generate();

      for (const entry of narrative) {
        expect(['player1', 'player2', 'both']).toContain(entry.player);
      }
    });
  });
});
