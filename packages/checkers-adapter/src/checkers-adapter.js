/**
 * Checkers Game Adapter — Reuse Brain interface without redesign
 *
 * Demonstrates that the Brain SDK works across multiple games.
 * Any brain can be plugged in to decide moves in a Checkers game.
 */
/**
 * Checkers: 8x8 board, 12 pieces per side
 * Pieces move diagonally 1 square forward, kings move any diagonal direction
 * Capture opponent pieces by jumping over them
 * Goal: eliminate opponent or block all moves
 */
export class CheckersGame {
    constructor() {
        this.board = [];
        this.redPieces = 12;
        this.blackPieces = 12;
        this.turn = 1; // 1 = red, -1 = black
        this.moveHistory = [];
        this.initializeBoard();
    }
    initializeBoard() {
        this.board = Array(8)
            .fill(0)
            .map(() => Array(8).fill(0));
        // Red pieces (bottom, 1 = red pawn, 2 = red king)
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = 1; // red pawn
                }
            }
        }
        // Black pieces (top, -1 = black pawn, -2 = black king)
        for (let r = 5; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if ((r + c) % 2 === 1) {
                    this.board[r][c] = -1; // black pawn
                }
            }
        }
    }
    getObservation(playerId) {
        return {
            tick: this.moveHistory.length,
            timestamp: Date.now(),
            missionId: 'checkers-game',
            agentId: playerId,
            agentName: 'CheckersPlayer',
            agentPosition: { x: 4, y: 4 }, // center
            agentHealth: 100,
            friendlyUnits: [],
            enemyUnits: [],
            resources: [
                { type: 'my-pieces', amount: this.turn === 1 ? this.redPieces : this.blackPieces },
                { type: 'opponent-pieces', amount: this.turn === 1 ? this.blackPieces : this.redPieces },
            ],
            structures: [],
            visibility: {
                explored: 64,
                visible: 64,
                totalMap: 64,
                visibleEnemyCount: this.turn === 1 ? this.blackPieces : this.redPieces,
                visibleResourceCount: 0
            },
        };
    }
    getAvailableMoves() {
        const moves = [];
        const player = this.turn;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if ((piece > 0 && player > 0) || (piece < 0 && player < 0)) {
                    // Try simple forward moves (no captures for simplicity)
                    const directions = piece === 1 ? [[1, 1], [1, -1]] : piece === 2 ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [];
                    for (const [dr, dc] of directions) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && this.board[nr][nc] === 0) {
                            moves.push({
                                id: `move-${r}-${c}-${nr}-${nc}`,
                                action: 'move',
                                target: { x: nc, y: nr },
                                expectedDuration: 1,
                                expectedCost: 0,
                                description: `Move from (${r}, ${c}) to (${nr}, ${nc})`,
                            });
                        }
                    }
                }
            }
        }
        return moves;
    }
    getAvailableGoals() {
        return [
            {
                id: 'advance-pieces',
                intent: 'Move pieces toward opponent',
                priority: 'high',
                feasibility: 0.9,
                expectedDuration: 1,
                estimatedValue: 10,
            },
            {
                id: 'protect-pieces',
                intent: 'Keep pieces safe from capture',
                priority: 'medium',
                feasibility: 0.8,
                expectedDuration: 1,
                estimatedValue: 15,
            },
            {
                id: 'capture-opponent',
                intent: 'Capture opponent pieces if possible',
                priority: 'high',
                feasibility: 0.6,
                expectedDuration: 1,
                estimatedValue: 20,
            },
        ];
    }
    async executeMove(brain, playerId) {
        const observation = this.getObservation(playerId);
        const goals = this.getAvailableGoals();
        const commands = this.getAvailableMoves();
        const memory = {
            recentEvents: [],
            recentDecisions: [],
            metrics: {
                commandsExecuted: 0,
                commandsFailed: 0,
                goalsCompleted: 0,
                goalsAbandoned: 0,
            },
        };
        if (commands.length === 0) {
            // No moves: loss (simplified)
            return false;
        }
        const decision = await brain.decide(observation, goals, commands, memory);
        if (decision.commands.length > 0) {
            const moveId = decision.commands[0];
            const move = commands.find((c) => c.id === moveId);
            if (move && typeof moveId === 'string') {
                // Parse move coordinates
                const match = moveId.match(/move-(\d+)-(\d+)-(\d+)-(\d+)/);
                if (match) {
                    const [, r, c, nr, nc] = match.map(Number);
                    this.executeCheckerMove(r, c, nr, nc);
                    this.turn *= -1;
                    this.moveHistory.push({ from: { x: c, y: r }, to: { x: nc, y: nr } });
                    return true;
                }
            }
        }
        return false;
    }
    executeCheckerMove(fromR, fromC, toR, toC) {
        const piece = this.board[fromR][fromC];
        this.board[fromR][fromC] = 0;
        // Promote to king if reaching end
        if ((piece === 1 && toR === 7) || (piece === -1 && toR === 0)) {
            this.board[toR][toC] = piece * 2;
        }
        else {
            this.board[toR][toC] = piece;
        }
        // Check for capture (simplified)
        const midR = Math.floor((fromR + toR) / 2);
        const midC = Math.floor((fromC + toC) / 2);
        if (Math.abs(toR - fromR) > 1 && this.board[midR] && this.board[midR][midC]) {
            const capturedPiece = this.board[midR][midC];
            this.board[midR][midC] = 0;
            if (capturedPiece > 0)
                this.redPieces--;
            if (capturedPiece < 0)
                this.blackPieces--;
        }
    }
    getWinner() {
        if (this.redPieces === 0)
            return 'black';
        if (this.blackPieces === 0)
            return 'red';
        return undefined;
    }
    isOver() {
        return this.getWinner() !== undefined || this.moveHistory.length > 200;
    }
}
//# sourceMappingURL=checkers-adapter.js.map