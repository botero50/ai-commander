/**
 * CLI
 *
 * Command-line interface for AI Commander.
 * - Parse arguments
 * - Dispatch commands
 * - Handle errors
 */
interface Command {
    readonly name: string;
    readonly description: string;
    readonly handler: (args: string[]) => Promise<number>;
}
/**
 * CLI application
 */
export declare class CLI {
    private commands;
    private readonly appName;
    constructor();
    /**
     * Register a command
     */
    register(command: Command): void;
    /**
     * Parse command line arguments
     */
    parseArgs(argv: string[]): {
        readonly command: string;
        readonly args: string[];
    };
    /**
     * Run CLI
     */
    run(argv: string[]): Promise<number>;
    /**
     * Register default commands
     */
    private registerDefaultCommands;
}
export {};
//# sourceMappingURL=cli.d.ts.map