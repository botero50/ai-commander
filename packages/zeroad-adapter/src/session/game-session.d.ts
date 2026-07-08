import { GameSession, GameCapabilities, ObservationProvider as IObservationProvider, CommandExecutor } from '@ai-commander/adapter';
import { WorldState } from '@ai-commander/domain';
import { GameProcess } from '../types/game-process.js';
import { IPCBridge } from '../types/ipc-bridge.js';
import { Logger } from '../config/logger.js';
import { ObservationProvider } from '../observation/observation-provider.js';
export declare class ZeroADGameSession implements GameSession {
    readonly sessionId: string;
    readonly capabilities: GameCapabilities;
    private process;
    private ipcBridge;
    private observationLoop;
    private logger;
    private config?;
    private started;
    private paused;
    readonly observationProvider: IObservationProvider;
    readonly commandExecutor: CommandExecutor;
    constructor(sessionId: string, capabilities: GameCapabilities, process: GameProcess, ipcBridge: IPCBridge, observationLoop: ObservationProvider, logger: Logger, config?: Record<string, unknown>);
    start(): Promise<WorldState>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    stop(): Promise<void>;
    isActive(): Promise<boolean>;
}
//# sourceMappingURL=game-session.d.ts.map