export interface GameProcess {
    pid: number;
    isRunning: boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    restart(): Promise<void>;
    health(): Promise<boolean>;
}
//# sourceMappingURL=game-process.d.ts.map