/**
 * ELO Rating System
 *
 * Competitive rating system for AI brains based on match results.
 * - Calculates rating changes from match outcomes
 * - Handles draws and upsets
 * - Maintains rating history
 */
/**
 * ELO rating manager
 */
export class EloRating {
    ratings;
    config;
    ratingChanges = [];
    initialRating;
    kFactor;
    maxRatingHistory;
    constructor(brainIds, config = {}) {
        this.config = config;
        this.initialRating = config.initialRating ?? 1600;
        this.kFactor = config.kFactor ?? 32;
        this.maxRatingHistory = config.maxRatingHistory ?? 100;
        this.ratings = new Map();
        for (const brainId of brainIds) {
            this.ratings.set(brainId, {
                brainId,
                rating: this.initialRating,
                ratingHistory: [this.initialRating],
            });
        }
    }
    /**
     * Calculate expected score for a player
     * Formula: 1 / (1 + 10^((opponentRating - playerRating) / 400))
     */
    calculateExpectedScore(playerRating, opponentRating) {
        const exponent = (opponentRating - playerRating) / 400;
        return 1 / (1 + Math.pow(10, exponent));
    }
    /**
     * Record a match result and update ratings
     * Result: 1 = player 1 wins, 0.5 = draw, 0 = player 2 wins
     */
    recordMatch(brain1Id, brain2Id, result) {
        if (result < 0 || result > 1) {
            throw new Error('Result must be between 0 (loss) and 1 (win), 0.5 for draw');
        }
        const brain1Rating = this.ratings.get(brain1Id);
        const brain2Rating = this.ratings.get(brain2Id);
        if (!brain1Rating || !brain2Rating) {
            throw new Error('One or both brains not found in rating system');
        }
        const player1Score = result;
        const player2Score = 1 - result;
        const player1Expected = this.calculateExpectedScore(brain1Rating.rating, brain2Rating.rating);
        const player2Expected = this.calculateExpectedScore(brain2Rating.rating, brain1Rating.rating);
        // Calculate new ratings
        const player1NewRating = brain1Rating.rating + this.kFactor * (player1Score - player1Expected);
        const player2NewRating = brain2Rating.rating + this.kFactor * (player2Score - player2Expected);
        // Round to nearest integer
        const player1RatingRounded = Math.round(player1NewRating);
        const player2RatingRounded = Math.round(player2NewRating);
        const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // Record changes
        const changes = [
            {
                brainId: brain1Id,
                oldRating: brain1Rating.rating,
                newRating: player1RatingRounded,
                change: player1RatingRounded - brain1Rating.rating,
                matchId,
            },
            {
                brainId: brain2Id,
                oldRating: brain2Rating.rating,
                newRating: player2RatingRounded,
                change: player2RatingRounded - brain2Rating.rating,
                matchId,
            },
        ];
        // Update ratings
        const updatedBrain1 = {
            ...brain1Rating,
            rating: player1RatingRounded,
            ratingHistory: this.appendToHistory(brain1Rating.ratingHistory, player1RatingRounded),
        };
        const updatedBrain2 = {
            ...brain2Rating,
            rating: player2RatingRounded,
            ratingHistory: this.appendToHistory(brain2Rating.ratingHistory, player2RatingRounded),
        };
        this.ratings.set(brain1Id, updatedBrain1);
        this.ratings.set(brain2Id, updatedBrain2);
        this.ratingChanges.push(...changes);
        return changes;
    }
    /**
     * Append rating to history with max limit
     */
    appendToHistory(history, newRating) {
        const newHistory = [...history, newRating];
        if (newHistory.length > this.maxRatingHistory) {
            return newHistory.slice(-this.maxRatingHistory);
        }
        return newHistory;
    }
    /**
     * Get current rating for a brain
     */
    getRating(brainId) {
        const rating = this.ratings.get(brainId);
        return rating?.rating ?? null;
    }
    /**
     * Get all current ratings sorted by rating descending
     */
    getAllRatings() {
        const ratings = Array.from(this.ratings.values());
        ratings.sort((a, b) => b.rating - a.rating);
        return ratings;
    }
    /**
     * Get rating history for a brain
     */
    getRatingHistory(brainId) {
        const rating = this.ratings.get(brainId);
        return rating?.ratingHistory ?? null;
    }
    /**
     * Get all rating changes
     */
    getRatingChanges() {
        return [...this.ratingChanges];
    }
    /**
     * Get rating changes for a specific brain
     */
    getBrainRatingChanges(brainId) {
        return this.ratingChanges.filter((c) => c.brainId === brainId);
    }
    /**
     * Get rating gain/loss in last N matches
     */
    getRecentRatingChange(brainId, matches = 10) {
        const changes = this.getBrainRatingChanges(brainId);
        if (changes.length === 0)
            return 0;
        const recent = changes.slice(-matches);
        return recent.reduce((sum, c) => sum + c.change, 0);
    }
    /**
     * Reset all ratings to initial value
     */
    resetRatings() {
        for (const [brainId, rating] of this.ratings) {
            this.ratings.set(brainId, {
                ...rating,
                rating: this.initialRating,
                ratingHistory: [this.initialRating],
            });
        }
        this.ratingChanges = [];
    }
    /**
     * Get rating stats for a brain
     */
    getBrainStats(brainId) {
        const rating = this.ratings.get(brainId);
        if (!rating)
            return null;
        const history = rating.ratingHistory;
        const highestRating = Math.max(...history);
        const lowestRating = Math.min(...history);
        const averageRating = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
        const ratingChange = rating.rating - (history.length > 1 ? history[0] : rating.rating);
        return {
            currentRating: rating.rating,
            highestRating,
            lowestRating,
            averageRating,
            ratingChange,
        };
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=elo-rating.js.map