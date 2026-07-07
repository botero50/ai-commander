import type { GameAdapter, GameSession, GameCapabilities } from '@ai-commander/adapter';
/**
 * Fake game adapter.
 *
 * Entry point for creating sessions with the in-memory fake game.
 * Reference implementation of GameAdapter interface.
 */
export declare class FakeGameAdapter implements GameAdapter {
    readonly adapterId: string;
    readonly displayName: string;
    readonly capabilities: GameCapabilities;
    private initialized;
    private sessionCounter;
    initialize(): Promise<void>;
    createSession(): Promise<GameSession>;
    shutdown(): Promise<void>;
    getAdapterInfo(): Promise<{
        version: string;
        compatible: string[];
    }>;
}
//# sourceMappingURL=fake-game-adapter.d.ts.map