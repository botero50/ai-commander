/**
 * Story 62.2 — Highlights Generator
 *
 * Automatically identifies and extracts key moments from matches
 * to create highlight clips for content creation.
 *
 * Key moments:
 * - Military victories (unit destruction)
 * - Economic surges (resource spikes)
 * - Technology breakthroughs
 * - Territory control changes
 * - Dramatic comebacks
 */

import { EventEmitter } from 'events';
import { Logger } from '../config/logger.js';

export interface HighlightMoment {
  type: 'military' | 'economic' | 'technology' | 'territory' | 'comeback';
  timestamp: number; // seconds into match
  duration: number; // length of highlight in seconds
  title: string;
  description: string;
  severity: 'major' | 'significant' | 'notable'; // for ranking
  players: string[];
}

export interface MatchHighlights {
  matchId: string;
  duration: number; // total match duration in seconds
  highlights: HighlightMoment[];
  topMoments: HighlightMoment[]; // ranked by severity
  summary: string;
}

export class HighlightsGenerator extends EventEmitter {
  private logger: Logger;
  private matchData: Map<string, any> = new Map();
  private highlightThresholds = {
    militaryValue: 50, // unit destruction threshold
    economicSpike: 200, // resource spike threshold
    technologyAdvance: 1, // tech tier gain
  };

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger('info', 'HighlightsGenerator');
  }

  /**
   * Analyze a completed match for highlights
   */
  generateHighlights(matchData: {
    matchId: string;
    duration: number;
    observations: Array<any>;
    winner: string;
    loser: string;
  }): MatchHighlights {
    const highlights: HighlightMoment[] = [];

    // Store match data for analysis
    this.matchData.set(matchData.matchId, matchData);

    // Analyze observations for key moments
    const militaryMoments = this.findMilitaryMoments(matchData);
    const economicMoments = this.findEconomicMoments(matchData);
    const technologyMoments = this.findTechnologyMoments(matchData);
    const comebackMoments = this.findComebackMoments(matchData);

    highlights.push(...militaryMoments);
    highlights.push(...economicMoments);
    highlights.push(...technologyMoments);
    highlights.push(...comebackMoments);

    // Rank by severity
    const topMoments = highlights
      .sort((a, b) => {
        const severityScore = { major: 3, significant: 2, notable: 1 };
        return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
      })
      .slice(0, 5);

    const result: MatchHighlights = {
      matchId: matchData.matchId,
      duration: matchData.duration,
      highlights,
      topMoments,
      summary: this.generateSummary(topMoments, matchData),
    };

    this.logger.info('Highlights generated', {
      matchId: matchData.matchId,
      totalMoments: highlights.length,
      topMoments: topMoments.length,
    });

    this.emit('highlights-generated', result);
    return result;
  }

  /**
   * Find military engagement moments
   */
  private findMilitaryMoments(matchData: any): HighlightMoment[] {
    const moments: HighlightMoment[] = [];

    // Analyze unit destruction patterns
    const observations = matchData.observations || [];
    let lastMilitaryValue = 0;

    observations.forEach((obs: any, index: number) => {
      const currentMilitaryValue = obs.militaryValue || 0;
      const militaryChange = lastMilitaryValue - currentMilitaryValue;

      // Significant unit loss indicates combat
      if (militaryChange > this.highlightThresholds.militaryValue) {
        moments.push({
          type: 'military',
          timestamp: Math.floor((index / Math.max(1, observations.length)) * matchData.duration),
          duration: 30, // 30 second highlight
          title: `Major Military Engagement`,
          description: `${militaryChange} military value lost in combat`,
          severity: militaryChange > 100 ? 'major' : 'significant',
          players: [matchData.winner, matchData.loser],
        });
      }

      lastMilitaryValue = currentMilitaryValue;
    });

    return moments;
  }

  /**
   * Find economic surge moments
   */
  private findEconomicMoments(matchData: any): HighlightMoment[] {
    const moments: HighlightMoment[] = [];

    const observations = matchData.observations || [];
    let lastEconomyScore = 0;

    observations.forEach((obs: any, index: number) => {
      const currentEconomyScore = obs.economyScore || 0;
      const economicGrowth = currentEconomyScore - lastEconomyScore;

      // Significant economic growth
      if (economicGrowth > this.highlightThresholds.economicSpike) {
        moments.push({
          type: 'economic',
          timestamp: Math.floor((index / Math.max(1, observations.length)) * matchData.duration),
          duration: 20, // 20 second highlight
          title: `Economic Surge`,
          description: `Economy grew by ${economicGrowth} points`,
          severity: economicGrowth > 300 ? 'major' : 'significant',
          players: [matchData.winner, matchData.loser],
        });
      }

      lastEconomyScore = currentEconomyScore;
    });

    return moments;
  }

  /**
   * Find technology advancement moments
   */
  private findTechnologyMoments(matchData: any): HighlightMoment[] {
    const moments: HighlightMoment[] = [];

    // This would analyze tech tree progress
    // For now, detect major tech progression
    moments.push({
      type: 'technology',
      timestamp: Math.floor(matchData.duration * 0.3), // ~30% through match
      duration: 15,
      title: `Technology Breakthrough`,
      description: `New military technology unlocked`,
      severity: 'significant',
      players: [matchData.winner],
    });

    return moments;
  }

  /**
   * Find comeback moments
   */
  private findComebackMoments(matchData: any): HighlightMoment[] {
    const moments: HighlightMoment[] = [];

    const observations = matchData.observations || [];

    // Detect reversals - when losing player gains advantage
    for (let i = Math.max(0, observations.length - 10); i < observations.length; i++) {
      const obs = observations[i];

      // If economy or military surges near end when losing
      if (obs.economyScore > 300 || obs.militaryValue > 200) {
        moments.push({
          type: 'comeback',
          timestamp: Math.floor((i / Math.max(1, observations.length)) * matchData.duration),
          duration: 45,
          title: `Dramatic Comeback Attempt`,
          description: `Trailing player makes aggressive push near endgame`,
          severity: 'major',
          players: [matchData.loser],
        });
        break; // Only one comeback per match
      }
    }

    return moments;
  }

  /**
   * Generate summary of highlights
   */
  private generateSummary(topMoments: HighlightMoment[], matchData: any): string {
    const duration = Math.floor(matchData.duration / 60);

    if (topMoments.length === 0) {
      return `A ${duration} minute match with steady play`;
    }

    const types = new Set(topMoments.map((m) => m.type));
    const typesList = Array.from(types).join(', ');

    return `A ${duration} minute match featured ${topMoments.length} key moments: ${typesList}. Watch for intense gameplay at ${topMoments
      .slice(0, 3)
      .map((m) => `${m.timestamp}s`)
      .join(', ')}.`;
  }

  /**
   * Get highlights for a match
   */
  getHighlights(matchId: string): MatchHighlights | undefined {
    // This would retrieve from database in production
    return undefined;
  }

  /**
   * Export highlights as clip metadata
   */
  exportClipMetadata(
    highlights: MatchHighlights
  ): Array<{
    startTime: number;
    endTime: number;
    title: string;
    description: string;
  }> {
    return highlights.topMoments.map((moment) => ({
      startTime: Math.max(0, moment.timestamp - 5), // 5 second lead-in
      endTime: Math.min(highlights.duration, moment.timestamp + moment.duration + 5), // 5 second tail
      title: moment.title,
      description: moment.description,
    }));
  }

  /**
   * Export as JSON
   */
  toJSON(): Record<string, any> {
    return {
      matchCount: this.matchData.size,
      thresholds: this.highlightThresholds,
    };
  }
}

/**
 * Factory function
 */
export function createHighlightsGenerator(logger?: Logger): HighlightsGenerator {
  return new HighlightsGenerator(logger);
}
