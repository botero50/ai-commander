import { GameAdapter, GameSession, GameCapabilities } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
import { GameProcess } from './types/game-process.js';
import { IPCBridge } from './types/ipc-bridge.js';
import { Logger } from './config/logger.js';
import { ObservationProvider } from './observation/observation-provider.js';
import { ZeroADGameSession } from './session/game-session.js';
export declare class ZeroADAdapter implements GameAdapter {
    readonly adapterId = "0ad-adapter";
    readonly displayName = "0 A.D. Adapter";
    readonly capabilities: GameCapabilities;
    private config;
    private logger;
    private process;
    private ipcBridge;
    private observationProvider;
    private session;
    private initialized;
    constructor(configOverrides?: Partial<ZeroADConfiguration>);
    initialize(config?: Record<string, unknown>): Promise<void>;
    createSession(gameConfig?: Record<string, unknown>): Promise<GameSession>;
    shutdown(): Promise<void>;
    getAdapterInfo(): Promise<{
        version: string;
        gameVersion?: string;
        compatibility?: string;
    }>;
    getConfig(): ZeroADConfiguration;
    getLogger(): Logger;
    getProcess(): GameProcess;
    getIPCBridge(): IPCBridge;
    getObservationProvider(): ObservationProvider;
    getSession(): ZeroADGameSession | null;
    private sanitizeConfig;
}
//# sourceMappingURL=adapter.d.ts.map