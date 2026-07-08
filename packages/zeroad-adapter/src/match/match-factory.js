import { Match } from './match.js';
export class MatchFactory {
    adapter;
    logger;
    activeMatches = new Map();
    constructor(adapter, logger) {
        this.adapter = adapter;
        this.logger = logger;
    }
    createMatch(config) {
        const match = new Match(this.adapter, config, this.logger);
        this.activeMatches.set(match.matchId, match);
        this.logger.debug('Match created via factory', {
            matchId: match.matchId,
        });
        return match;
    }
    async startMatch(match) {
        try {
            await match.start();
        }
        catch (err) {
            this.activeMatches.delete(match.matchId);
            throw err;
        }
    }
    async stopMatch(matchId) {
        const match = this.activeMatches.get(matchId);
        if (!match) {
            throw new Error(`Match ${matchId} not found`);
        }
        await match.stop();
        this.activeMatches.delete(matchId);
        this.logger.info('Match stopped and removed', { matchId });
    }
    getMatch(matchId) {
        return this.activeMatches.get(matchId);
    }
    getAllMatches() {
        return Array.from(this.activeMatches.values());
    }
    getActiveMatches() {
        return Array.from(this.activeMatches.values()).filter((m) => m.isActive());
    }
    clearInactiveMatches() {
        const inactiveBefore = this.activeMatches.size;
        const inactiveMatches = Array.from(this.activeMatches.values()).filter((m) => !m.isActive());
        for (const match of inactiveMatches) {
            this.activeMatches.delete(match.matchId);
        }
        const removed = inactiveBefore - this.activeMatches.size;
        this.logger.debug('Cleared inactive matches', { removed, remaining: this.activeMatches.size });
        return removed;
    }
}
//# sourceMappingURL=match-factory.js.map