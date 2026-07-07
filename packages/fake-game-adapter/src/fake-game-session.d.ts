import type { GameSession, ObservationProvider, CommandExecutor, GameCapabilities } from '@ai-commander/adapter';
import type { WorldState } from '@ai-commander/domain';
/**
 * Fake game session.
 *
 * Manages a single in-memory game instance.
 * Lifecycle: start → pause/resume/execute → stop
 */
export declare class FakeGameSession implements GameSession {
    readonly sessionId: string;
    readonly observationProvider: ObservationProvider;
    readonly commandExecutor: CommandExecutor;
    readonly capabilities: GameCapabilities;
    private readonly capabilitiesValue;
    private world;
    private stateStack;
    private active;
    private paused;
    private observationProviderImpl;
    private commandExecutorImpl;
    constructor(sessionId: string);
    isActive(): Promise<boolean>;
    start(): Promise<WorldState>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    saveState(): Promise<string>;
    restoreState(_saveId: string): Promise<void>;
    stop(): Promise<void>;
    progressTick(): Promise<void>;
}
//# sourceMappingURL=fake-game-session.d.ts.map