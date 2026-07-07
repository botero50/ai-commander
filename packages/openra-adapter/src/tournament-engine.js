/**
 * Tournament Engine — Run full tournaments with multiple providers
 *
 * Supported formats:
 * 1. Round-robin: every provider plays every other once
 * 2. Double round-robin: every provider plays every other twice (both orders)
 * 3. Swiss: bracket-based elimination
 * 4. League: season-based (multiple rounds, standings)
 */
import { MultiMatchRunner } from "./multi-match-runner";
/**
 * TournamentEngine: Run full tournaments
 *
 * Example round-robin with 3 providers:
 * ```
 * const result = await TournamentEngine.run({
 *   format: 'round-robin',
 *   providers: new Map([
 *     ['claude', { provider: 'claude', ... }],
 *     ['gpt4', { provider: 'openai', ... }],
 *     ['ollama', { provider: 'ollama', ... }],
 *   ]),
 *   matchesPerPairing: 2,
 * });
 * ```
 */
export class TournamentEngine {
    /**
     * Run a tournament.
     */
    static async run(config) {
        const providers = Array.from(config.providers.entries());
        const matchesPerPairing = config.matchesPerPairing || 1;
        const format = config.format;
        // Generate pairings based on format
        let pairings = [];
        if (format === "round-robin") {
            pairings = this.roundRobinPairings(providers.map((p) => p[0]));
        }
        else if (format === "double-round-robin") {
            pairings = this.doubleRoundRobinPairings(providers.map((p) => p[0]));
        }
        else if (format === "swiss") {
            // Simplified: first round is round-robin
            pairings = this.roundRobinPairings(providers.map((p) => p[0]));
        }
        else if (format === "league") {
            pairings = this.doubleRoundRobinPairings(providers.map((p) => p[0]));
        }
        // Run all match pairs
        const matchResults = new Map();
        for (const [p1, p2] of pairings) {
            const matchKey = `${p1}-vs-${p2}`;
            const multiResult = await MultiMatchRunner.runMatches({
                provider1: config.providers.get(p1),
                provider2: config.providers.get(p2),
                matches: matchesPerPairing,
                swapAfterMatch: config.swapPlayers !== false,
            });
            matchResults.set(matchKey, multiResult);
        }
        // Calculate standings
        const standings = this.calculateStandings(matchResults, Array.from(config.providers.keys()));
        return {
            format,
            providersCount: providers.length,
            totalMatches: pairings.length,
            totalGames: pairings.length * matchesPerPairing,
            standings,
            matchResults,
        };
    }
    /**
     * Generate round-robin pairings (each provider plays each other once).
     */
    static roundRobinPairings(providers) {
        const pairings = [];
        for (let i = 0; i < providers.length; i++) {
            for (let j = i + 1; j < providers.length; j++) {
                pairings.push([providers[i], providers[j]]);
            }
        }
        return pairings;
    }
    /**
     * Generate double round-robin pairings (each provider plays each other twice, both orders).
     */
    static doubleRoundRobinPairings(providers) {
        const pairings = [];
        for (let i = 0; i < providers.length; i++) {
            for (let j = 0; j < providers.length; j++) {
                if (i !== j) {
                    pairings.push([providers[i], providers[j]]);
                }
            }
        }
        return pairings;
    }
    /**
     * Calculate tournament standings.
     */
    static calculateStandings(matchResults, allProviders) {
        const standings = new Map();
        // Initialize standings
        for (const provider of allProviders) {
            standings.set(provider, {
                wins: 0,
                losses: 0,
                draws: 0,
                games: 0,
            });
        }
        // Aggregate from match results
        for (const [matchKey, result] of matchResults) {
            const parts = matchKey.split("-vs-");
            const p1 = parts[0];
            const p2 = parts[1];
            const s1 = standings.get(p1);
            const s2 = standings.get(p2);
            const stats = result.stats;
            // Update wins/losses/draws
            s1.wins += stats.provider1Wins;
            s1.losses += stats.provider2Wins;
            s1.draws += stats.draws;
            s1.games += stats.totalMatches;
            s2.wins += stats.provider2Wins;
            s2.losses += stats.provider1Wins;
            s2.draws += stats.draws;
            s2.games += stats.totalMatches;
        }
        // Build final standings
        const result = [];
        for (const [provider, record] of standings) {
            const winRate = record.games > 0 ? record.wins / record.games : 0;
            const points = record.wins * 3 + record.draws * 1;
            result.push({
                rank: 0, // Assign later
                provider,
                wins: record.wins,
                losses: record.losses,
                draws: record.draws,
                totalGames: record.games,
                winRate,
                points,
            });
        }
        // Sort by points, then win rate
        result.sort((a, b) => {
            if (b.points !== a.points) {
                return b.points - a.points;
            }
            return b.winRate - a.winRate;
        });
        // Assign ranks
        for (let i = 0; i < result.length; i++) {
            result[i].rank = i + 1;
        }
        return result;
    }
    /**
     * Generate human-readable tournament report.
     */
    static generateReport(result) {
        const lines = [
            "=== Tournament Results ===",
            `Format: ${result.format}`,
            `Providers: ${result.providersCount}`,
            `Total games: ${result.totalGames}`,
            "",
            "Standings:",
            "Rank | Provider | W-L-D | Games | Win% | Points",
            "---- | -------- | ----- | ----- | ---- | ------",
        ];
        for (const standing of result.standings) {
            const record = `${standing.wins}-${standing.losses}-${standing.draws}`;
            const winPct = (standing.winRate * 100).toFixed(1);
            lines.push(`${standing.rank.toString().padEnd(4)} | ${standing.provider.padEnd(8)} | ${record.padEnd(5)} | ${standing.totalGames.toString().padEnd(5)} | ${winPct.padEnd(4)}% | ${standing.points}`);
        }
        return lines.join("\n");
    }
}
//# sourceMappingURL=tournament-engine.js.map