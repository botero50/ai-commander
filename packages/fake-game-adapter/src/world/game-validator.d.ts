/**
 * Game Validator
 *
 * Validate that multi-LLM framework works with different game types:
 * - Classic RTS (current)
 * - Turn-based strategy (Chess-like)
 * - Real-time puzzle (Tetris-like)
 * - Card game (Deck management)
 * - Simulation (Economy/City building)
 */
import type { Brain } from './brain-sdk.js';
export type GameType = 'rts' | 'turn-based-strategy' | 'puzzle' | 'card-game' | 'simulation';
export interface GameValidationResult {
    readonly gameType: GameType;
    readonly compatible: boolean;
    readonly brainName: string;
    readonly decisionsProcessed: number;
    readonly outputsValid: number;
    readonly errors: string[];
    readonly executionTimeMs: number;
}
/**
 * Game Validator - test brain compatibility across game types
 */
export declare class GameValidator {
    /**
     * Validate a brain across different game types
     */
    validateBrain(brain: Brain): Promise<GameValidationResult[]>;
    /**
     * Validate brain on specific game type
     */
    private validateGameType;
    /**
     * Create mock inputs for different game types
     */
    private createInputsForGameType;
    /**
     * Validate output structure
     */
    private isValidBrainOutput;
    /**
     * Get validation summary
     */
    getSummary(results: GameValidationResult[]): {
        totalGames: number;
        compatibleGames: number;
        compatibilityRate: number;
        totalErrors: number;
    };
}
//# sourceMappingURL=game-validator.d.ts.map