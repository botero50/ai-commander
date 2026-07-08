import { GameCommand } from './command-types.js';
import { GameState } from '../state/state-types.js';
import { Logger } from '../config/logger.js';
export interface VerificationResult {
    commandId: string;
    verified: boolean;
    latencyMs: number;
    evidence: string;
    error?: string;
}
export declare class CommandVerifier {
    private logger;
    private previousState;
    private verificationHistory;
    constructor(logger: Logger);
    /**
     * Verify that a command had its intended effect on the world state.
     * Compares state before and after command execution.
     */
    verify(command: GameCommand, currentState: GameState, previousState: GameState | null): VerificationResult;
    updatePreviousState(state: GameState): void;
    getVerificationResult(commandId: string): VerificationResult | undefined;
    getMetrics(): {
        totalVerified: number;
        successfulVerifications: number;
        failedVerifications: number;
        verificationRate: string;
    };
    clearHistory(): void;
    private verifyMove;
    private verifyAttack;
    private verifyGather;
    private verifyBuild;
    private verifyTrain;
    private verifyPatrol;
    private verifyRepair;
    private verifyStop;
    private distance;
}
//# sourceMappingURL=command-verifier.d.ts.map