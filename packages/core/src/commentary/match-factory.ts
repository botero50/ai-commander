import { Logger } from '../config/logger.js';
import { ZeroADAdapter } from '../adapter.js';
import { Match } from './match.js';
import { MatchConfig } from './match-config.js';

export class MatchFactory {
  private adapter: ZeroADAdapter;
  private logger: Logger;
  private activeMatches: Map<string, Match> = new Map();

  constructor(adapter: ZeroADAdapter, logger: Logger) {
    this.adapter = adapter;
    this.logger = logger;
  }

  createMatch(config: MatchConfig): Match {
    const match = new Match(this.adapter, config, this.logger);
    this.activeMatches.set(match.matchId, match);

    this.logger.debug('Match created via factory', {
      matchId: match.matchId,
    });

    return match;
  }

  async startMatch(match: Match): Promise<void> {
    try {
      await match.start();
    } catch (err) {
      this.activeMatches.delete(match.matchId);
      throw err;
    }
  }

  async stopMatch(matchId: string): Promise<void> {
    const match = this.activeMatches.get(matchId);
    if (!match) {
      throw new Error(`Match ${matchId} not found`);
    }

    await match.stop();
    this.activeMatches.delete(matchId);

    this.logger.info('Match stopped and removed', { matchId });
  }

  getMatch(matchId: string): Match | undefined {
    return this.activeMatches.get(matchId);
  }

  getAllMatches(): Match[] {
    return Array.from(this.activeMatches.values());
  }

  getActiveMatches(): Match[] {
    return Array.from(this.activeMatches.values()).filter((m) => m.isActive());
  }

  clearInactiveMatches(): number {
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
