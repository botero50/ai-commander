import type { GameCapabilities } from './game-capabilities.js';
import type { GameSession } from './game-session.js';
/**
 * High-level entry point for integrating external games with AI Commander.
 *
 * Owns:
 * - Lifecycle (initialization, configuration)
 * - Capabilities (what the game supports)
 * - Session creation (starting game sessions)
 *
 * The adapter is the boundary between AI Commander and any external game.
 * The framework never knows the specifics of how the game works.
 * Those details are hidden behind the adapter interface.
 *
 * Adapters may implement:
 * - Direct game integration (DLL hooks, memory reading)
 * - Network protocols (RPC, WebSocket, REST)
 * - Emulator interface (file I/O, scripting)
 * - UI automation (Windows API, Playwright)
 * - Computer vision (OCR, screen capture)
 * - Or any other mechanism to observe and control the game
 *
 * But the framework sees only the contract.
 */
export interface GameAdapter {
    /**
     * Unique identifier for this adapter implementation.
     *
     * Used for logging and configuration.
     * Examples: "openra-adapter", "starcraft2-adapter", "chess-adapter"
     */
    readonly adapterId: string;
    /**
     * Human-readable name of the adapter.
     *
     * Shown in UI and logs.
     * Examples: "OpenRA Adapter", "StarCraft II Adapter"
     */
    readonly displayName: string;
    /**
     * Capabilities of all games this adapter controls.
     *
     * Shared across all sessions created by this adapter.
     * If specific games have different capabilities, they should have
     * different adapters.
     */
    readonly capabilities: GameCapabilities;
    /**
     * Initialize the adapter.
     *
     * Called once on startup.
     * Validates that the game is installed, accessible, and compatible.
     *
     * @param config Adapter-specific configuration
     * @throws Error if game cannot be initialized
     */
    initialize(config?: Record<string, unknown>): Promise<void>;
    /**
     * Create a new game session.
     *
     * Starts a game instance and returns a session for controlling it.
     * May reuse running game or start a new one.
     *
     * @param gameConfig Optional game-specific configuration
     * @returns A new GameSession ready for observation and commands
     * @throws Error if game cannot be started
     */
    createSession(gameConfig?: Record<string, unknown>): Promise<GameSession>;
    /**
     * Shutdown the adapter.
     *
     * Called on cleanup.
     * Closes resources, stops running games, etc.
     */
    shutdown(): Promise<void>;
    /**
     * Get information about the adapter version and compatibility.
     *
     * @returns Version string (e.g., "1.0.0") and compatibility info
     */
    getAdapterInfo(): Promise<{
        readonly version: string;
        readonly gameVersion?: string;
        readonly compatibility?: string;
    }>;
}
//# sourceMappingURL=game-adapter.d.ts.map