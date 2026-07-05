export interface Belief {
  readonly id: string;
  readonly statement: string;
  readonly confidence: number;
  readonly isObserved: boolean;
  readonly createdAtTick: number;
  readonly lastUpdatedTick: number;
}

export interface BeliefUpdate {
  readonly tick: number;
  readonly beliefId: string;
  readonly oldConfidence: number;
  readonly newConfidence: number;
  readonly reason: string;
}

export class BeliefState {
  private beliefs: Map<string, Belief> = new Map();
  private updates: BeliefUpdate[] = [];
  private nextId = 0;

  recordObservation(tick: number, statement: string): Belief {
    const belief: Belief = {
      id: `belief-${this.nextId++}`,
      statement,
      confidence: 1.0,
      isObserved: true,
      createdAtTick: tick,
      lastUpdatedTick: tick,
    };
    this.beliefs.set(belief.id, belief);
    return belief;
  }

  inferBelief(tick: number, statement: string, confidence: number): Belief {
    const belief: Belief = {
      id: `belief-${this.nextId++}`,
      statement,
      confidence: Math.max(0, Math.min(1, confidence)),
      isObserved: false,
      createdAtTick: tick,
      lastUpdatedTick: tick,
    };
    this.beliefs.set(belief.id, belief);
    return belief;
  }

  updateBeliefConfidence(tick: number, beliefId: string, newConfidence: number, reason: string): BeliefUpdate | null {
    const belief = this.beliefs.get(beliefId);
    if (!belief) return null;

    const oldConfidence = belief.confidence;
    const clampedConfidence = Math.max(0, Math.min(1, newConfidence));

    const updated: Belief = {
      ...belief,
      confidence: clampedConfidence,
      lastUpdatedTick: tick,
    };
    this.beliefs.set(beliefId, updated);

    const update: BeliefUpdate = {
      tick,
      beliefId,
      oldConfidence,
      newConfidence: clampedConfidence,
      reason,
    };
    this.updates.push(update);

    return update;
  }

  getObservedBeliefs(): readonly Belief[] {
    return Array.from(this.beliefs.values())
      .filter((b) => b.isObserved)
      .sort((a, b) => b.confidence - a.confidence);
  }

  getInferredBeliefs(): readonly Belief[] {
    return Array.from(this.beliefs.values())
      .filter((b) => !b.isObserved)
      .sort((a, b) => b.confidence - a.confidence);
  }

  getBeliefsByConfidence(minConfidence: number): readonly Belief[] {
    return Array.from(this.beliefs.values())
      .filter((b) => b.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence);
  }

  getBelief(beliefId: string): Belief | null {
    return this.beliefs.get(beliefId) ?? null;
  }

  getAllBeliefs(): readonly Belief[] {
    return Array.from(this.beliefs.values()).sort((a, b) => b.confidence - a.confidence);
  }

  getUpdates(): readonly BeliefUpdate[] {
    return [...this.updates];
  }

  getUpdatesForBelief(beliefId: string): readonly BeliefUpdate[] {
    return this.updates.filter((u) => u.beliefId === beliefId);
  }

  clear(): void {
    this.beliefs.clear();
    this.updates = [];
  }

  getStatistics() {
    const all = this.getAllBeliefs();
    const observed = this.getObservedBeliefs();
    const avgConfidence = all.length > 0 ? all.reduce((sum, b) => sum + b.confidence, 0) / all.length : 0;

    return {
      totalBeliefs: all.length,
      observedBeliefs: observed.length,
      inferredBeliefs: all.length - observed.length,
      averageConfidence: avgConfidence,
    };
  }
}
