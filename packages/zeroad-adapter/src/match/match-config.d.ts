export interface MatchConfig {
    mapName?: string;
    mapPath?: string;
    numberOfPlayers?: number;
    playerIds?: number[];
    aiDifficulty?: 'easy' | 'medium' | 'hard';
    gameSpeed?: number;
    turnDurationMs?: number;
    maxTurns?: number;
    autoStartGame?: boolean;
}
export interface MatchMetadata {
    matchId: string;
    createdAt: number;
    startedAt?: number;
    endedAt?: number;
    config: MatchConfig;
    status: 'created' | 'started' | 'paused' | 'ended';
}
//# sourceMappingURL=match-config.d.ts.map