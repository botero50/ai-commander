/**
 * Chess Decision Translator — Converts brain decisions to chess moves.
 *
 * Translates:
 * - BrainDecision (selected goal, plan, commands) → ChessCommand (move)
 * - Brain's choice from available commands → legal chess move
 * - Invalid selections → fallback legal move
 */

import type { BrainDecision, CommandOption } from '@ai-commander/brain';

export interface DecisionTranslationResult {
  readonly success: boolean;
  readonly move: string | null;
  readonly reasoning: string;
  readonly isFallback: boolean;
}

export class ChessDecisionTranslator {
  /**
   * Extract a legal chess move from a brain decision.
   *
   * @param decision The brain's decision object
   * @param availableCommands The available move options the brain could choose from
   * @param legalMoves All legal moves in the current position
   * @returns Translation result with move or fallback
   */
  static translateDecision(
    decision: BrainDecision,
    availableCommands: CommandOption[],
    legalMoves: string[]
  ): DecisionTranslationResult {
    // Brain returns selected commands (moves it chose)
    if (!decision.commands || decision.commands.length === 0) {
      return {
        success: false,
        move: this.selectRandomLegalMove(legalMoves),
        reasoning: 'Brain provided no move selection, using random fallback',
        isFallback: true,
      };
    }

    // Get the first command the brain selected (primary choice)
    const selectedCommand = decision.commands[0];

    // Validate that the selected command is in the available options
    const isValidSelection = availableCommands.some(cmd =>
      this.moveStringsMatch(selectedCommand, cmd.description)
    );

    if (!isValidSelection) {
      return {
        success: false,
        move: this.selectRandomLegalMove(legalMoves),
        reasoning: `Brain selected "${selectedCommand}" which is not in available options, using random fallback`,
        isFallback: true,
      };
    }

    // Validate that the move is legal
    const isLegalMove = legalMoves.some(legal =>
      this.moveStringsMatch(selectedCommand, legal)
    );

    if (!isLegalMove) {
      return {
        success: false,
        move: this.selectRandomLegalMove(legalMoves),
        reasoning: `Brain selected "${selectedCommand}" which is not legal, using random fallback`,
        isFallback: true,
      };
    }

    // Success: valid selection and legal move
    return {
      success: true,
      move: selectedCommand,
      reasoning: `Brain selected move: ${selectedCommand}`,
      isFallback: false,
    };
  }

  /**
   * Extract reasoning from a brain decision.
   */
  static extractReasoning(decision: BrainDecision): string {
    if (decision.reasoning) {
      return decision.reasoning;
    }

    const parts: string[] = [];
    if (decision.selectedGoal) {
      parts.push(`Goal: ${decision.selectedGoal}`);
    }
    if (decision.plan && decision.plan.length > 0) {
      parts.push(`Plan: ${decision.plan.join(' → ')}`);
    }
    if (decision.confidence) {
      parts.push(`Confidence: ${(decision.confidence * 100).toFixed(0)}%`);
    }

    return parts.length > 0 ? parts.join(', ') : 'No reasoning provided';
  }

  /**
   * Compare two move strings for equality, handling different notations.
   */
  private static moveStringsMatch(move1: string, move2: string): boolean {
    if (!move1 || !move2) return false;

    // Normalize: remove check/checkmate notation
    const normalize = (m: string) =>
      m.toLowerCase().replace(/[+#=].*$/, '').trim();

    return normalize(move1) === normalize(move2);
  }

  /**
   * Select a random legal move from available options.
   */
  private static selectRandomLegalMove(legalMoves: string[]): string | null {
    if (!legalMoves || legalMoves.length === 0) {
      return null;
    }
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }
}
