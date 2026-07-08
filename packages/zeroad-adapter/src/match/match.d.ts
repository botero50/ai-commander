import { WorldState } from '@ai-commander/domain';
import { GameSession } from '@ai-commander/adapter';
import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import { MatchConfig, MatchMetadata } from './match-config.js';
export declare class Match {
    readonly matchId: string;
    private adapter;
    private session;
    private logger;
    private metadata;
    private currentTick;
    private tickHistory;
    constructor(adapter: ZeroADAdapter, config: MatchConfig, logger: Logger);
    start(): Promise<WorldState>;
    stop(): Promise<void>;
    getCurrentWorldState(): Promise<WorldState | null>;
    getMetadata(): MatchMetadata;
    getCurrentTick(): number;
    getTickHistory(): number[];
    getWorldStateAt(tick: number): WorldState | undefined;
    isActive(): boolean;
    getSession(): GameSession | null;
}
//# sourceMappingURL=match.d.ts.map