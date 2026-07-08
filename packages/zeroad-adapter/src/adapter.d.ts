import { GameAdapter, GameSession } from '@ai-commander/adapter';
import { ZeroADConfiguration } from './types/configuration.js';
export declare class ZeroADAdapter implements GameAdapter {
    private config;
    private process;
    private ipcBridge;
    constructor(config: ZeroADConfiguration);
    startGame(): Promise<GameSession>;
    stopGame(): Promise<void>;
    getSession(): Promise<GameSession | null>;
    private validateConfig;
}
//# sourceMappingURL=adapter.d.ts.map