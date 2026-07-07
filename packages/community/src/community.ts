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

export class CommunityRegistry {
  private models: Map<string, SharedModel> = new Map();
  private tournaments: Map<string, SharedTournament> = new Map();
  private replays: Map<string, SharedReplay> = new Map();

  publishModel(model: SharedModel): void {
    this.models.set(model.id, { ...model, createdAt: Date.now() });
  }

  getModel(id: string): SharedModel | undefined {
    return this.models.get(id);
  }

  listModels(): SharedModel[] {
    return Array.from(this.models.values()).sort((a, b) => b.winRate - a.winRate);
  }

  publishTournament(tournament: SharedTournament): void {
    this.tournaments.set(tournament.id, { ...tournament, createdAt: Date.now() });
  }

  getTournament(id: string): SharedTournament | undefined {
    return this.tournaments.get(id);
  }

  publishReplay(replay: SharedReplay): void {
    this.replays.set(replay.id, { ...replay, createdAt: Date.now() });
  }

  getReplay(id: string): SharedReplay | undefined {
    const replay = this.replays.get(id);
    if (replay) {
      const updated = { ...replay, views: replay.views + 1 };
      this.replays.set(id, updated);
      return updated;
    }
    return replay;
  }

  listTopReplays(limit = 10): SharedReplay[] {
    return Array.from(this.replays.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }
}
