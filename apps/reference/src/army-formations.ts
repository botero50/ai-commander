import type { WorldState } from '@ai-commander/domain';

export interface ArmyFormation {
  readonly tick: number;
  readonly formations: readonly Formation[];
  readonly regroupEvents: readonly RegroupEvent[];
}

export interface Formation {
  readonly id: string;
  readonly type: 'frontline' | 'flanking' | 'rear-guard' | 'ranged' | 'siege';
  readonly unitCount: number;
  readonly centerX: number;
  readonly centerY: number;
  readonly strength: number;
  readonly cohesion: number;
}

export interface RegroupEvent {
  readonly tick: number;
  readonly fromFormation: string;
  readonly toFormation: string;
  readonly unitCount: number;
  readonly reasoning: string;
}

export class ArmyFormationController {
  analyzeFormations(tick: number, world: WorldState): ArmyFormation {
    const agents = world.agents ?? [];
    const formations = this.organizeFormations(agents);
    const regroupEvents = this.detectRegrouping(tick, formations);

    return {
      tick,
      formations,
      regroupEvents,
    };
  }

  private organizeFormations(agents: any[]): readonly Formation[] {
    const formations: Formation[] = [];

    if (agents.length === 0) {
      return formations;
    }

    const unitsPerFormation = Math.max(1, Math.floor(agents.length / 3));

    const frontlineUnits = Math.min(unitsPerFormation, agents.length);
    formations.push({
      id: 'frontline-1',
      type: 'frontline',
      unitCount: frontlineUnits,
      centerX: 25,
      centerY: 25,
      strength: 0.8,
      cohesion: 0.9,
    });

    if (agents.length > unitsPerFormation) {
      const flanking = Math.min(unitsPerFormation, agents.length - frontlineUnits);
      formations.push({
        id: 'flank-1',
        type: 'flanking',
        unitCount: flanking,
        centerX: 35,
        centerY: 30,
        strength: 0.7,
        cohesion: 0.85,
      });
    }

    if (agents.length > 2 * unitsPerFormation) {
      const rearGuard = agents.length - 2 * unitsPerFormation;
      formations.push({
        id: 'rear-1',
        type: 'rear-guard',
        unitCount: rearGuard,
        centerX: 15,
        centerY: 20,
        strength: 0.6,
        cohesion: 0.8,
      });
    }

    return formations;
  }

  private detectRegrouping(tick: number, formations: readonly Formation[]): readonly RegroupEvent[] {
    const events: RegroupEvent[] = [];

    if (formations.length >= 2) {
      const avgCohesion = formations.reduce((sum, f) => sum + f.cohesion, 0) / formations.length;

      if (avgCohesion < 0.7) {
        const weakest = formations.reduce((min, f) =>
          f.cohesion < min.cohesion ? f : min
        );
        const strongest = formations.reduce((max, f) =>
          f.cohesion > max.cohesion ? f : max
        );

        if (weakest.id !== strongest.id && weakest.unitCount > 0) {
          const transferUnits = Math.floor(weakest.unitCount * 0.3);
          events.push({
            tick,
            fromFormation: weakest.id,
            toFormation: strongest.id,
            unitCount: transferUnits,
            reasoning: `Reinforce strong formation (cohesion: ${(avgCohesion * 100).toFixed(0)}%)`,
          });
        }
      }
    }

    return events;
  }

  createFrontlineFormation(units: number): Formation {
    return {
      id: `frontline-${Math.random()}`,
      type: 'frontline',
      unitCount: units,
      centerX: 25,
      centerY: 25,
      strength: 0.8,
      cohesion: 0.9,
    };
  }

  createFlankingFormation(units: number, offsetX: number, offsetY: number): Formation {
    return {
      id: `flank-${Math.random()}`,
      type: 'flanking',
      unitCount: units,
      centerX: 25 + offsetX,
      centerY: 25 + offsetY,
      strength: 0.7,
      cohesion: 0.85,
    };
  }

  createRearGuardFormation(units: number): Formation {
    return {
      id: `rear-${Math.random()}`,
      type: 'rear-guard',
      unitCount: units,
      centerX: 15,
      centerY: 20,
      strength: 0.6,
      cohesion: 0.8,
    };
  }

  createRangedFormation(units: number, x: number, y: number): Formation {
    return {
      id: `ranged-${Math.random()}`,
      type: 'ranged',
      unitCount: units,
      centerX: x,
      centerY: y,
      strength: 0.5,
      cohesion: 0.75,
    };
  }

  createSiegeFormation(units: number, targetX: number, targetY: number): Formation {
    return {
      id: `siege-${Math.random()}`,
      type: 'siege',
      unitCount: units,
      centerX: targetX,
      centerY: targetY,
      strength: 0.6,
      cohesion: 0.7,
    };
  }

  updateFormationPosition(formation: Formation, newX: number, newY: number): Formation {
    return {
      ...formation,
      centerX: newX,
      centerY: newY,
    };
  }

  mergeFormations(formations: readonly Formation[]): Formation {
    const totalUnits = formations.reduce((sum, f) => sum + f.unitCount, 0);
    const avgX = formations.reduce((sum, f) => sum + f.centerX, 0) / formations.length;
    const avgY = formations.reduce((sum, f) => sum + f.centerY, 0) / formations.length;
    const avgCohesion = formations.reduce((sum, f) => sum + f.cohesion, 0) / formations.length;

    return {
      id: `merged-${Math.random()}`,
      type: 'frontline',
      unitCount: totalUnits,
      centerX: Math.round(avgX),
      centerY: Math.round(avgY),
      strength: 0.7,
      cohesion: Math.max(0.5, avgCohesion - 0.1),
    };
  }

  assessFormationStrength(formation: Formation): number {
    return formation.strength * formation.cohesion * (formation.unitCount / 100);
  }
}
