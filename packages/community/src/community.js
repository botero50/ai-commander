export class CommunityRegistry {
    constructor() {
        this.models = new Map();
        this.tournaments = new Map();
        this.replays = new Map();
    }
    publishModel(model) {
        this.models.set(model.id, { ...model, createdAt: Date.now() });
    }
    getModel(id) {
        return this.models.get(id);
    }
    listModels() {
        return Array.from(this.models.values()).sort((a, b) => b.winRate - a.winRate);
    }
    publishTournament(tournament) {
        this.tournaments.set(tournament.id, { ...tournament, createdAt: Date.now() });
    }
    getTournament(id) {
        return this.tournaments.get(id);
    }
    publishReplay(replay) {
        this.replays.set(replay.id, { ...replay, createdAt: Date.now() });
    }
    getReplay(id) {
        const replay = this.replays.get(id);
        if (replay) {
            replay.views += 1;
        }
        return replay;
    }
    listTopReplays(limit = 10) {
        return Array.from(this.replays.values())
            .sort((a, b) => b.views - a.views)
            .slice(0, limit);
    }
}
//# sourceMappingURL=community.js.map