import type { GameAdapter, GameCapabilities, GameSession } from '@ai-commander/adapter';
import { OpenRAGameSession } from './openra-game-session.js';

/**
 * OpenRA Game Adapter.
 *
 * Implements the GameAdapter contract for OpenRA integration.
 * Composes ObservationProvider and CommandExecutor for observation and control.
 *
 * Responsibilities:
 * - Lifecycle management (initialization, shutdown)
 * - Session creation
 * - Capability reporting
 *
 * The adapter is a pure integration layer with no game logic.
 */
export class OpenRAGameAdapter implements GameAdapter {
  readonly adapterId = 'openra-adapter';
  readonly displayName = 'OpenRA Adapter';

  readonly capabilities: GameCapabilities = {
    supportsPause: true, // OpenRA supports pause
    supportsSaveState: true, // OpenRA supports replay/savestate
    supportsDeterministicMode: true, // OpenRA is deterministic
    supportsReplay: true, // OpenRA has replay system
    supportsCompleteWorldState: true, // We provide complete world state
    supportsMultipleAgents: true, // OpenRA supports multi-player
    maxTicksPerSecond: 25, // OpenRA fixed tick: 40ms = 25 ticks/sec
    metadata: {
      name: 'OpenRA',
      description: 'Real-time strategy game with deterministic simulation',
      integrationType: 'Direct API Integration',
    },
  };

  private initialized: boolean = false;
  private sessionCounter: number = 0;
  private gameInstanceAccessor: (() => Promise<any>) | null = null;
  private orderSubmitter: ((order: any) => Promise<boolean>) | null = null;
  private stateChecker: (() => Promise<boolean>) | null = null;

  /**
   * Initialize the adapter.
   *
   * Validates OpenRA is installed and accessible.
   *
   * @param config Configuration including game instance accessor
   */
  async initialize(config?: Record<string, unknown>): Promise<void> {
    if (this.initialized) {
      throw new Error('Adapter is already initialized');
    }

    if (!config) {
      throw new Error('Initialization config required with gameInstanceAccessor');
    }

    const gameInstanceAccessor = config.gameInstanceAccessor as (() => Promise<any>) | undefined;
    const orderSubmitter = config.orderSubmitter as ((order: any) => Promise<boolean>) | undefined;
    const stateChecker = config.stateChecker as (() => Promise<boolean>) | undefined;

    if (!gameInstanceAccessor) {
      throw new Error('gameInstanceAccessor is required in config');
    }

    if (!orderSubmitter) {
      throw new Error('orderSubmitter is required in config');
    }

    if (!stateChecker) {
      throw new Error('stateChecker is required in config');
    }

    // Verify OpenRA is accessible
    try {
      const gameState = await gameInstanceAccessor();
      if (!gameState) {
        throw new Error('Game instance not accessible');
      }
    } catch (error) {
      throw new Error(
        `Failed to initialize adapter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    this.gameInstanceAccessor = gameInstanceAccessor;
    this.orderSubmitter = orderSubmitter;
    this.stateChecker = stateChecker;
    this.initialized = true;
  }

  /**
   * Create a new game session.
   *
   * Each session represents one running game instance.
   *
   * @param gameConfig Optional game configuration (map, difficulty, etc)
   * @returns New GameSession ready for observation and commands
   */
  async createSession(gameConfig?: Record<string, unknown>): Promise<GameSession> {
    if (!this.initialized) {
      throw new Error('Adapter must be initialized before creating sessions');
    }

    if (!this.gameInstanceAccessor || !this.orderSubmitter || !this.stateChecker) {
      throw new Error('Adapter not properly initialized with required functions');
    }

    // Generate unique session ID
    const sessionId = `session-${++this.sessionCounter}-${Date.now()}`;

    // Create session with composed providers
    const session = new OpenRAGameSession(
      sessionId,
      this.capabilities,
      this.gameInstanceAccessor,
      this.orderSubmitter,
      this.stateChecker
    );

    // Store gameConfig if provided (for future use in game initialization)
    if (gameConfig) {
      // Game-specific configuration would be applied here
      // For now, we just validate it's accepted
    }

    return session;
  }

  /**
   * Shutdown the adapter.
   *
   * Cleans up resources and closes all connections.
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      throw new Error('Adapter is not initialized');
    }

    // Clear all references
    this.gameInstanceAccessor = null;
    this.orderSubmitter = null;
    this.stateChecker = null;
    this.sessionCounter = 0;
    this.initialized = false;
  }

  /**
   * Get adapter version and compatibility information.
   */
  async getAdapterInfo(): Promise<{
    readonly version: string;
    readonly gameVersion?: string;
    readonly compatibility?: string;
  }> {
    return {
      version: '1.0.0',
      gameVersion: 'OpenRA (any recent version)',
      compatibility: 'Deterministic game sessions with full observation and command execution',
    };
  }
}
