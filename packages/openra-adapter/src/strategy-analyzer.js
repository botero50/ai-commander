/**
 * Strategy Analyzer — Compare strategies across providers
 *
 * Analyze gameplay styles:
 * 1. Aggressive: early unit production, military focus
 * 2. Economic: harvester production, resource focus
 * 3. Defensive: base protection, minimal expansion
 * 4. Balanced: mix of all three
 */
/**
 * StrategyAnalyzer: Determine and compare provider strategies
 */
export class StrategyAnalyzer {
    /**
     * Analyze strategy from a match result.
     */
    static analyzeFromMatch(result, playerStats) {
        // Normalize metrics (assuming 500 tick match)
        const unitsPerTick = playerStats.unitsProduced / Math.max(1, result.totalTicks);
        const resourcesPerTick = playerStats.resourcesGathered / Math.max(1, result.totalTicks);
        const buildingsPerTick = playerStats.buildingsConstructed / Math.max(1, result.totalTicks);
        // Calculate strategy dimensions (0-100 scale)
        const aggressiveness = Math.min(100, unitsPerTick * 50); // ~50 units/500 ticks = 50 points
        const economyFocus = Math.min(100, (resourcesPerTick * buildingsPerTick) * 10); // Multi-factor
        const defensiveness = Math.min(100, 100 - Math.min(100, (result.totalTicks - 100) / 4)); // Later game = less defensive
        // Determine primary strategy
        const scores = { aggressiveness, economyFocus, defensiveness };
        const primary = Object.entries(scores).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
        const isBalanced = Math.max(...Object.values(scores)) - Math.min(...Object.values(scores)) < 20;
        const strategy = isBalanced
            ? "balanced"
            : primary === "aggressiveness"
                ? "aggressive"
                : primary === "economyFocus"
                    ? "economic"
                    : "defensive";
        const maxScore = Math.max(...Object.values(scores));
        return {
            strategy,
            score: maxScore,
            confidence: maxScore / 100,
            aggressiveness,
            economyFocus,
            defensiveness,
        };
    }
    /**
     * Analyze strategy from multi-match results.
     */
    static analyzeProviderStrategy(provider, results, wins, losses) {
        const stats = results.stats;
        // Use averages for strategy
        const mockResult = {
            winner: wins > losses ? "player1" : "player2",
            totalTicks: stats.avgTicks,
            duration: stats.avgDurationMs,
            player1Stats: {
                resourcesGathered: stats.avgResources1,
                unitsProduced: stats.avgUnits1,
                buildingsConstructed: stats.avgBuildings1,
            },
            player2Stats: {
                resourcesGathered: stats.avgResources2,
                unitsProduced: stats.avgUnits2,
                buildingsConstructed: stats.avgBuildings2,
            },
            validations: {
                workerCycleValid: true,
                economyScaling: "working",
                militaryEngagement: true,
            },
        };
        const playerStats = {
            resourcesGathered: stats.avgResources1,
            unitsProduced: stats.avgUnits1,
            buildingsConstructed: stats.avgBuildings1,
        };
        const strategy = this.analyzeFromMatch(mockResult, playerStats);
        return {
            provider,
            strategy,
            wins,
            losses,
            avgResources: stats.avgResources1,
            avgUnits: stats.avgUnits1,
            avgBuildings: stats.avgBuildings1,
        };
    }
    /**
     * Compare strategies of two providers.
     */
    static compareStrategies(provider1, provider2) {
        const advantages = new Map();
        const p1 = provider1.strategy;
        const p2 = provider2.strategy;
        // Aggressive vs other strategies
        if (p1.aggressiveness > p2.aggressiveness + 10) {
            advantages.set(provider1.provider, [
                ...(advantages.get(provider1.provider) || []),
                "More aggressive (unit production)",
            ]);
        }
        if (p2.aggressiveness > p1.aggressiveness + 10) {
            advantages.set(provider2.provider, [
                ...(advantages.get(provider2.provider) || []),
                "More aggressive (unit production)",
            ]);
        }
        // Economic vs other
        if (p1.economyFocus > p2.economyFocus + 10) {
            advantages.set(provider1.provider, [
                ...(advantages.get(provider1.provider) || []),
                "Better economy (resource gathering)",
            ]);
        }
        if (p2.economyFocus > p1.economyFocus + 10) {
            advantages.set(provider2.provider, [
                ...(advantages.get(provider2.provider) || []),
                "Better economy (resource gathering)",
            ]);
        }
        // Defensive vs other
        if (p1.defensiveness > p2.defensiveness + 10) {
            advantages.set(provider1.provider, [
                ...(advantages.get(provider1.provider) || []),
                "More defensive (base protection)",
            ]);
        }
        if (p2.defensiveness > p1.defensiveness + 10) {
            advantages.set(provider2.provider, [
                ...(advantages.get(provider2.provider) || []),
                "More defensive (base protection)",
            ]);
        }
        const description = `${provider1.provider} (${p1.strategy}): Focus on ${p1.strategy}
${provider2.provider} (${p2.strategy}): Focus on ${p2.strategy}`;
        return { description, advantages };
    }
    /**
     * Generate human-readable strategy report.
     */
    static generateReport(strategies) {
        const lines = [
            "=== Strategy Analysis ===",
            "",
            "Provider Strategies:",
            "Provider | Strategy | Score | Aggressive | Economy | Defensive | W-L",
            "-------- | -------- | ----- | ---------- | ------- | --------- | ---",
        ];
        for (const ps of strategies) {
            const s = ps.strategy;
            lines.push(`${ps.provider.padEnd(8)} | ${s.strategy.padEnd(8)} | ${s.score.toFixed(0).padEnd(5)} | ${s.aggressiveness.toFixed(0).padEnd(10)} | ${s.economyFocus.toFixed(0).padEnd(7)} | ${s.defensiveness.toFixed(0).padEnd(9)} | ${ps.wins}-${ps.losses}`);
        }
        lines.push("");
        lines.push("Interpretation:");
        lines.push("- Aggressive: Early unit production, combat focus");
        lines.push("- Economic: Harvester/refinery focus, resource gathering");
        lines.push("- Defensive: Base protection, minimal early expansion");
        lines.push("- Balanced: Mix of all three approaches");
        return lines.join("\n");
    }
}
//# sourceMappingURL=strategy-analyzer.js.map