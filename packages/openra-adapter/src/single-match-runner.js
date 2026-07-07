/**
 * Single Match Runner — Run one match between two providers
 *
 * Orchestrates:
 * 1. Initialize two brains from provider config
 * 2. Launch OpenRA game
 * 3. Run match to completion
 * 4. Record result with stats
 * 5. Validate fair play
 */
import { BrainManager } from "@ai-commander/brain";
import { MatchOrchestrator } from "./match-orchestrator";
import { ProviderValidator } from "./provider-validator";
import { OpenRAStateReader } from "./state-reader";
/**
 * SingleMatchRunner: Run one match between two providers
 *
 * Example:
 * ```
 * const result = await SingleMatchRunner.runMatch({
 *   provider1: { provider: 'claude', claude: { apiKey, model: 'claude-3-opus-20240229' } },
 *   provider2: { provider: 'openai', openai: { apiKey, model: 'gpt-4' } },
 * });
 * ```
 */
export class SingleMatchRunner {
    /**
     * Run a single match between two providers.
     */
    static async runMatch(config) {
        const startTime = Date.now();
        // Initialize brains
        const brain1 = await BrainManager.create(config.provider1);
        const brain2 = await BrainManager.create(config.provider2);
        const player1Name = config.player1Name || "GDI";
        const player2Name = config.player2Name || "Nod";
        // Get provider names
        const provider1Name = brain1.name;
        const provider2Name = brain2.name;
        // Run match
        const match = await MatchOrchestrator.runMatch(brain1, brain2, player1Name, player2Name, config.maxTicks);
        const durationMs = Date.now() - startTime;
        // Validate fair play
        const gameState = await new OpenRAStateReader().getGameState();
        const providers = new Map([
            [provider1Name, brain1],
            [provider2Name, brain2],
        ]);
        const playerNames = new Map([
            [provider1Name, player1Name],
            [provider2Name, player2Name],
        ]);
        const validationResult = await ProviderValidator.validateProviders(providers, gameState, playerNames, []);
        // Determine winner
        let winner = "draw";
        if (match.winner === "player1") {
            winner = "provider1";
        }
        else if (match.winner === "player2") {
            winner = "provider2";
        }
        return {
            match,
            provider1Name,
            provider2Name,
            winner,
            ticks: match.totalTicks,
            durationMs,
            validationPassed: validationResult.success,
            stats: {
                provider1Resources: match.player1Stats.resourcesGathered,
                provider2Resources: match.player2Stats.resourcesGathered,
                provider1Units: match.player1Stats.unitsProduced,
                provider2Units: match.player2Stats.unitsProduced,
                provider1Buildings: match.player1Stats.buildingsConstructed,
                provider2Buildings: match.player2Stats.buildingsConstructed,
            },
        };
    }
    /**
     * Generate human-readable report.
     */
    static generateReport(result) {
        const lines = [
            "=== Single Match Result ===",
            `${result.provider1Name} vs ${result.provider2Name}`,
            "",
            `Winner: ${result.winner === "draw" ? "Draw" : result.winner === "provider1" ? result.provider1Name : result.provider2Name}`,
            `Ticks: ${result.ticks}`,
            `Duration: ${(result.durationMs / 1000).toFixed(1)}s`,
            "",
            "Stats:",
            `  ${result.provider1Name}:`,
            `    Resources: ${result.stats.provider1Resources}`,
            `    Units: ${result.stats.provider1Units}`,
            `    Buildings: ${result.stats.provider1Buildings}`,
            `  ${result.provider2Name}:`,
            `    Resources: ${result.stats.provider2Resources}`,
            `    Units: ${result.stats.provider2Units}`,
            `    Buildings: ${result.stats.provider2Buildings}`,
            "",
            `Fair play: ${result.validationPassed ? "✓ PASS" : "✗ FAIL"}`,
        ];
        return lines.join("\n");
    }
}
//# sourceMappingURL=single-match-runner.js.map