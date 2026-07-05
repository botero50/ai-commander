export interface Hypothesis {
  readonly id: string;
  readonly description: string;
  readonly confidence: number;
  readonly createdAtTick: number;
  readonly lastUpdatedTick: number;
  readonly evidence: readonly string[];
}

export interface HypothesisEvent {
  readonly tick: number;
  readonly hypothesisId: string;
  readonly action: 'created' | 'updated' | 'removed' | 'confirmed' | 'rejected';
  readonly confidenceChange: number;
  readonly newConfidence: number;
  readonly reason: string;
}

export class HypothesisEngine {
  private hypotheses: Map<string, Hypothesis> = new Map();
  private events: HypothesisEvent[] = [];
  private nextId = 0;

  generateHypotheses(tick: number, context: string): readonly Hypothesis[] {
    const hypotheses: Hypothesis[] = [];

    const h1: Hypothesis = {
      id: `hyp-${this.nextId++}`,
      description: `Enemy expanding territory based on ${context}`,
      confidence: 0.6,
      createdAtTick: tick,
      lastUpdatedTick: tick,
      evidence: ['unit movement', 'resource gathering'],
    };
    this.hypotheses.set(h1.id, h1);
    hypotheses.push(h1);

    const h2: Hypothesis = {
      id: `hyp-${this.nextId++}`,
      description: `Enemy preparing military offensive`,
      confidence: 0.5,
      createdAtTick: tick,
      lastUpdatedTick: tick,
      evidence: ['unit production'],
    };
    this.hypotheses.set(h2.id, h2);
    hypotheses.push(h2);

    const h3: Hypothesis = {
      id: `hyp-${this.nextId++}`,
      description: `Enemy defending current position`,
      confidence: 0.4,
      createdAtTick: tick,
      lastUpdatedTick: tick,
      evidence: ['static deployment'],
    };
    this.hypotheses.set(h3.id, h3);
    hypotheses.push(h3);

    return hypotheses;
  }

  updateConfidence(
    tick: number,
    hypothesisId: string,
    observation: string,
    confidenceAdjustment: number
  ): HypothesisEvent | null {
    const hyp = this.hypotheses.get(hypothesisId);
    if (!hyp) return null;

    const oldConfidence = hyp.confidence;
    const newConfidence = Math.max(0, Math.min(1, hyp.confidence + confidenceAdjustment));

    const updatedHyp: Hypothesis = {
      ...hyp,
      confidence: newConfidence,
      lastUpdatedTick: tick,
      evidence: [...hyp.evidence, observation],
    };

    this.hypotheses.set(hypothesisId, updatedHyp);

    const event: HypothesisEvent = {
      tick,
      hypothesisId,
      action: 'updated',
      confidenceChange: confidenceAdjustment,
      newConfidence,
      reason: observation,
    };

    this.events.push(event);
    return event;
  }

  removeInvalidHypothesis(tick: number, hypothesisId: string, reason: string): HypothesisEvent | null {
    const hyp = this.hypotheses.get(hypothesisId);
    if (!hyp) return null;

    this.hypotheses.delete(hypothesisId);

    const event: HypothesisEvent = {
      tick,
      hypothesisId,
      action: 'removed',
      confidenceChange: -hyp.confidence,
      newConfidence: 0,
      reason,
    };

    this.events.push(event);
    return event;
  }

  getMostConfidentHypothesis(): Hypothesis | null {
    let best: Hypothesis | null = null;
    for (const hyp of this.hypotheses.values()) {
      if (!best || hyp.confidence > best.confidence) {
        best = hyp;
      }
    }
    return best;
  }

  getHypothesesAboveThreshold(threshold: number): readonly Hypothesis[] {
    const result: Hypothesis[] = [];
    for (const hyp of this.hypotheses.values()) {
      if (hyp.confidence >= threshold) {
        result.push(hyp);
      }
    }
    return result.sort((a, b) => b.confidence - a.confidence);
  }

  getAllHypotheses(): readonly Hypothesis[] {
    return Array.from(this.hypotheses.values()).sort((a, b) => b.confidence - a.confidence);
  }

  getEvents(): readonly HypothesisEvent[] {
    return [...this.events];
  }

  clear(): void {
    this.hypotheses.clear();
    this.events = [];
  }
}
