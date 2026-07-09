/**
 * Objective Inference Engine
 * Analyzes decision patterns to infer current AI objective/strategy
 */

export type DecisionCategory = 'economy' | 'military' | 'tech' | 'scouting' | 'strategy' | 'idle' | 'unknown';

export interface ObjectiveInference {
  objective: string;
  confidence: number; // 0-1
  evidence: string[]; // Why we think this is the objective
}

/**
 * Analyze decision history and infer current objective
 */
export class ObjectiveInferenceEngine {
  private historySize: number = 20; // Keep last 20 decisions
  private decisionHistory: DecisionCategory[] = [];

  /**
   * Add a decision to the history
   */
  recordDecision(category: DecisionCategory): void {
    this.decisionHistory.push(category);

    // Keep only the last N decisions
    if (this.decisionHistory.length > this.historySize) {
      this.decisionHistory = this.decisionHistory.slice(-this.historySize);
    }
  }

  /**
   * Infer current objective from decision history
   */
  inferObjective(): ObjectiveInference {
    if (this.decisionHistory.length === 0) {
      return {
        objective: 'Awaiting first decision',
        confidence: 0,
        evidence: [],
      };
    }

    if (this.decisionHistory.length < 3) {
      return {
        objective: 'Analyzing...',
        confidence: 0.3,
        evidence: ['Not enough decisions to infer pattern'],
      };
    }

    // Analyze recent decisions
    const recentCount = Math.min(5, this.decisionHistory.length);
    const recentDecisions = this.decisionHistory.slice(-recentCount);
    const midCount = Math.min(10, this.decisionHistory.length);
    const midDecisions = this.decisionHistory.slice(-midCount);

    return this.analyzePattern(recentDecisions, midDecisions);
  }

  /**
   * Analyze decision patterns to infer objective
   */
  private analyzePattern(recentDecisions: DecisionCategory[], midDecisions: DecisionCategory[]): ObjectiveInference {
    // Count categories
    const recentCounts = this.countCategories(recentDecisions);
    const midCounts = this.countCategories(midDecisions);

    // Check for strong patterns
    const militaryRecent = recentCounts.military || 0;
    const economicRecent = recentCounts.economic || 0;
    const techRecent = recentCounts.tech || 0;
    const scoutingRecent = recentCounts.scouting || 0;

    const evidence: string[] = [];

    // Pattern 1: Building Army (3+ consecutive military)
    if (militaryRecent >= 3) {
      const militaryPattern = this.checkConsecutivePattern(recentDecisions, 'military', 3);
      if (militaryPattern) {
        evidence.push(`${militaryRecent} recent military decisions`);
        return {
          objective: 'Building Army',
          confidence: Math.min(1, 0.6 + militaryRecent * 0.15),
          evidence,
        };
      }
    }

    // Pattern 2: Expanding Economy (3+ consecutive economic)
    if (economicRecent >= 3) {
      const economicPattern = this.checkConsecutivePattern(recentDecisions, 'economy', 3);
      if (economicPattern) {
        evidence.push(`${economicRecent} recent economic decisions`);
        return {
          objective: 'Expanding Economy',
          confidence: Math.min(1, 0.6 + economicRecent * 0.15),
          evidence,
        };
      }
    }

    // Pattern 3: Researching Technologies (2+ tech decisions)
    if (techRecent >= 2) {
      const techConsecutive = this.checkConsecutivePattern(recentDecisions, 'tech', 2);
      if (techConsecutive) {
        evidence.push(`${techRecent} recent technology decisions`);
        return {
          objective: 'Researching Technologies',
          confidence: Math.min(1, 0.5 + techRecent * 0.25),
          evidence,
        };
      }
    }

    // Pattern 4: Aggressive Scouting (2+ scouting decisions)
    if (scoutingRecent >= 2) {
      const scoutingConsecutive = this.checkConsecutivePattern(recentDecisions, 'scouting', 2);
      if (scoutingConsecutive) {
        evidence.push(`${scoutingRecent} recent scouting decisions`);
        return {
          objective: 'Gathering Intelligence',
          confidence: 0.5 + scoutingRecent * 0.15,
          evidence,
        };
      }
    }

    // Pattern 5: Defensive Posture (military + economy mix, defensive category)
    if (militaryRecent >= 1 && economicRecent >= 1) {
      evidence.push('Mixed military and economic decisions');
      return {
        objective: 'Defending & Consolidating',
        confidence: 0.5,
        evidence,
      };
    }

    // Pattern 6: Overall category dominance in mid-term history
    const midMilitary = midCounts.military || 0;
    const midEconomic = midCounts.economic || 0;

    if (midMilitary > midEconomic + 2) {
      evidence.push(`${midMilitary} military vs ${midEconomic} economic decisions (mid-term)`);
      return {
        objective: 'Military Expansion',
        confidence: Math.min(1, 0.4 + (midMilitary - midEconomic) * 0.05),
        evidence,
      };
    }

    if (midEconomic > midMilitary + 2) {
      evidence.push(`${midEconomic} economic vs ${midMilitary} military decisions (mid-term)`);
      return {
        objective: 'Economic Growth',
        confidence: Math.min(1, 0.4 + (midEconomic - midMilitary) * 0.05),
        evidence,
      };
    }

    // Default: Balanced Strategy
    evidence.push('No clear pattern dominance');
    return {
      objective: 'Balanced Strategy',
      confidence: 0.4,
      evidence,
    };
  }

  /**
   * Check if a category appears consecutively N times in the array
   */
  private checkConsecutivePattern(decisions: DecisionCategory[], category: DecisionCategory, minCount: number): boolean {
    let consecutiveCount = 0;

    for (const decision of decisions) {
      if (decision === category) {
        consecutiveCount++;
        if (consecutiveCount >= minCount) {
          return true;
        }
      } else {
        consecutiveCount = 0;
      }
    }

    return false;
  }

  /**
   * Count categories in decision array
   */
  private countCategories(decisions: DecisionCategory[]): Record<DecisionCategory, number> {
    const counts: Record<DecisionCategory, number> = {
      economy: 0,
      military: 0,
      tech: 0,
      scouting: 0,
      strategy: 0,
      idle: 0,
      unknown: 0,
    };

    for (const category of decisions) {
      counts[category]++;
    }

    return counts;
  }

  /**
   * Reset history (e.g., when opponent eliminated)
   */
  reset(): void {
    this.decisionHistory = [];
  }

  /**
   * Get decision history for debugging
   */
  getHistory(): DecisionCategory[] {
    return [...this.decisionHistory];
  }
}
