/**
 * Demo Orchestrator — One-command end-to-end tournament
 *
 * Single entry point:
 * ai-commander tournament --game openra --brain-a claude --brain-b gpt4 --games 5
 *
 * Orchestrates:
 * 1. Load provider configs
 * 2. Run tournament
 * 3. Generate reports
 * 4. Display results
 */
export interface DemoConfig {
    readonly brainA: string;
    readonly brainB: string;
    readonly games: number;
    readonly format: "single" | "multi" | "tournament";
    readonly verbose?: boolean;
    readonly exportPath?: string;
}
/**
 * DemoOrchestrator: Run complete tournament end-to-end
 *
 * Usage:
 * ai-commander tournament --brain-a claude --brain-b gpt4 --games 5
 */
export declare class DemoOrchestrator {
    /**
     * Run a complete tournament from CLI args.
     */
    static run(config: DemoConfig): Promise<void>;
    /**
     * Run single match.
     */
    private static runSingleMatch;
    /**
     * Run multi-match series.
     */
    private static runMultiMatch;
    /**
     * Get brain configuration from name.
     */
    private static getBrainConfigs;
}
//# sourceMappingURL=demo-orchestrator.d.ts.map