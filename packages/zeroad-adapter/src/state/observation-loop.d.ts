import { GameState } from './state-types.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
export interface ObservationConfig {
    frequency: number;
}
export declare class ObservationLoop {
    private extractor;
    private logger;
    private ipcBridge;
    private config;
    private loopInterval;
    private isRunning;
    private lastState;
    private observationCount;
    private totalLatency;
    constructor(ipcBridge: IPCBridge, config: ObservationConfig, logger: Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    getLastState(): GameState | null;
    getMetrics(): {
        isRunning: boolean;
        observationCount: number;
        avgLatency: string | number;
    };
    private observeTick;
    private validateConfig;
}
//# sourceMappingURL=observation-loop.d.ts.map