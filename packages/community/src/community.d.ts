export interface SharedModel {
    readonly id: string;
    readonly name: string;
    readonly author: string;
    readonly config: Record<string, unknown>;
    readonly winRate: number;
    readonly downloads: number;
    readonly description: string;
    readonly createdAt: number;
}
export interface SharedTournament {
    readonly id: string;
    readonly name: string;
    readonly author: string;
    readonly format: string;
    readonly brains: string[];
    readonly results: Record<string, unknown>;
    readonly createdAt: number;
}
export interface SharedReplay {
    readonly id: string;
    readonly matchId: string;
    readonly redBrain: string;
    readonly blueBrain: string;
    readonly winner: string;
    readonly views: number;
    readonly createdAt: number;
}
export declare class CommunityRegistry {
    private models;
    private tournaments;
    private replays;
    publishModel(model: SharedModel): void;
    getModel(id: string): SharedModel | undefined;
    listModels(): SharedModel[];
    publishTournament(tournament: SharedTournament): void;
    getTournament(id: string): SharedTournament | undefined;
    publishReplay(replay: SharedReplay): void;
    getReplay(id: string): SharedReplay | undefined;
    listTopReplays(limit?: number): SharedReplay[];
}
//# sourceMappingURL=community.d.ts.map