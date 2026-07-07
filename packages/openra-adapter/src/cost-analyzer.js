/**
 * Cost Analyzer — Track real API costs per provider
 *
 * Features:
 * 1. Per-provider pricing models
 * 2. Token counting and cost calculation
 * 3. Cost aggregation per match/tournament
 * 4. ROI analysis (cost vs win rate)
 */
/**
 * Current pricing (as of 2024)
 */
const PRICING_MODELS = new Map([
    [
        "claude",
        {
            provider: "claude",
            costPerInputToken: 3 / 1000000, // $3 per 1M input tokens (Claude 3 Opus)
            costPerOutputToken: 15 / 1000000, // $15 per 1M output tokens
            currencyUnit: "USD",
        },
    ],
    [
        "openai",
        {
            provider: "openai",
            costPerInputToken: 10 / 1000000, // $10 per 1M input tokens (GPT-4)
            costPerOutputToken: 30 / 1000000, // $30 per 1M output tokens
            currencyUnit: "USD",
        },
    ],
    [
        "gemini",
        {
            provider: "gemini",
            costPerInputToken: 0.5 / 1000000, // $0.50 per 1M input tokens (Gemini Pro)
            costPerOutputToken: 1.5 / 1000000, // $1.50 per 1M output tokens
            currencyUnit: "USD",
        },
    ],
    [
        "ollama",
        {
            provider: "ollama",
            costPerInputToken: 0, // Local, free
            costPerOutputToken: 0,
            currencyUnit: "USD",
        },
    ],
    [
        "builtin",
        {
            provider: "builtin",
            costPerInputToken: 0, // Built-in, free
            costPerOutputToken: 0,
            currencyUnit: "USD",
        },
    ],
]);
/**
 * CostAnalyzer: Calculate costs for providers
 */
export class CostAnalyzer {
    /**
     * Get pricing for a provider.
     */
    static getPricing(provider) {
        return PRICING_MODELS.get(provider) || PRICING_MODELS.get("builtin");
    }
    /**
     * Calculate cost from token counts.
     */
    static calculateCost(provider, inputTokens, outputTokens) {
        const pricing = this.getPricing(provider);
        const inputCost = inputTokens * pricing.costPerInputToken;
        const outputCost = outputTokens * pricing.costPerOutputToken;
        return inputCost + outputCost;
    }
    /**
     * Analyze costs for a single provider match usage.
     */
    static analyzeSingleMatch(provider, inputTokens, outputTokens) {
        const totalTokens = inputTokens + outputTokens;
        const tokenCost = this.calculateCost(provider, inputTokens, outputTokens);
        return {
            provider,
            tokenCost,
            totalCost: tokenCost,
            costPerMatch: tokenCost,
            costPerToken: totalTokens > 0 ? tokenCost / totalTokens : 0,
        };
    }
    /**
     * Analyze costs for a tournament.
     */
    static analyzeTournament(matchCosts) {
        const providers = new Map();
        let totalCost = 0;
        let totalMatches = 0;
        let totalGames = 0;
        for (const [, cost] of matchCosts) {
            providers.set(cost.provider, cost);
            totalCost += cost.totalCost;
            totalMatches += 1;
            totalGames += 1; // Simplified: 1 game per match
        }
        const sorted = Array.from(providers.values()).sort((a, b) => b.totalCost - a.totalCost);
        return {
            providers,
            totalCost,
            costPerMatch: totalMatches > 0 ? totalCost / totalMatches : 0,
            costPerGame: totalGames > 0 ? totalCost / totalGames : 0,
            averageCostPerProvider: providers.size > 0 ? totalCost / providers.size : 0,
            mostExpensive: sorted[0]?.provider || "unknown",
            mostCheap: sorted[sorted.length - 1]?.provider || "unknown",
        };
    }
    /**
     * Calculate cost vs win rate (ROI).
     */
    static calculateROI(provider, cost, wins, totalGames) {
        const winRate = totalGames > 0 ? wins / totalGames : 0;
        const costPerWin = wins > 0 ? cost / wins : Infinity;
        return {
            cost,
            winRate,
            costPerWin,
        };
    }
    /**
     * Generate human-readable cost report.
     */
    static generateReport(analysis) {
        const lines = [
            "=== Tournament Cost Analysis ===",
            "",
            "Provider Costs:",
            "Provider | Token Cost | Total Cost | Cost/Match",
            "-------- | ---------- | ---------- | ----------",
        ];
        const sorted = Array.from(analysis.providers.values()).sort((a, b) => b.totalCost - a.totalCost);
        for (const cost of sorted) {
            lines.push(`${cost.provider.padEnd(8)} | $${cost.tokenCost.toFixed(4).padEnd(10)} | $${cost.totalCost.toFixed(4).padEnd(10)} | $${cost.costPerMatch.toFixed(4)}`);
        }
        lines.push("");
        lines.push(`Total tournament cost: $${analysis.totalCost.toFixed(2)}`);
        lines.push(`Average cost per match: $${analysis.costPerMatch.toFixed(2)}`);
        lines.push(`Most expensive: ${analysis.mostExpensive}`);
        lines.push(`Most cheap: ${analysis.mostCheap}`);
        return lines.join("\n");
    }
    /**
     * Generate pricing reference.
     */
    static getPricingReference() {
        const lines = [
            "=== Provider Pricing ===",
            "(As of 2024)",
            "",
            "Provider | Input Token Cost | Output Token Cost | Notes",
            "-------- | --------------- | --------------- | -----",
        ];
        const providers = ["claude", "openai", "gemini", "ollama", "builtin"];
        for (const provider of providers) {
            const pricing = this.getPricing(provider);
            const inputStr = pricing.costPerInputToken === 0
                ? "Free"
                : `$${(pricing.costPerInputToken * 1000000).toFixed(0)}/1M`;
            const outputStr = pricing.costPerOutputToken === 0
                ? "Free"
                : `$${(pricing.costPerOutputToken * 1000000).toFixed(0)}/1M`;
            let notes = "";
            if (provider === "claude")
                notes = "Anthropic Claude 3 Opus";
            if (provider === "openai")
                notes = "OpenAI GPT-4";
            if (provider === "gemini")
                notes = "Google Gemini Pro";
            if (provider === "ollama")
                notes = "Local Ollama (free)";
            if (provider === "builtin")
                notes = "Built-in (free)";
            lines.push(`${provider.padEnd(8)} | ${inputStr.padEnd(15)} | ${outputStr.padEnd(15)} | ${notes}`);
        }
        return lines.join("\n");
    }
}
//# sourceMappingURL=cost-analyzer.js.map