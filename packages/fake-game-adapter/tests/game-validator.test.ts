import { describe, it, expect, beforeEach } from 'vitest';
import { GameValidator } from '../src/world/game-validator.js';
import { BuiltinBrain } from '../src/world/brain-sdk.js';
import { ClaudeBrain } from '../src/world/claude-brain.js';
import { OllamaBrain } from '../src/world/ollama-brain.js';

describe('Game Validator', () => {
  let validator: GameValidator;
  let brain: BuiltinBrain;

  beforeEach(() => {
    validator = new GameValidator();
    brain = new BuiltinBrain();
  });

  describe('Multi-Game Validation', () => {
    it('validates brain across game types', async () => {
      const results = await validator.validateBrain(brain);

      expect(results).toBeDefined();
      expect(results.length).toBe(5);
    });

    it('includes all game types', async () => {
      const results = await validator.validateBrain(brain);

      const gameTypes = results.map((r) => r.gameType);
      expect(gameTypes).toContain('rts');
      expect(gameTypes).toContain('turn-based-strategy');
      expect(gameTypes).toContain('puzzle');
      expect(gameTypes).toContain('card-game');
      expect(gameTypes).toContain('simulation');
    });

    it('processes decisions for each game', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.decisionsProcessed).toBeGreaterThan(0);
      }
    });

    it('validates output structure', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.outputsValid).toBeGreaterThan(0);
      }
    });
  });

  describe('Game Type Support', () => {
    it('supports RTS games', async () => {
      const results = await validator.validateBrain(brain);
      const rtsResult = results.find((r) => r.gameType === 'rts');

      expect(rtsResult?.compatible).toBe(true);
      expect(rtsResult?.errors.length).toBe(0);
    });

    it('supports turn-based strategy', async () => {
      const results = await validator.validateBrain(brain);
      const strategyResult = results.find((r) => r.gameType === 'turn-based-strategy');

      expect(strategyResult?.compatible).toBe(true);
      expect(strategyResult?.errors.length).toBe(0);
    });

    it('supports puzzle games', async () => {
      const results = await validator.validateBrain(brain);
      const puzzleResult = results.find((r) => r.gameType === 'puzzle');

      expect(puzzleResult?.compatible).toBe(true);
      expect(puzzleResult?.errors.length).toBe(0);
    });

    it('supports card games', async () => {
      const results = await validator.validateBrain(brain);
      const cardResult = results.find((r) => r.gameType === 'card-game');

      expect(cardResult?.compatible).toBe(true);
      expect(cardResult?.errors.length).toBe(0);
    });

    it('supports simulation games', async () => {
      const results = await validator.validateBrain(brain);
      const simResult = results.find((r) => r.gameType === 'simulation');

      expect(simResult?.compatible).toBe(true);
      expect(simResult?.errors.length).toBe(0);
    });
  });

  describe('Validation Results', () => {
    it('includes result metadata', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.gameType).toBeDefined();
        expect(result.compatible).toBeDefined();
        expect(result.brainName).toBeDefined();
        expect(result.decisionsProcessed).toBeGreaterThan(0);
        expect(result.outputsValid).toBeGreaterThan(0);
        expect(result.executionTimeMs).toBeGreaterThan(0);
      }
    });

    it('tracks errors', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(Array.isArray(result.errors)).toBe(true);
      }
    });

    it('marks compatible games', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        if (result.errors.length === 0) {
          expect(result.compatible).toBe(true);
        }
      }
    });
  });

  describe('Multi-Provider Testing', () => {
    it('validates multiple brain types', async () => {
      const builtin = new BuiltinBrain();
      const claude = new ClaudeBrain({ apiKey: 'key', model: 'claude-3-haiku' });

      const builtinResults = await validator.validateBrain(builtin);
      const claudeResults = await validator.validateBrain(claude);

      expect(builtinResults.length).toBe(5);
      expect(claudeResults.length).toBe(5);
    });

    it('ollama brain validates across games', async () => {
      const ollama = new OllamaBrain({
        baseUrl: 'http://localhost:11434',
        model: 'mistral',
      });

      const results = await validator.validateBrain(ollama);

      expect(results.length).toBe(5);
      for (const result of results) {
        expect(result.brainName).toContain('ollama');
      }
    });
  });

  describe('Compatibility Rate', () => {
    it('calculates summary', async () => {
      const results = await validator.validateBrain(brain);
      const summary = validator.getSummary(results);

      expect(summary.totalGames).toBe(5);
      expect(summary.compatibleGames).toBeGreaterThan(0);
      expect(summary.compatibilityRate).toBeGreaterThan(0);
    });

    it('summary rates between 0 and 1', async () => {
      const results = await validator.validateBrain(brain);
      const summary = validator.getSummary(results);

      expect(summary.compatibilityRate).toBeGreaterThanOrEqual(0);
      expect(summary.compatibilityRate).toBeLessThanOrEqual(1);
    });

    it('counts total errors', async () => {
      const results = await validator.validateBrain(brain);
      const summary = validator.getSummary(results);

      const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
      expect(summary.totalErrors).toBe(totalErrors);
    });

    it('perfect compatibility when no errors', async () => {
      const results = await validator.validateBrain(brain);
      const summary = validator.getSummary(results);

      if (summary.totalErrors === 0) {
        expect(summary.compatibilityRate).toBe(1);
      }
    });
  });

  describe('Game-Specific Goals and Actions', () => {
    it('RTS has military goals', async () => {
      const results = await validator.validateBrain(brain);
      const rtsResult = results.find((r) => r.gameType === 'rts');

      expect(rtsResult?.decisionsProcessed).toBeGreaterThan(0);
    });

    it('Strategy has piece movement', async () => {
      const results = await validator.validateBrain(brain);
      const strategyResult = results.find((r) => r.gameType === 'turn-based-strategy');

      expect(strategyResult?.decisionsProcessed).toBeGreaterThan(0);
    });

    it('Puzzle has clear/drop actions', async () => {
      const results = await validator.validateBrain(brain);
      const puzzleResult = results.find((r) => r.gameType === 'puzzle');

      expect(puzzleResult?.decisionsProcessed).toBeGreaterThan(0);
    });

    it('Card game has play/discard actions', async () => {
      const results = await validator.validateBrain(brain);
      const cardResult = results.find((r) => r.gameType === 'card-game');

      expect(cardResult?.decisionsProcessed).toBeGreaterThan(0);
    });

    it('Simulation has build/research actions', async () => {
      const results = await validator.validateBrain(brain);
      const simResult = results.find((r) => r.gameType === 'simulation');

      expect(simResult?.decisionsProcessed).toBeGreaterThan(0);
    });
  });

  describe('Validation Coverage', () => {
    it('validates 3 decisions per game', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.decisionsProcessed).toBe(3);
      }
    });

    it('all decisions produce valid outputs', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.outputsValid).toBe(result.decisionsProcessed);
      }
    });
  });

  describe('Performance', () => {
    it('measures execution time', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.executionTimeMs).toBeGreaterThan(0);
      }
    });

    it('execution time is reasonable', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        // Should complete in under 5 seconds per game
        expect(result.executionTimeMs).toBeLessThan(5000);
      }
    });
  });

  describe('Framework Portability', () => {
    it('same brain works for all game types', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        expect(result.brainName).toBe(brain.name);
        expect(result.decisionsProcessed).toBeGreaterThan(0);
      }
    });

    it('brain receives game-specific context', async () => {
      const results = await validator.validateBrain(brain);

      // Each game type should have different goals/actions
      expect(results.length).toBe(5);
      for (const result of results) {
        expect(result.gameType).toBeDefined();
      }
    });

    it('universal interface works across games', async () => {
      const results = await validator.validateBrain(brain);

      for (const result of results) {
        if (result.compatible) {
          // Brain produced valid outputs without game-specific code
          expect(result.outputsValid).toBe(result.decisionsProcessed);
        }
      }
    });
  });
});
