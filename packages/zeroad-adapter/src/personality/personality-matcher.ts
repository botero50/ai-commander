/**
 * Personality Matcher
 * Match personalities to game contexts and player preferences
 */

import { PersonalityProfile, PersonalityArchetype } from './personality-profile.js';

export interface PersonalityMatch {
  matchId: string;
  personality: PersonalityProfile;
  score: number; // 0-100
  reasons: string[];
  compatibility: {
    audience?: number; // 0-100
    gameType?: number; // 0-100
    commentary?: number; // 0-100
    entertainment?: number; // 0-100
  };
}

export interface PersonalityContext {
  gameType?: 'competitive' | 'casual' | 'educational' | 'entertainment';
  audience?: 'casual' | 'competitive' | 'educational' | 'mixed';
  tone?: 'professional' | 'casual' | 'energetic' | 'analytical' | 'humorous';
  matchIntensity?: number; // 0-100 (0=slow, 100=fast-paced)
  eventType?: string; // 'tournament', 'friendly', 'stream', 'analysis'
}

export interface MatchingMetrics {
  totalMatches: number;
  averageScore: number;
  bestMatch?: PersonalityMatch;
  recommendations: PersonalityMatch[];
}

/**
 * Personality matcher for optimal personality selection
 */
export class PersonalityMatcher {
  private matchHistory: Map<string, PersonalityMatch> = new Map();
  private matchCounter: number = 0;

  constructor() {}

  /**
   * Find best match for context
   */
  findBestMatch(
    personalities: PersonalityProfile[],
    context: PersonalityContext
  ): PersonalityMatch | null {
    if (personalities.length === 0) return null;

    const matches = this.scoreMatches(personalities, context);

    if (matches.length === 0) return null;

    return matches.sort((a, b) => b.score - a.score)[0];
  }

  /**
   * Find all matches with scores
   */
  findMatches(
    personalities: PersonalityProfile[],
    context: PersonalityContext,
    minScore: number = 50
  ): PersonalityMatch[] {
    const matches = this.scoreMatches(personalities, context);

    return matches
      .filter((m) => m.score >= minScore)
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Score personalities against context
   */
  private scoreMatches(
    personalities: PersonalityProfile[],
    context: PersonalityContext
  ): PersonalityMatch[] {
    return personalities.map((personality) => {
      const matchId = `match_${Date.now()}_${this.matchCounter++}`;
      const compatibility = this.calculateCompatibility(personality, context);
      const score = this.calculateScore(compatibility);
      const reasons = this.generateReasons(personality, context, compatibility);

      const match: PersonalityMatch = {
        matchId,
        personality,
        score,
        reasons,
        compatibility,
      };

      this.matchHistory.set(matchId, match);

      return match;
    });
  }

  /**
   * Calculate compatibility scores
   */
  private calculateCompatibility(
    personality: PersonalityProfile,
    context: PersonalityContext
  ): PersonalityMatch['compatibility'] {
    const compatibility: PersonalityMatch['compatibility'] = {};

    // Audience compatibility
    if (context.audience) {
      const audienceMap: Record<string, number> = {
        'casual': personality.metadata.targetAudience === 'casual' ? 90 : 60,
        'competitive': personality.metadata.targetAudience === 'competitive' ? 90 : 70,
        'educational': personality.metadata.targetAudience === 'educational' ? 90 : 50,
        'mixed': 80,
      };

      compatibility.audience = audienceMap[context.audience] || 70;
    }

    // Game type compatibility
    if (context.gameType) {
      const gameTypeMap: Record<string, number> = {
        'competitive': personality.traits.expertise > 70 ? 85 : 60,
        'casual': personality.traits.humor > 70 ? 85 : 70,
        'educational': personality.traits.expertise > 70 ? 90 : 60,
        'entertainment': personality.traits.enthusiasm > 75 ? 85 : 70,
      };

      compatibility.gameType = gameTypeMap[context.gameType] || 70;
    }

    // Commentary style compatibility
    if (context.tone) {
      const toneMap: Record<string, number> = {
        'professional': personality.style.vocabulary === 'formal' ? 85 : 65,
        'casual': personality.style.vocabulary === 'casual' ? 85 : 60,
        'energetic': personality.traits.enthusiasm > 80 ? 90 : 55,
        'analytical': personality.traits.expertise > 75 ? 85 : 60,
        'humorous': personality.traits.humor > 75 ? 90 : 50,
      };

      compatibility.commentary = toneMap[context.tone] || 70;
    }

    // Entertainment value
    compatibility.entertainment = Math.min(
      100,
      Math.round((personality.traits.humor + personality.traits.enthusiasm) / 2)
    );

    return compatibility;
  }

  /**
   * Calculate overall match score
   */
  private calculateScore(compatibility: PersonalityMatch['compatibility']): number {
    const values = Object.values(compatibility).filter((v) => v !== undefined);

    if (values.length === 0) return 70; // Default score

    return Math.round(values.reduce((a, b) => a + b) / values.length);
  }

  /**
   * Generate reasons for match
   */
  private generateReasons(
    personality: PersonalityProfile,
    context: PersonalityContext,
    compatibility: PersonalityMatch['compatibility']
  ): string[] {
    const reasons: string[] = [];

    if (compatibility.audience && compatibility.audience > 75) {
      reasons.push(`Perfect for ${context.audience} audience`);
    }

    if (compatibility.gameType && compatibility.gameType > 75) {
      reasons.push(`Suits ${context.gameType} game style`);
    }

    if (personality.traits.expertise > 85) {
      reasons.push('Deep game knowledge');
    }

    if (personality.traits.enthusiasm > 85) {
      reasons.push('High energy personality');
    }

    if (personality.traits.humor > 75) {
      reasons.push('Strong entertainment value');
    }

    if (personality.behavior.explainsReasoning) {
      reasons.push('Explains strategic decisions');
    }

    if (personality.behavior.usesNamesFrequently) {
      reasons.push('Personalizes commentary');
    }

    if (reasons.length === 0) {
      reasons.push('Solid match for context');
    }

    return reasons;
  }

  /**
   * Get match history
   */
  getMatchHistory(limit: number = 100): PersonalityMatch[] {
    return Array.from(this.matchHistory.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get metrics
   */
  getMetrics(): MatchingMetrics {
    const matches = Array.from(this.matchHistory.values());

    if (matches.length === 0) {
      return {
        totalMatches: 0,
        averageScore: 0,
        recommendations: [],
      };
    }

    const sorted = matches.sort((a, b) => b.score - a.score);
    const scores = matches.map((m) => m.score);
    const averageScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);

    return {
      totalMatches: matches.length,
      averageScore,
      bestMatch: sorted[0],
      recommendations: sorted.slice(0, 5),
    };
  }

  /**
   * Recommend personalities for role
   */
  recommendForRole(
    personalities: PersonalityProfile[],
    role: 'analyst' | 'entertainer' | 'educator' | 'guide'
  ): PersonalityMatch[] {
    const roleContexts: Record<string, PersonalityContext> = {
      analyst: {
        tone: 'analytical',
        gameType: 'competitive',
        audience: 'competitive',
      },
      entertainer: {
        tone: 'humorous',
        gameType: 'casual',
        audience: 'casual',
      },
      educator: {
        tone: 'professional',
        gameType: 'educational',
        audience: 'educational',
      },
      guide: {
        tone: 'professional',
        gameType: 'entertainment',
        audience: 'mixed',
      },
    };

    const context = roleContexts[role];

    return this.findMatches(personalities, context, 60);
  }

  /**
   * Compare personalities
   */
  compare(
    personality1: PersonalityProfile,
    personality2: PersonalityProfile,
    context: PersonalityContext
  ): {
    p1: PersonalityMatch;
    p2: PersonalityMatch;
    winner: PersonalityProfile;
    comparison: string[];
  } {
    const [match1] = this.scoreMatches([personality1], context);
    const [match2] = this.scoreMatches([personality2], context);

    const comparison: string[] = [];

    if (match1.score > match2.score) {
      comparison.push(
        `${personality1.name} scores higher (${match1.score} vs ${match2.score})`
      );
    } else if (match2.score > match1.score) {
      comparison.push(
        `${personality2.name} scores higher (${match2.score} vs ${match1.score})`
      );
    } else {
      comparison.push(`Both personalities score equally (${match1.score})`);
    }

    // Compare specific traits
    if (personality1.traits.expertise > personality2.traits.expertise) {
      comparison.push(`${personality1.name} has more expertise`);
    } else if (personality2.traits.expertise > personality1.traits.expertise) {
      comparison.push(`${personality2.name} has more expertise`);
    }

    if (personality1.traits.humor > personality2.traits.humor) {
      comparison.push(`${personality1.name} is funnier`);
    } else if (personality2.traits.humor > personality1.traits.humor) {
      comparison.push(`${personality2.name} is funnier`);
    }

    const winner = match1.score > match2.score ? personality1 : personality2;

    return {
      p1: match1,
      p2: match2,
      winner,
      comparison,
    };
  }

  /**
   * Score personality for specific context
   */
  scoreForContext(
    personality: PersonalityProfile,
    context: PersonalityContext
  ): PersonalityMatch {
    const [match] = this.scoreMatches([personality], context);
    return match;
  }

  /**
   * Reset matcher
   */
  reset(): void {
    this.matchHistory.clear();
    this.matchCounter = 0;
  }
}
