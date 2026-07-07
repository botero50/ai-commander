export interface OpenRAConfig {
    readonly executable?: string;
    readonly workingDirectory?: string;
    readonly headless?: boolean;
    readonly port?: number;
    readonly resolution?: {
        width: number;
        height: number;
    };
    readonly logLevel?: "debug" | "info" | "warn" | "error";
}
export declare class OpenRAProcessManager {
    private process;
    private config;
    private health;
    constructor(config?: OpenRAConfig);
    launch(): Promise<void>;
    shutdown(): Promise<void>;
    isAlive(): boolean;
    healthCheck(): Promise<boolean>;
    private waitForReady;
    private buildArgs;
    private getDefaultExecutable;
}
//# sourceMappingURL=process-manager.d.ts.map