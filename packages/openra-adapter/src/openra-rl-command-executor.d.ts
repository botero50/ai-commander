/**
 * OpenRA-RL Command Executor — Send real commands to OpenRA via HTTP
 *
 * Converts AI Commander commands to OpenRA-RL format and executes them
 * against the live game.
 *
 * Validates commands before and after execution using game state.
 */
import type { OpenRAGameState } from "./state-reader";
import type { CommandValidationResult } from "./command-executor";
import type { CommandOption } from "@ai-commander/brain";
/**
 * OpenRA-RL Command Executor
 *
 * Sends real commands to OpenRA game via HTTP
 */
export declare class OpenRACommandExecutorRL {
    private baseUrl;
    private timeout;
    private retries;
    private verbose;
    constructor(baseUrl?: string, timeout?: number, retries?: number, verbose?: boolean);
    /**
     * Execute a command against the live game
     */
    executeCommand(brainCommand: CommandOption, unitId: string, gameState: OpenRAGameState, playerName: string): Promise<CommandValidationResult>;
    /**
     * Verify that world state changed after command execution
     */
    verifyStateChange(beforeState: OpenRAGameState, afterState: OpenRAGameState): Promise<boolean>;
    /**
     * Map AI Commander action to OpenRA order name
     */
    private mapCommandToOrderName;
    /**
     * Map command target to OpenRA format
     */
    private mapCommandToTarget;
    /**
     * Describe expected effect of a command
     */
    private describeExpectedEffect;
    /**
     * Submit order to OpenRA-RL
     */
    private submitOrder;
    /**
     * HTTP request with retry logic
     */
    private fetchWithRetry;
    /**
     * Log helper
     */
    private log;
}
/**
 * Create OpenRA-RL command executor
 */
export declare function createOpenRACommandExecutorRL(baseUrl?: string, verbose?: boolean): OpenRACommandExecutorRL;
//# sourceMappingURL=openra-rl-command-executor.d.ts.map