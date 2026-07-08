import { WorldState } from '@ai-commander/domain';
import { ObservationConfig } from '../state/observation-loop.js';
import { Logger } from '../config/logger.js';
import { IPCBridge } from '../types/ipc-bridge.js';
export interface ObservationProviderConfig extends ObservationConfig {
}
export declare class ObservationProvider {
    private observationLoop;
    private stateExtractor;
    private worldMapper;
    private logger;
    private ipcBridge;
    private currentWorldState;
    private lastUpdateTime;
    private updateCount;
    constructor(ipcBridge: IPCBridge, config: ObservationProviderConfig, logger: Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    getCurrentWorldState(): WorldState | null;
    getMetrics(): {
        updateCount: number;
        lastUpdateTime: number;
        hasState: boolean;
        isRunning: boolean;
        observationCount: number;
        avgLatency: string | number;
    };
    private observeOnce;
    /**
     * Register a callback to be invoked on each state update.
     * Callback receives the new WorldState.
     */
    onStateUpdate(callback: (state: WorldState) => void): void;
}
//# sourceMappingURL=observation-provider.d.ts.map