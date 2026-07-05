import type { ExecutionTrace } from './execution-trace.js';

export interface DecisionEvaluation {
  readonly tick: number;
  readonly decision: string;
  readonly outcome: 'successful' | 'missed_opportunity' | 'suboptimal';
  readonly evidence: string;
}

export interface MatchReview {
  readonly success: boolean;
  readonly totalDecisions: number;
  readonly optimalCount: number;
  readonly missedOpportunitiesCount: number;
  readonly suboptimalCount: number;
  readonly overallScore: number;
}

export class SelfEvaluator {
  evaluateMatch(trace: ExecutionTrace): MatchReview {
    const decisions = trace.events.filter(e => e.eventType.includes('decision'));
    const goals = trace.events.filter(e => e.eventType.includes('goal'));
    const completions = trace.events.filter(e => e.eventType === 'mission_completed' || e.eventType === 'mission_failed');

    const success = trace.events.some(e => e.eventType === 'mission_completed');

    let optimalCount = 0;
    let missedOpportunitiesCount = 0;
    let suboptimalCount = 0;

    // Heuristics for evaluation
    for (const decision of decisions) {
      const followUpSuccess = trace.events.some(
        e => e.tick > decision.tick && e.tick < decision.tick + 100 && e.eventType.includes('success')
      );

      if (followUpSuccess) {
        optimalCount++;
      } else {
        const hasAlternative = goals.length > 1 && decisions.length > 1;
        if (hasAlternative) {
          missedOpportunitiesCount++;
        } else {
          suboptimalCount++;
        }
      }
    }

    const totalDecisions = decisions.length;
    const overallScore = totalDecisions > 0 ? (optimalCount + missedOpportunitiesCount * 0.5) / totalDecisions : 0;

    return {
      success,
      totalDecisions,
      optimalCount,
      missedOpportunitiesCount,
      suboptimalCount,
      overallScore: Math.min(1, overallScore),
    };
  }

  identifyMistakes(trace: ExecutionTrace): readonly DecisionEvaluation[] {
    const failures = trace.events.filter(e => e.eventType.includes('failure'));
    const decisions = trace.events.filter(e => e.eventType.includes('decision'));

    const mistakes: DecisionEvaluation[] = [];

    for (const failure of failures) {
      const precedingDecision = decisions
        .filter(d => d.tick < failure.tick)
        .sort((a, b) => b.tick - a.tick)[0];

      if (precedingDecision) {
        mistakes.push({
          tick: failure.tick,
          decision: (precedingDecision.data as any)?.type || 'unknown',
          outcome: 'suboptimal',
          evidence: (failure.data as any)?.reason || 'failure detected',
        });
      }
    }

    return mistakes;
  }

  identifyMissedOpportunities(trace: ExecutionTrace): readonly DecisionEvaluation[] {
    const events = trace.events;
    const opportunities: DecisionEvaluation[] = [];

    // Look for unused resources or idle periods
    for (let i = 0; i < events.length - 1; i++) {
      const current = events[i];
      const next = events[i + 1];

      if (
        next.tick - current.tick > 50 &&
        !current.eventType.includes('command') &&
        !next.eventType.includes('command')
      ) {
        opportunities.push({
          tick: current.tick,
          decision: 'idle_period',
          outcome: 'missed_opportunity',
          evidence: `${next.tick - current.tick} ticks without commands`,
        });
      }
    }

    return opportunities;
  }

  generateReport(trace: ExecutionTrace): string {
    const review = this.evaluateMatch(trace);
    const mistakes = this.identifyMistakes(trace);
    const opportunities = this.identifyMissedOpportunities(trace);

    const lines = [
      'Match Self-Evaluation:',
      `  Status: ${review.success ? 'WIN' : 'LOSS'}`,
      `  Total decisions: ${review.totalDecisions}`,
      `  Optimal decisions: ${review.optimalCount}`,
      `  Missed opportunities: ${review.missedOpportunitiesCount}`,
      `  Suboptimal decisions: ${review.suboptimalCount}`,
      `  Overall score: ${review.overallScore.toFixed(2)}`,
      `  Mistakes identified: ${mistakes.length}`,
      `  Improvement opportunities: ${opportunities.length}`,
    ];

    return lines.join('\n');
  }
}
