/**
 * Rating Engine — Calculate ELO ratings for all providers
 *
 * Features:
 * 1. Standard ELO calculation
 * 2. Per-match rating updates
 * 3. Rating history tracking
 * 4. Confidence intervals (K-factor adjustment)
 */
/**
 * RatingEngine: Calculate ELO ratings
 *
 * Uses standard chess ELO formula:
 * - K-factor: 32 (adjusts based on match count for new players)
 * - Expected score: 1 / (1 + 10^((opponent - player) / 400))
 * - New rating: rating + K * (result - expected)
 */
export class RatingEngine {
    /**
     * Initialize ratings for providers.
     */
    static initializeRatings(providers) {
        const ratings = new Map();
        for (const provider of providers) {
            ratings.set(provider, {
                provider,
                current: this.INITIAL_RATING,
                initial: this.INITIAL_RATING,
                history: [this.INITIAL_RATING],
                matches: 0,
                confidence: 0,
            });
        }
        return ratings;
    }
    /**
     * Update ratings after a match.
     */
    static updateRatings(ratings, provider1, provider2, matchResult) {
        const updates = [];
        const r1 = ratings.get(provider1);
        const r2 = ratings.get(provider2);
        if (!r1 || !r2) {
            return updates;
        }
        const stats = matchResult.stats;
        // Determine results (win/loss/draw per provider)
        let result1;
        if (stats.provider1Wins > stats.provider2Wins) {
            result1 = "win";
        }
        else if (stats.provider1Wins < stats.provider2Wins) {
            result1 = "loss";
        }
        else {
            result1 = "draw";
        }
        const result2 = result1 === "win" ? "loss" : result1 === "loss" ? "win" : "draw";
        // Score
        const score1 = result1 === "win" ? 1 : result1 === "draw" ? 0.5 : 0;
        const score2 = result2 === "win" ? 1 : result2 === "draw" ? 0.5 : 0;
        // Expected scores
        const expected1 = this.expectedScore(r1.current, r2.current);
        const expected2 = this.expectedScore(r2.current, r1.current);
        // K-factor (higher for new players)
        const k1 = this.getKFactor(r1.matches);
        const k2 = this.getKFactor(r2.matches);
        // Update ratings
        const newRating1 = r1.current + k1 * (score1 - expected1);
        const newRating2 = r2.current + k2 * (score2 - expected2);
        // Record updates
        updates.push({
            provider: provider1,
            ratingBefore: r1.current,
            ratingAfter: newRating1,
            change: newRating1 - r1.current,
            opponent: provider2,
            result: result1,
        });
        updates.push({
            provider: provider2,
            ratingBefore: r2.current,
            ratingAfter: newRating2,
            change: newRating2 - r2.current,
            opponent: provider1,
            result: result2,
        });
        // Update ratings map
        r1.current = newRating1;
        r1.history.push(newRating1);
        r1.matches += stats.totalMatches;
        r1.confidence = Math.min(1, r1.matches / 30); // Confidence after ~30 matches
        r2.current = newRating2;
        r2.history.push(newRating2);
        r2.matches += stats.totalMatches;
        r2.confidence = Math.min(1, r2.matches / 30);
        return updates;
    }
    /**
     * Calculate expected score for a player.
     * Expected = 1 / (1 + 10^((opponent - player) / 400))
     */
    static expectedScore(playerRating, opponentRating) {
        return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
    }
    /**
     * Get K-factor (adjusts for new players).
     * Lower K for experienced players (more stable).
     * Higher K for new players (faster adaptation).
     */
    static getKFactor(matches) {
        if (matches < 10) {
            return 64; // Very new players
        }
        else if (matches < 30) {
            return 48; // Newer players
        }
        else {
            return this.K_FACTOR_BASE; // Established players
        }
    }
    /**
     * Get current ratings sorted by ELO.
     */
    static getSortedRatings(ratings) {
        return Array.from(ratings.values()).sort((a, b) => b.current - a.current);
    }
    /**
     * Generate human-readable rating report.
     */
    static generateReport(ratings) {
        const sorted = this.getSortedRatings(ratings);
        const lines = [
            "=== ELO Ratings ===",
            "Rank | Provider | Rating | Change | Matches | Confidence",
            "---- | -------- | ------ | ------ | ------- | ----------",
        ];
        for (let i = 0; i < sorted.length; i++) {
            const r = sorted[i];
            const change = r.current - r.initial;
            const changeStr = change >= 0 ? `+${change.toFixed(0)}` : `${change.toFixed(0)}`;
            const confidence = (r.confidence * 100).toFixed(0);
            lines.push(`${(i + 1).toString().padEnd(4)} | ${r.provider.padEnd(8)} | ${r.current.toFixed(0).padEnd(6)} | ${changeStr.padEnd(6)} | ${r.matches.toString().padEnd(7)} | ${confidence}%`);
        }
        return lines.join("\n");
    }
    /**
     * Generate rating history chart (simple ASCII).
     */
    static generateChart(rating) {
        const lines = [`${rating.provider} Rating History:`, ""];
        // Find min/max for scaling
        const min = Math.min(...rating.history);
        const max = Math.max(...rating.history);
        const range = max - min || 1;
        // Draw chart
        for (const r of rating.history) {
            const normalized = (r - min) / range;
            const barLength = Math.round(normalized * 40);
            const bar = "█".repeat(barLength) + "░".repeat(40 - barLength);
            lines.push(`${r.toFixed(0).padStart(4)} | ${bar}`);
        }
        return lines.join("\n");
    }
}
RatingEngine.INITIAL_RATING = 1600;
RatingEngine.K_FACTOR_BASE = 32;
//# sourceMappingURL=rating-engine.js.map