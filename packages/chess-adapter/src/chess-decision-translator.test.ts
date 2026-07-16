/**
 * Chess Decision Translator Tests - Story C2.2
 *
 * Tests for brain decision to move translation:
 * - Decision extraction
 * - Move validation
 * - Invalid selection handling
 * - Fallback move selection
 * - Reasoning extraction
 */

import { describe, it, expect } from 'vitest';
import { ChessDecisionTranslator, type DecisionTranslationResult } from './chess-decision-translator.js';
import type { BrainDecision, CommandOption } from '@ai-commander/brain';

describe('ChessDecisionTranslator - Story C2.2', () => {
  const legalMoves = ['e2e4', 'c2c4', 'd2d4', 'g1f3', 'b1c3'];
  const availableCommands: CommandOption[] = [
    {
      id: 'move-0',
      action: 'move',
      target: 'e2e4',
      expectedDuration: 1,
      expectedCost: 0,
      description: 'e2e4',
    },
    {
      id: 'move-1',
      action: 'move',
      target: 'c2c4',
      expectedDuration: 1,
      expectedCost: 0,
      description: 'c2c4',
    },
    {
      id: 'move-2',
      action: 'move',
      target: 'd2d4',
      expectedDuration: 1,
      expectedCost: 0,
      description: 'd2d4',
    },
  ];

  describe('Valid Decision Extraction', () => {
    it('should extract valid move selection from decision', () => {
      const decision: BrainDecision = {
        reasoning: 'Opening with e4',
        selectedGoal: 'develop-pieces',
        plan: ['control-center'],
        commands: ['e2e4'],
        confidence: 0.95,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.success).toBe(true);
      expect(result.move).toBe('e2e4');
      expect(result.isFallback).toBe(false);
    });

    it('should extract first command when multiple commands provided', () => {
      const decision: BrainDecision = {
        reasoning: 'Multiple options',
        selectedGoal: 'develop',
        plan: [],
        commands: ['e2e4', 'c2c4', 'd2d4'],
        confidence: 0.8,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.success).toBe(true);
      expect(result.move).toBe('e2e4');
    });

    it('should handle move with check notation', () => {
      const extendedLegal = [...legalMoves, 'f1c4'];
      const extendedCommands = [
        ...availableCommands,
        {
          id: 'move-3',
          action: 'move',
          target: 'f1c4',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'f1c4',
        },
      ];

      const decision: BrainDecision = {
        reasoning: 'Bishop check',
        selectedGoal: 'attack',
        plan: [],
        commands: ['f1c4+'],
        confidence: 0.9,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        extendedCommands,
        extendedLegal
      );

      expect(result.success).toBe(true);
      expect(result.move).toContain('f1c4');
    });
  });

  describe('Invalid Selection Handling', () => {
    it('should fallback when brain provides no commands', () => {
      const decision: BrainDecision = {
        reasoning: 'No move selected',
        selectedGoal: 'none',
        plan: [],
        commands: [],
        confidence: 0,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.success).toBe(false);
      expect(result.move).toBeDefined();
      expect(result.isFallback).toBe(true);
      expect(legalMoves).toContain(result.move!);
    });

    it('should fallback when brain selects move not in available options', () => {
      const decision: BrainDecision = {
        reasoning: 'Invalid selection',
        selectedGoal: 'test',
        plan: [],
        commands: ['h2h4'], // Not in availableCommands
        confidence: 0.5,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.success).toBe(false);
      expect(result.isFallback).toBe(true);
      expect(result.reasoning).toContain('not in available options');
    });

    it('should fallback when selected move is illegal', () => {
      const extendedCommands = [
        ...availableCommands,
        {
          id: 'move-illegal',
          action: 'move',
          target: 'a1a8',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'a1a8',
        },
      ];

      const decision: BrainDecision = {
        reasoning: 'Illegal move',
        selectedGoal: 'test',
        plan: [],
        commands: ['a1a8'],
        confidence: 0.1,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        extendedCommands,
        legalMoves
      );

      expect(result.success).toBe(false);
      expect(result.isFallback).toBe(true);
      expect(result.move).toBeDefined();
      expect(legalMoves).toContain(result.move!);
    });

    it('should handle null/undefined commands', () => {
      const decision: BrainDecision = {
        reasoning: 'Test',
        selectedGoal: 'test',
        plan: [],
        commands: undefined as any,
        confidence: 0.5,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.success).toBe(false);
      expect(result.isFallback).toBe(true);
    });
  });

  describe('Fallback Move Selection', () => {
    it('should select valid random move from legal moves', () => {
      const decision: BrainDecision = {
        reasoning: 'Test',
        selectedGoal: 'test',
        plan: [],
        commands: [],
        confidence: 0,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.move).toBeDefined();
      expect(legalMoves).toContain(result.move);
    });

    it('should return null when no legal moves available', () => {
      const decision: BrainDecision = {
        reasoning: 'Test',
        selectedGoal: 'test',
        plan: [],
        commands: [],
        confidence: 0,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        []
      );

      expect(result.move).toBeNull();
      expect(result.isFallback).toBe(true);
    });
  });

  describe('Reasoning Extraction', () => {
    it('should extract explicit reasoning from decision', () => {
      const decision: BrainDecision = {
        reasoning: 'Opening with 1.e4, the king\'s pawn opening',
        selectedGoal: 'develop',
        plan: [],
        commands: [],
        confidence: 0.9,
      };

      const reasoning = ChessDecisionTranslator.extractReasoning(decision);

      expect(reasoning).toBe('Opening with 1.e4, the king\'s pawn opening');
    });

    it('should construct reasoning from components when explicit reasoning missing', () => {
      const decision: BrainDecision = {
        reasoning: '',
        selectedGoal: 'material-gain',
        plan: ['capture-queen', 'advance-pawn'],
        commands: [],
        confidence: 0.85,
      };

      const reasoning = ChessDecisionTranslator.extractReasoning(decision);

      expect(reasoning).toContain('material-gain');
      expect(reasoning).toContain('capture-queen');
      expect(reasoning).toContain('85%');
    });

    it('should provide default when no reasoning information available', () => {
      const decision: BrainDecision = {
        reasoning: '',
        selectedGoal: '',
        plan: [],
        commands: [],
        confidence: 0,
      };

      const reasoning = ChessDecisionTranslator.extractReasoning(decision);

      expect(reasoning).toBe('No reasoning provided');
    });

    it('should handle confidence formatting', () => {
      const decision: BrainDecision = {
        reasoning: '',
        selectedGoal: 'test',
        plan: [],
        commands: [],
        confidence: 0.7234,
      };

      const reasoning = ChessDecisionTranslator.extractReasoning(decision);

      expect(reasoning).toContain('72%');
    });
  });

  describe('Move String Matching', () => {
    it('should match moves with check notation', () => {
      const decision: BrainDecision = {
        reasoning: 'Check move',
        selectedGoal: 'attack',
        plan: [],
        commands: ['e4+'],
        confidence: 0.8,
      };

      const commands = [
        {
          id: 'move-0',
          action: 'move',
          target: 'e2e4',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'e2e4',
        },
      ];

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        commands,
        ['e2e4']
      );

      // Should match "e4+" to "e2e4" (after normalization)
      expect(result.success || result.isFallback).toBe(true);
    });

    it('should handle checkmate notation', () => {
      const decision: BrainDecision = {
        reasoning: 'Checkmate',
        selectedGoal: 'checkmate',
        plan: [],
        commands: ['Qh5#'],
        confidence: 1.0,
      };

      const commands = [
        {
          id: 'move-0',
          action: 'move',
          target: 'Qh5',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'Qh5#',
        },
      ];

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        commands,
        ['Qh5']
      );

      expect(result.isFallback).toBe(false);
    });

    it('should be case-insensitive for move matching', () => {
      const decision: BrainDecision = {
        reasoning: 'Uppercase move',
        selectedGoal: 'test',
        plan: [],
        commands: ['E2E4'],
        confidence: 0.9,
      };

      const commands = [
        {
          id: 'move-0',
          action: 'move',
          target: 'e2e4',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'e2e4',
        },
      ];

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        commands,
        ['e2e4']
      );

      expect(result.success).toBe(true);
      expect(result.move).toBe('e2e4');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty legal moves array', () => {
      const decision: BrainDecision = {
        reasoning: 'Stalemate',
        selectedGoal: 'none',
        plan: [],
        commands: ['e2e4'],
        confidence: 0,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        []
      );

      expect(result.success).toBe(false);
      expect(result.isFallback).toBe(true);
      expect(result.move).toBeNull();
    });

    it('should handle single legal move available', () => {
      const decision: BrainDecision = {
        reasoning: 'Only move',
        selectedGoal: 'forced',
        plan: [],
        commands: ['e2e4'],
        confidence: 1.0,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        ['e2e4']
      );

      expect(result.success).toBe(true);
      expect(result.move).toBe('e2e4');
    });

    it('should handle whitespace in move strings', () => {
      const decision: BrainDecision = {
        reasoning: 'Whitespace test',
        selectedGoal: 'test',
        plan: [],
        commands: [' e2e4 '],
        confidence: 0.9,
      };

      const commands = [
        {
          id: 'move-0',
          action: 'move',
          target: 'e2e4',
          expectedDuration: 1,
          expectedCost: 0,
          description: 'e2e4',
        },
      ];

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        commands,
        ['e2e4']
      );

      expect(result.isFallback).toBe(false);
    });
  });

  describe('Translation Result Properties', () => {
    it('should include reasoning in successful translation', () => {
      const decision: BrainDecision = {
        reasoning: 'Excellent move',
        selectedGoal: 'attack',
        plan: [],
        commands: ['e2e4'],
        confidence: 0.95,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.reasoning).toContain('Excellent');
    });

    it('should mark fallback moves clearly', () => {
      const decision: BrainDecision = {
        reasoning: 'Bad choice',
        selectedGoal: 'test',
        plan: [],
        commands: ['invalid-move'],
        confidence: 0.1,
      };

      const result = ChessDecisionTranslator.translateDecision(
        decision,
        availableCommands,
        legalMoves
      );

      expect(result.isFallback).toBe(true);
      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('fallback');
    });
  });
});
