/**
 * Tournament Runner
 *
 * Execute multiple matches between AI brains and collect results.
 * - Round-robin tournaments
 * - Match scheduling
 * - Result collection and ranking
 * - Statistics aggregation
 */
/**
 * Simple UUID generator (v4-like)
 */
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random().toString(36).substr(2, 9)}`;
}
/**
 * Tournament runner for executing multiple matches
 */
export class TournamentRunner {
    tournamentId;
    config;
    matches = [];
    startTime = 0;
    endTime = 0;
    constructor(config) {
        this.tournamentId = generateId();
        this.config = config;
    }
    /**
     * Get tournament ID
     */
    getTournamentId() {
        return this.tournamentId;
    }
    /**
     * Generate match pairs for round-robin tournament
     */
    generateRoundRobinMatches() {
        const matches = [];
        const brains = [...this.config.brains];
        for (let i = 0; i < brains.length; i++) {
            for (let j = i + 1; j < brains.length; j++) {
                matches.push([brains[i], brains[j]]);
            }
        }
        return matches;
    }
    /**
     * Record a match result
     */
    recordMatch(result) {
        this.matches.push(result);
    }
    /**
     * Calculate brain statistics
     */
    calculateStats() {
        const stats = new Map();
        // Initialize stats for each brain
        for (const brain of this.config.brains) {
            stats.set(brain.id, {
                brainId: brain.id,
                name: brain.name,
                wins: 0,
                losses: 0,
                draws: 0,
                totalMatches: 0,
                totalCommands: 0,
                totalErrors: 0,
            });
        }
        // Process each match
        for (const match of this.matches) {
            const brain1Stats = stats.get(match.brain1Id);
            const brain2Stats = stats.get(match.brain2Id);
            if (!brain1Stats || !brain2Stats)
                continue;
            // Update match counts
            brain1Stats.totalMatches++;
            brain2Stats.totalMatches++;
            // Update wins/losses
            if (match.winner === match.brain1Id) {
                brain1Stats.wins++;
                brain2Stats.losses++;
            }
            else if (match.winner === match.brain2Id) {
                brain2Stats.wins++;
                brain1Stats.losses++;
            }
            else {
                brain1Stats.draws++;
                brain2Stats.draws++;
            }
            // Update commands and errors
            brain1Stats.totalCommands += match.player1Commands;
            brain1Stats.totalErrors += match.player1Errors;
            brain2Stats.totalCommands += match.player2Commands;
            brain2Stats.totalErrors += match.player2Errors;
        }
        // Calculate derived statistics
        const results = [];
        for (const [, stat] of stats) {
            const winRate = stat.totalMatches > 0 ? stat.wins / stat.totalMatches : 0;
            const avgCommands = stat.totalMatches > 0 ? stat.totalCommands / stat.totalMatches : 0;
            const errorRate = stat.totalCommands > 0 ? (stat.totalErrors / stat.totalCommands) * 100 : 0;
            results.push({
                brainId: stat.brainId,
                name: stat.name,
                wins: stat.wins,
                losses: stat.losses,
                draws: stat.draws,
                totalMatches: stat.totalMatches,
                winRate: Math.round(winRate * 10000) / 100, // percentage with 2 decimals
                totalCommands: stat.totalCommands,
                totalErrors: stat.totalErrors,
                averageCommandsPerMatch: Math.round(avgCommands * 100) / 100,
                averageErrorRate: Math.round(errorRate * 100) / 100,
            });
        }
        // Sort by wins descending, then by win rate
        results.sort((a, b) => {
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            return b.winRate - a.winRate;
        });
        return results;
    }
    /**
     * Get tournament results
     */
    getResults() {
        const rankings = this.calculateStats();
        return {
            tournamentId: this.tournamentId,
            name: this.config.name,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.endTime - this.startTime,
            totalMatches: this.getExpectedMatchCount(),
            completedMatches: this.matches.length,
            matches: [...this.matches],
            rankings,
        };
    }
    /**
     * Get expected match count based on tournament format
     */
    getExpectedMatchCount() {
        const n = this.config.brains.length;
        if (this.config.matchFormat === 'round_robin') {
            // Round-robin: n*(n-1)/2 matches
            return (n * (n - 1)) / 2;
        }
        else {
            // Single elimination: n-1 matches
            return n - 1;
        }
    }
    /**
     * Start tournament
     */
    start() {
        this.startTime = Date.now();
        this.matches = [];
    }
    /**
     * End tournament
     */
    end() {
        this.endTime = Date.now();
    }
    /**
     * Get progress
     */
    getProgress() {
        const total = this.getExpectedMatchCount();
        const completed = this.matches.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { completed, total, percentage };
    }
    /**
     * Get match history
     */
    getMatches() {
        return [...this.matches];
    }
    /**
     * Get brain by ID
     */
    getBrain(brainId) {
        return this.config.brains.find((b) => b.id === brainId);
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=tournament-runner.js.map