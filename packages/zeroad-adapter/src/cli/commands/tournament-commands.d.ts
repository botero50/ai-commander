/**
 * Tournament Commands
 *
 * CLI commands for tournament management.
 */
/**
 * Parse tournament run options
 */
export declare function parseTournamentOptions(args: string[]): {
    readonly brains: string[];
    readonly name: string;
    readonly format: 'round_robin' | 'single_elimination';
    readonly maxTicks: number;
    readonly replayDir: string;
    readonly parallel: number;
    readonly saveReplay: boolean;
    readonly verbose: boolean;
};
/**
 * Show tournament help text
 */
export declare function showTournamentHelp(): void;
/**
 * Tournament run command handler
 */
export declare function tournamentRunCommand(args: string[]): Promise<number>;
/**
 * Tournament status command handler
 */
export declare function tournamentStatusCommand(args: string[]): Promise<number>;
/**
 * Tournament list command handler
 */
export declare function tournamentListCommand(args: string[]): Promise<number>;
//# sourceMappingURL=tournament-commands.d.ts.map