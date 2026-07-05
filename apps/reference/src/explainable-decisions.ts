export interface DecisionExplanation {
  readonly tick: number;
  readonly decision: string;
  readonly selectedReason: string;
  readonly selectedEvidence: readonly string[];
  readonly selectedPredictions: readonly string[];
  readonly selectedRiskScore: number;
  readonly rejectedAlternatives: readonly RejectedAlternative[];
  readonly summary: string;
}

export interface RejectedAlternative {
  readonly alternative: string;
  readonly rejectionReason: string;
  readonly criticalFlaw: string | null;
}

export class DecisionExplainer {
  explainDecision(
    tick: number,
    selectedDecision: string,
    candidates: readonly string[],
    observedEvidence: readonly string[],
    predictions: readonly string[],
    riskScore: number
  ): DecisionExplanation {
    const selectedReason = this.generateSelectionReason(selectedDecision, riskScore);
    const rejectedAlternatives = this.generateRejections(
      selectedDecision,
      candidates,
      riskScore
    );
    const summary = this.generateSummary(
      selectedDecision,
      selectedReason,
      rejectedAlternatives
    );

    return {
      tick,
      decision: selectedDecision,
      selectedReason,
      selectedEvidence: observedEvidence,
      selectedPredictions: predictions,
      selectedRiskScore: riskScore,
      rejectedAlternatives,
      summary,
    };
  }

  private generateSelectionReason(decision: string, riskScore: number): string {
    const riskLevel = riskScore < 0.3 ? 'acceptable' : riskScore < 0.6 ? 'moderate' : 'elevated';

    const reasons: Record<string, string> = {
      'attack': `Favorable offensive position with ${riskLevel} risk`,
      'defend': `Stabilize current position with ${riskLevel} risk`,
      'expand': `Secure resources with ${riskLevel} risk`,
      'retreat': `Preserve forces and regroup with ${riskLevel} risk`,
      'gather-resources': `Build economic foundation with ${riskLevel} risk`,
    };

    return reasons[decision] || `Execute ${decision} with ${riskLevel} risk`;
  }

  private generateRejections(
    selected: string,
    candidates: readonly string[],
    riskScore: number
  ): readonly RejectedAlternative[] {
    const rejections: RejectedAlternative[] = [];

    for (const candidate of candidates) {
      if (candidate === selected) continue;

      const reason = this.evaluateAlternative(candidate, riskScore);
      const flaw = this.identifyCriticalFlaw(candidate, riskScore);

      rejections.push({
        alternative: candidate,
        rejectionReason: reason,
        criticalFlaw: flaw,
      });
    }

    return rejections;
  }

  private evaluateAlternative(option: string, riskScore: number): string {
    const evaluations: Record<string, string> = {
      'attack': 'Aggressive move increases risk exposure',
      'defend': 'Passive posture loses initiative',
      'expand': 'Overextends territory with limited resources',
      'retreat': 'Sacrifices strategic position',
      'gather-resources': 'Delays military response',
    };

    return evaluations[option] || 'Suboptimal given current situation';
  }

  private identifyCriticalFlaw(option: string, riskScore: number): string | null {
    if (riskScore > 0.7) {
      if (option === 'attack') return 'Unacceptable casualties in disadvantaged position';
      if (option === 'expand') return 'Insufficient resources for territorial commitment';
    }

    if (riskScore < 0.3) {
      if (option === 'retreat') return 'Unnecessary - position favorable';
      if (option === 'defend') return 'Passive - should capitalize on advantage';
    }

    return null;
  }

  private generateSummary(
    decision: string,
    reason: string,
    rejected: readonly RejectedAlternative[]
  ): string {
    const flaws = rejected.filter((r) => r.criticalFlaw).length;
    return `Decision: ${decision}. ${reason}. Rejected ${rejected.length} alternatives${flaws > 0 ? ` (${flaws} had critical flaws)` : ''}.`;
  }

  recordDecisionHistory(decisions: readonly DecisionExplanation[]): string {
    const total = decisions.length;
    const riskAvg =
      total > 0 ? decisions.reduce((sum, d) => sum + d.selectedRiskScore, 0) / total : 0;

    return `Decision history: ${total} decisions, average risk ${(riskAvg * 100).toFixed(0)}%`;
  }
}
