"use strict";
/**
 * Trend Analyzer
 *
 * Analyzes trends and comparative metrics across snapshots.
 * Detects growth, decline, and stability patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendAnalyzer = void 0;
class TrendAnalyzer {
    /**
     * Calculate trend description for a value
     */
    getTrendDescription(start, end, label) {
        if (end > start)
            return `${label}: GROWING (${start} → ${end})`;
        if (end < start)
            return `${label}: DECLINING (${start} → ${end})`;
        return `${label}: STABLE`;
    }
    /**
     * Calculate trend direction (growing/declining/stable)
     */
    getTrendDirection(start, end) {
        if (end > start)
            return 'growing';
        if (end < start)
            return 'declining';
        return 'stable';
    }
    /**
     * Analyze trends for all players from snapshots
     */
    analyzeTrends(playerStats) {
        const trends = {};
        for (const [playerId, stats] of Object.entries(playerStats)) {
            const id = parseInt(playerId);
            if (stats.length < 2) {
                trends[id] = { economy: 'stable', military: 'stable', tech: 'stable' };
                continue;
            }
            const first = stats[0];
            const last = stats[stats.length - 1];
            trends[id] = {
                economy: this.getTrendDirection(first.economy.economyScore, last.economy.economyScore),
                military: this.getTrendDirection(first.military.militaryScore, last.military.militaryScore),
                tech: this.getTrendDirection(first.tech.techsUnlocked, last.tech.techsUnlocked),
            };
        }
        return trends;
    }
    /**
     * Calculate comparative metrics between players
     */
    calculateComparativeMetrics(playerStats) {
        const playerIds = Object.keys(playerStats).map((id) => parseInt(id));
        let economyDifference = 0;
        let militaryDifference = 0;
        let activityDifference = 0;
        if (playerIds.length === 2) {
            const [p1Snapshots, p2Snapshots] = [playerStats[playerIds[0]], playerStats[playerIds[1]]];
            if (p1Snapshots?.length > 0 && p2Snapshots?.length > 0) {
                const p1Last = p1Snapshots[p1Snapshots.length - 1];
                const p2Last = p2Snapshots[p2Snapshots.length - 1];
                economyDifference = p1Last.economy.economyScore - p2Last.economy.economyScore;
                militaryDifference = p1Last.military.militaryScore - p2Last.military.militaryScore;
                activityDifference = p1Last.activity.activityScore - p2Last.activity.activityScore;
            }
        }
        return {
            economyDifference: Math.round(economyDifference * 10) / 10,
            militaryDifference: Math.round(militaryDifference * 10) / 10,
            activityDifference: Math.round(activityDifference * 10) / 10,
        };
    }
    /**
     * Generate trend report for a player
     */
    generateTrendReport(stats) {
        if (stats.length < 2)
            return 'Insufficient data for trend analysis';
        const first = stats[0];
        const last = stats[stats.length - 1];
        const economyTrend = this.getTrendDescription(first.economy.economyScore, last.economy.economyScore, 'economy');
        const militaryTrend = this.getTrendDescription(first.military.militaryScore, last.military.militaryScore, 'military');
        const techTrend = this.getTrendDescription(first.tech.techsUnlocked, last.tech.techsUnlocked, 'tech progression');
        return `${economyTrend}. ${militaryTrend}. ${techTrend}`;
    }
}
exports.TrendAnalyzer = TrendAnalyzer;
//# sourceMappingURL=trend-analyzer.js.map