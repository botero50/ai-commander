/**
 * Story 57.2 — Match Introduction
 *
 * Displays broadcast introduction sequence before match starts.
 *
 * Sequence:
 * 1. Show map name (2 seconds)
 * 2. Show civilizations & players (2 seconds)
 * 3. Countdown: 3... 2... 1... (3 seconds)
 * 4. "Battle Begins!" (1 second)
 * 5. Transition to live match
 *
 * Total: ~8 seconds from match start to live gameplay
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface MatchInfo {
  matchId: string;
  map: string;
  players: Array<{
    id: number;
    name: string;
    civilization: string;
  }>;
}

export interface IntroductionEvent {
  type: 'map-reveal' | 'players-reveal' | 'countdown' | 'battle-begins' | 'intro-complete';
  timestamp: string;
  data: Record<string, any>;
}

export class MatchIntroduction extends EventEmitter {
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'MatchIntroduction');
  }

  /**
   * Run the introduction sequence
   */
  async runIntroduction(matchInfo: MatchInfo): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Introduction already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting match introduction', { matchId: matchInfo.matchId });

    try {
      // Phase 1: Map Reveal (2 seconds)
      await this.mapReveal(matchInfo);

      // Phase 2: Players Reveal (2 seconds)
      await this.playersReveal(matchInfo);

      // Phase 3: Countdown (3 seconds: 3, 2, 1)
      await this.countdown();

      // Phase 4: Battle Begins (1 second)
      await this.battleBegins();

      // Complete
      this.emit('introduction', {
        type: 'intro-complete',
        timestamp: new Date().toISOString(),
        data: { matchId: matchInfo.matchId },
      } as IntroductionEvent);

      this.logger.info('Match introduction completed', { matchId: matchInfo.matchId });
    } catch (error) {
      this.logger.error('Introduction error', { error });
      this.emit('error', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Phase 1: Reveal the map
   */
  private async mapReveal(matchInfo: MatchInfo): Promise<void> {
    const event: IntroductionEvent = {
      type: 'map-reveal',
      timestamp: new Date().toISOString(),
      data: {
        matchId: matchInfo.matchId,
        map: matchInfo.map,
        mapDisplay: this.formatMapName(matchInfo.map),
      },
    };

    this.emit('introduction', event);
    this.logger.debug('Map revealed', { map: matchInfo.map });

    await this.delay(2000); // 2 seconds
  }

  /**
   * Phase 2: Reveal players and civilizations
   */
  private async playersReveal(matchInfo: MatchInfo): Promise<void> {
    const event: IntroductionEvent = {
      type: 'players-reveal',
      timestamp: new Date().toISOString(),
      data: {
        matchId: matchInfo.matchId,
        players: matchInfo.players.map((p) => ({
          id: p.id,
          name: p.name,
          civilization: this.formatCivilizationName(p.civilization),
        })),
      },
    };

    this.emit('introduction', event);
    this.logger.debug('Players revealed', { playerCount: matchInfo.players.length });

    await this.delay(2000); // 2 seconds
  }

  /**
   * Phase 3: Countdown 3, 2, 1
   */
  private async countdown(): Promise<void> {
    for (let i = 3; i >= 1; i--) {
      const event: IntroductionEvent = {
        type: 'countdown',
        timestamp: new Date().toISOString(),
        data: { count: i },
      };

      this.emit('introduction', event);
      this.logger.debug(`Countdown: ${i}`);

      await this.delay(1000); // 1 second per count
    }
  }

  /**
   * Phase 4: Battle Begins
   */
  private async battleBegins(): Promise<void> {
    const event: IntroductionEvent = {
      type: 'battle-begins',
      timestamp: new Date().toISOString(),
      data: { message: 'Battle Begins!' },
    };

    this.emit('introduction', event);
    this.logger.info('Battle begins');

    await this.delay(1000); // 1 second
  }

  /**
   * Subscribe to introduction events
   */
  onIntroduction(callback: (event: IntroductionEvent) => void): void {
    this.on('introduction', callback);
  }

  /**
   * Format map name for display (e.g., setons_2p → Setons 2 Player)
   */
  private formatMapName(map: string): string {
    return map
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Format civilization name for display (e.g., carthaginians → Carthaginians)
   */
  private formatCivilizationName(civ: string): string {
    return civ.charAt(0).toUpperCase() + civ.slice(1);
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get total introduction duration in seconds
   */
  getTotalDuration(): number {
    return 8; // 2 + 2 + 3 + 1 = 8 seconds
  }

  /**
   * Export introduction as JSON (for testing)
   */
  toJSON(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      totalDuration: this.getTotalDuration(),
    };
  }
}

/**
 * Factory function
 */
export function createMatchIntroduction(logger?: Logger): MatchIntroduction {
  return new MatchIntroduction(logger);
}
