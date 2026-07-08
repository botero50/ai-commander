export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare class Logger {
    private level;
    private context;
    constructor(level?: LogLevel, context?: string);
    debug(message: string, data?: unknown): void;
    info(message: string, data?: unknown): void;
    warn(message: string, data?: unknown): void;
    error(message: string, error?: unknown): void;
}
//# sourceMappingURL=logger.d.ts.map