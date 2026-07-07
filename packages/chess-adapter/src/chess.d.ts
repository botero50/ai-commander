import type { Brain, GoalOption, WorldObservation } from "@ai-commander/brain";
export declare class ChessGame {
    private board;
    private whiteToMove;
    private moveHistory;
    constructor();
    private initializeBoard;
    getObservation(playerId: string): WorldObservation;
    getAvailableGoals(): GoalOption[];
    executeMove(brain: Brain, playerId: string): Promise<boolean>;
    isOver(): boolean;
}
//# sourceMappingURL=chess.d.ts.map