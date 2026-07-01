import type { Command } from '@ai-commander/domain';

/**
 * Execution result from the external game.
 *
 * Immutable record of command execution outcome.
 */
export interface CommandExecutionResult {
  /**
   * Whether command was accepted and executed.
   */
  readonly success: boolean;

  /**
   * Human-readable description of execution result.
   *
   * Success: "Unit moved to position (10,20)"
   * Failure: "Unit cannot move: blocked by terrain"
   */
  readonly message: string;

  /**
   * Game-specific execution data.
   *
   * May include:
   * - Actual outcome vs expected
   * - Resource costs
   * - Side effects
   * - Validation errors
   */
  readonly data?: Record<string, unknown>;

  /**
   * Optional error information if execution failed.
   */
  readonly error?: {
    readonly code: string;
    readonly reason: string;
  };
}

/**
 * Executes framework Commands against the external game.
 *
 * Responsibility: Translate framework Command into game action.
 *
 * Must not contain game logic.
 * Pure translation and validation.
 *
 * Must be deterministic: same command → same result.
 */
export interface CommandExecutor {
  /**
   * Execute a command in the external game.
   *
   * Called when framework has decided to take an action.
   * Must translate Command into game-specific action.
   *
   * @param command The framework command to execute
   * @returns Execution result (success or failure)
   * @throws Error if command cannot be executed (game crashed, disconnected)
   */
  executeCommand(command: Command): Promise<CommandExecutionResult>;

  /**
   * Execute multiple commands in sequence.
   *
   * Optional: batch execution if game supports it.
   * Default: execute one at a time.
   *
   * @param commands Array of commands to execute
   * @returns Array of execution results (same length as input)
   */
  executeCommands?(commands: readonly Command[]): Promise<readonly CommandExecutionResult[]>;

  /**
   * Validate if a command can be executed.
   *
   * Pre-flight check without actually executing.
   * Used for planning and decision validation.
   *
   * @param command The command to validate
   * @returns true if command can be executed, false if invalid/impossible
   */
  canExecuteCommand(command: Command): Promise<boolean>;

  /**
   * Check if executor can still send commands to game.
   *
   * Used to detect connection loss, crashes, or invalid state.
   *
   * @returns true if commands can be executed, false if game is unavailable
   */
  isExecutionAvailable(): Promise<boolean>;
}
