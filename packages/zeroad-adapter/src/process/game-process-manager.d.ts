import { Logger } from '../config/logger.js';
import { GameProcess } from '../types/game-process.js';
export interface GameProcessConfig {
    executablePath: string;
    launchTimeout: number;
    shutdownTimeout: number;
}
export declare class GameProcessManager implements GameProcess {
    pid: number;
    isRunning: boolean;
    private process;
    private logger;
    private config;
    constructor(config: GameProcessConfig, logger: Logger);
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    health(): Promise<boolean>;
    private handleProcessExit;
    private handleProcessError;
    private cleanup;
}
//# sourceMappingURL=game-process-manager.d.ts.map