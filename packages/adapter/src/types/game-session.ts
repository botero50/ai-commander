import type { WorldState } from '@ai-commander/domain';
import type { ObservationProvider } from './observation-provider.js';
import type { CommandExecutor } from './command-executor.js';
import type { GameCapabilities } from './game-capabilities.js';

/**
 * Represents one running game session.
 *
 * Coordinates observation and command execution for the external game.
 *
 * Lifecycle:
 * 1. Create session
 * 2. Start game or connect to running game
 * 3. Observe state and execute commands in tick loop
 * 4. Stop/disconnect
 * 5. Cleanup
 */
export interface GameSession {
  /**
   * Unique identifier for this session.
   *
   * Used for logging, debugging, and state tracking.
   */
  readonly sessionId: string;

  /**
   * Capabilities of the external game.
   */
  readonly capabilities: GameCapabilities;

  /**
   * Observe world state from the external game.
   */
  readonly observationProvider: ObservationProvider;

  /**
   * Execute commands in the external game.
   */
  readonly commandExecutor: CommandExecutor;

  /**
   * Start the game session.
   *
   * Initializes connection to game and prepares for execution.
   *
   * @returns Initial world state after game starts
   * @throws Error if game cannot be started
   */
  start(): Promise<WorldState>;

  /**
   * Pause the game (if supported).
   *
   * Suspends execution while preserving state.
   * No-op if pauseNotSupported.
   *
   * @throws Error if pause not supported or fails
   */
  pause(): Promise<void>;

  /**
   * Resume the game (if paused).
   *
   * Continues execution from pause point.
   * No-op if not currently paused.
   *
   * @throws Error if resume fails
   */
  resume(): Promise<void>;

  /**
   * Save current game state (if supported).
   *
   * Creates checkpoint that can be restored later.
   * Used for replay and recovery.
   *
   * @returns Unique save identifier
   * @throws Error if saveState not supported
   */
  saveState?(): Promise<string>;

  /**
   * Restore previously saved game state (if supported).
   *
   * Returns game to previous checkpoint.
   *
   * @param saveId The save identifier from saveState()
   * @throws Error if restore fails or save not found
   */
  restoreState?(saveId: string): Promise<void>;

  /**
   * Stop the game session.
   *
   * Cleanly shut down the game and close connection.
   * Must be called before destroying session.
   *
   * @throws Error if stop fails
   */
  stop(): Promise<void>;

  /**
   * Check if session is currently active.
   *
   * @returns true if game is running, false if stopped/crashed
   */
  isActive(): Promise<boolean>;
}
