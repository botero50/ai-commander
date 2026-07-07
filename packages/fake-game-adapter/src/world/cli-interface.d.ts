/**
 * CLI Interface
 *
 * Command-line interface for multi-LLM arena:
 * - Tournament execution with configuration
 * - Experiment runner with hyperparameter sweep
 * - Report generation (HTML, JSON, CSV, Markdown)
 * - Model benchmarking and comparison
 * - Results export and visualization
 */
export interface CLIConfig {
    readonly tournamentFormat: 'round-robin' | 'swiss' | 'best-of' | 'elimination';
    readonly models: Array<{
        readonly provider: 'builtin' | 'openai' | 'claude' | 'gemini' | 'ollama';
        readonly name: string;
        readonly model?: string;
        readonly apiKey?: string;
    }>;
    readonly matchMaxTicks: number;
    readonly outputFormats: Array<'html' | 'json' | 'csv' | 'markdown'>;
    readonly outputPath: string;
    readonly verbose?: boolean;
}
export interface CLIResult {
    readonly success: boolean;
    readonly message: string;
    readonly outputFiles?: string[];
    readonly errorDetails?: string;
}
/**
 * CLI Interface - command-line execution
 */
export declare class CLIInterface {
    /**
     * Parse command-line arguments
     */
    static parseArgs(args: string[]): Partial<CLIConfig>;
    /**
     * Validate configuration
     */
    static validateConfig(config: CLIConfig): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Get usage instructions
     */
    static getUsage(): string;
    /**
     * Get example configuration file
     */
    static getExampleConfig(): string;
    /**
     * Get model setup guide
     */
    static getModelSetupGuide(): string;
    /**
     * Format output message for CLI
     */
    static formatOutput(result: CLIResult, verbose?: boolean): string;
    /**
     * Create progress reporter for long-running operations
     */
    static createProgressReporter(total: number, label?: string): {
        start: () => void;
        update: (current: number) => void;
        finish: () => void;
    };
    /**
     * Format table output
     */
    static formatTable(data: Array<Record<string, string | number>>, columns: string[]): string;
}
//# sourceMappingURL=cli-interface.d.ts.map