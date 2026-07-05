import type { StrategyType } from './strategy-profile.js';

export interface StrategyAdaptationDecision {
  readonly shouldAdapt: boolean;
  readonly currentStrategy: StrategyType;
  readonly recommendedStrategy: StrategyType;
  readonly reason: string;
  readonly successProbability: number;
}

export class StrategyAdapter {
  evaluateAdaptation(
    currentStrategy: StrategyType,
    economyScore: number,
    militaryScore: number,
    threatLevel: number,
    winProbability: number
  ): StrategyAdaptationDecision {
    let recommendedStrategy = currentStrategy;
    let successProbability = winProbability;
    let reason = 'current_strategy_optimal';

    // If losing economically but winning militarily, shift Aggressive
    if (economyScore < 0.4 && militaryScore > 0.7 && threatLevel < 0.5) {
      recommendedStrategy = 'Aggressive';
      successProbability = 0.75;
      reason = 'military_advantage_pursue_attack';
    }

    // If losing militarily, shift Defensive
    if (militaryScore < 0.4 && threatLevel > 0.7) {
      recommendedStrategy = 'Defensive';
      successProbability = 0.65;
      reason = 'military_disadvantage_consolidate';
    }

    // If winning economy and time permits, shift Economic
    if (economyScore > 0.8 && winProbability > 0.6 && currentStrategy !== 'Economic') {
      recommendedStrategy = 'Economic';
      successProbability = 0.8;
      reason = 'economic_advantage_expand';
    }

    // If balanced and threat rising, shift Balanced
    if (Math.abs(economyScore - militaryScore) < 0.2 && threatLevel > 0.5 && threatLevel < 0.8) {
      recommendedStrategy = 'Balanced';
      successProbability = 0.7;
      reason = 'threat_balanced_response';
    }

    const shouldAdapt = successProbability > winProbability && recommendedStrategy !== currentStrategy;

    return {
      shouldAdapt,
      currentStrategy,
      recommendedStrategy,
      reason,
      successProbability,
    };
  }

  computeAdaptationThreshold(): number {
    // Only switch strategies if new approach has >15% better success probability
    return 0.15;
  }

  isAdaptationJustified(decision: StrategyAdaptationDecision, threshold: number): boolean {
    if (decision.currentStrategy === decision.recommendedStrategy) {
      return false;
    }

    const improvement = decision.successProbability - (0.5); // baseline
    return improvement > threshold;
  }
}
