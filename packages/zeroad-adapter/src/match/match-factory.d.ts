import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import { Match } from './match.js';
import { MatchConfig } from './match-config.js';
export declare class MatchFactory {
    private adapter;
    private logger;
    private activeMatches;
    constructor(adapter: ZeroADAdapter, logger: Logger);
    createMatch(config: MatchConfig): Match;
    startMatch(match: Match): Promise<void>;
    stopMatch(matchId: string): Promise<void>;
    getMatch(matchId: string): Match | undefined;
    getAllMatches(): Match[];
    getActiveMatches(): Match[];
    clearInactiveMatches(): number;
}
//# sourceMappingURL=match-factory.d.ts.map