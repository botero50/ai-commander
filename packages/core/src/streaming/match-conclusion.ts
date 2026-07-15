/**
 * Story 57.3 — Match Conclusion
 *
 * Displays victory screen after match ends.
 * Shows: winner, duration, statistics, reason.
 * Duration: 5 seconds, then auto-trigger next match.
 *
 * Flow:
 * 1. Show winner name (immediate)
 * 2. Show match duration
 * 3. Show final statistics
 * 4. Show reason for victory
 * 5. 5 second display
 * 6. Emit "next-match-loading" event
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface VictoryStats {
  winner: {
    id: number;
    name: string;
  };
  loser?: {
    id: number;
    name: string;
  };
  duration: number; // seconds
  statistics: {
    totalCommands: number;
    militaryValue: number;
    economyScore: number;
    finalUnits: number;
    finalBuildings: number;
  };
  reason: string; // e.g., "Military Dominance", "Economic Collapse"
}

export interface ConclusionEvent {
  type: 'victory-show' | 'stats-display' | 'next-match-loading' | 'conclusion-complete';
  timestamp: string;
  data: Record<string, any>;
}

export class MatchConclusion extends EventEmitter {
  private logger: Logger;
  private isRunning: boolean = false;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'MatchConclusion');
  }

  /**
   * Run the conclusion sequence
   */
  async runConclusion(stats: VictoryStats): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Conclusion already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting match conclusion', {
      winner: stats.winner.name,
      duration: stats.duration,
    });

    try {
      // Phase 1: Show victory (immediate)
      await this.showVictory(stats);

      // Phase 2: Show statistics (display for 3 seconds)
      await this.showStatistics(stats);

      // Phase 3: Show reason (display for 2 seconds)
      await this.showReason(stats);

      // Phase 4: Next match loading (auto-trigger)
      await this.nextMatchLoading();

      // Complete
      this.emit('conclusion', {
        type: 'conclusion-complete',
        timestamp: new Date().toISOString(),
        data: { winner: stats.winner.name },
      } as ConclusionEvent);

      this.logger.info('Match conclusion completed');
    } catch (error) {
      this.logger.error('Conclusion error', { error });
      this.emit('error', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Phase 1: Show winner
   */
  private async showVictory(stats: VictoryStats): Promise<void> {
    const event: ConclusionEvent = {
      type: 'victory-show',
      timestamp: new Date().toISOString(),
      data: {
        winner: stats.winner,
        loser: stats.loser,
        duration: this.formatDuration(stats.duration),
        durationSeconds: stats.duration,
      },
    };

    this.emit('conclusion', event);
    this.logger.debug('Victory shown', { winner: stats.winner.name });

    await this.delay(1000); // 1 second
  }

  /**
   * Phase 2: Show statistics
   */
  private async showStatistics(stats: VictoryStats): Promise<void> {
    const event: ConclusionEvent = {
      type: 'stats-display',
      timestamp: new Date().toISOString(),
      data: {
        winner: stats.winner.name,
        statistics: {
          totalCommands: stats.statistics.totalCommands,
          militaryValue: stats.statistics.militaryValue,
          economyScore: stats.statistics.economyScore,
          finalUnits: stats.statistics.finalUnits,
          finalBuildings: stats.statistics.finalBuildings,
        },
        highlights: this.generateHighlights(stats.statistics),
      },
    };

    this.emit('conclusion', event);
    this.logger.debug('Statistics displayed');

    await this.delay(3000); // 3 seconds
  }

  /**
   * Phase 3: Show reason for victory
   */
  private async showReason(stats: VictoryStats): Promise<void> {
    const event: ConclusionEvent = {
      type: 'stats-display',
      timestamp: new Date().toISOString(),
      data: {
        reason: stats.reason,
        reasonExplanation: this.explainReason(stats),
      },
    };

    this.emit('conclusion', event);
    this.logger.debug('Reason shown', { reason: stats.reason });

    await this.delay(2000); // 2 seconds
  }

  /**
   * Phase 4: Next match loading
   */
  private async nextMatchLoading(): Promise<void> {
    const event: ConclusionEvent = {
      type: 'next-match-loading',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Preparing Next Match...',
      },
    };

    this.emit('conclusion', event);
    this.logger.info('Next match auto-triggered');
  }

  /**
   * Subscribe to conclusion events
   */
  onConclusion(callback: (event: ConclusionEvent) => void): void {
    this.on('conclusion', callback);
  }

  /**
   * Format duration as MM:SS
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Generate highlight statistics
   */
  private generateHighlights(stats: any): string[] {
    const highlights: string[] = [];

    if (stats.totalCommands > 500) {
      highlights.push('Excellent Command Control');
    }

    if (stats.militaryValue > 200) {
      highlights.push('Dominant Military Force');
    }

    if (stats.economyScore > 150) {
      highlights.push('Efficient Economy');
    }

    if (stats.finalUnits > 50) {
      highlights.push('Large Army');
    }

    if (stats.finalBuildings > 20) {
      highlights.push('Extensive Infrastructure');
    }

    return highlights.length > 0 ? highlights : ['Victory Achieved'];
  }

  /**
   * Explain reason for victory
   */
  private explainReason(stats: VictoryStats): string {
    const reason = stats.reason;

    const explanations: Record<string, string> = {
      'Military Dominance': 'Superior military force overwhelmed opponent',
      'Economic Collapse': 'Opponent ran out of resources',
      'Territory Control': 'Controlled most of the map',
      'Technology Advantage': 'Advanced technology won the day',
      'Command Excellence': 'Superior decision-making secured victory',
    };

    return explanations[reason] || 'Opponent defeated in combat';
  }

  /**
   * Get total conclusion duration in seconds
   */
  getTotalDuration(): number {
    return 6; // 1 + 3 + 2 = 6 seconds
  }

  /**
   * Helper: delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Export as JSON (for testing)
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
export function createMatchConclusion(logger?: Logger): MatchConclusion {
  return new MatchConclusion(logger);
}
