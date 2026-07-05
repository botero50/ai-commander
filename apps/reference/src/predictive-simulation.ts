export interface SimulationScenario {
  readonly id: string;
  readonly decision: string;
  readonly expectedOutcome: string;
  readonly valueScore: number;
  readonly riskScore: number;
}

export interface SimulationResult {
  readonly tick: number;
  readonly scenarios: readonly SimulationScenario[];
  readonly selectedDecision: string;
  readonly reasoning: string;
}

export class PredictiveSimulator {
  simulateDecisions(
    tick: number,
    currentState: string,
    availableActions: readonly string[]
  ): SimulationResult {
    const scenarios = this.generateScenarios(tick, currentState, availableActions);
    const selected = this.selectBestScenario(scenarios);
    const reasoning = this.generateReasoning(scenarios, selected);

    return {
      tick,
      scenarios,
      selectedDecision: selected.decision,
      reasoning,
    };
  }

  private generateScenarios(
    tick: number,
    state: string,
    actions: readonly string[]
  ): readonly SimulationScenario[] {
    const scenarios: SimulationScenario[] = [];

    for (const action of actions) {
      const outcome = this.simulateOutcome(state, action);
      const valueScore = this.evaluateValue(outcome);
      const riskScore = this.evaluateRisk(outcome);

      scenarios.push({
        id: `scenario-${Math.random()}`,
        decision: action,
        expectedOutcome: outcome,
        valueScore,
        riskScore,
      });
    }

    return scenarios;
  }

  private simulateOutcome(state: string, action: string): string {
    const outcomes: Record<string, string> = {
      'attack': 'enemy loses units, territorial gain',
      'defend': 'unit losses reduced, territory held',
      'expand': 'new resources gained, territory control increased',
      'retreat': 'unit preservation, strategic regrouping',
      'gather-resources': 'economic growth, delayed military action',
    };

    return outcomes[action] || 'outcome depends on variables';
  }

  private evaluateValue(outcome: string): number {
    const keywords: Record<string, number> = {
      'territorial gain': 0.9,
      'resources gained': 0.8,
      'unit losses': -0.7,
      'delayed action': -0.3,
      'held': 0.5,
      'preservation': 0.4,
      'regrouping': 0.3,
    };

    let score = 0.5;
    for (const [keyword, value] of Object.entries(keywords)) {
      if (outcome.includes(keyword)) {
        score += value;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  private evaluateRisk(outcome: string): number {
    const riskFactors: Record<string, number> = {
      'loses units': 0.3,
      'losses reduced': -0.2,
      'regrouping': -0.1,
      'delayed': 0.2,
    };

    let risk = 0.5;
    for (const [factor, value] of Object.entries(riskFactors)) {
      if (outcome.includes(factor)) {
        risk += value;
      }
    }

    return Math.max(0, Math.min(1, risk));
  }

  private selectBestScenario(scenarios: readonly SimulationScenario[]): SimulationScenario {
    let best = scenarios[0];

    for (const scenario of scenarios) {
      const bestScore = best.valueScore - best.riskScore * 0.5;
      const currentScore = scenario.valueScore - scenario.riskScore * 0.5;

      if (currentScore > bestScore) {
        best = scenario;
      }
    }

    return best;
  }

  private generateReasoning(
    scenarios: readonly SimulationScenario[],
    selected: SimulationScenario
  ): string {
    const alternatives = scenarios
      .filter((s) => s.id !== selected.id)
      .slice(0, 2)
      .map((s) => s.decision)
      .join(', ');

    return `Selected: ${selected.decision} (value: ${(selected.valueScore * 100).toFixed(0)}%, risk: ${(selected.riskScore * 100).toFixed(0)}%). Alternatives: ${alternatives}.`;
  }

  compareAlternatives(
    scenarios: readonly SimulationScenario[]
  ): readonly SimulationScenario[] {
    return scenarios.sort((a, b) => {
      const scoreA = a.valueScore - a.riskScore * 0.5;
      const scoreB = b.valueScore - b.riskScore * 0.5;
      return scoreB - scoreA;
    });
  }
}
