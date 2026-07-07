/**
 * Checkers Game Adapter — Reuse Brain interface without redesign
 *
 * Demonstrates that the Brain SDK works across multiple games.
 * Any brain can be plugged in to decide moves in a Checkers game.
 */
import type { Brain, CommandOption, GoalOption, WorldObservation } from '@ai-commander/brain';
/**
 * Checkers: 8x8 board, 12 pieces per side
 * Pieces move diagonally 1 square forward, kings move any diagonal direction
 * Capture opponent pieces by jumping over them
 * Goal: eliminate opponent or block all moves
 */
export declare class CheckersGame {
    private board;
    private redPieces;
    private blackPieces;
    private turn;
    private moveHistory;
    constructor();
    private initializeBoard;
    getObservation(playerId: string): WorldObservation;
    getAvailableMoves(): CommandOption[];
    getAvailableGoals(): GoalOption[];
    executeMove(brain: Brain, playerId: string): Promise<boolean>;
    private executeCheckerMove;
    getWinner(): 'red' | 'black' | undefined;
    isOver(): boolean;
}
//# sourceMappingURL=checkers-adapter.d.ts.map