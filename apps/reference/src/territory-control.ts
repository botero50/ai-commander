import type { WorldState } from '@ai-commander/domain';

export interface TerritoryControl {
  readonly tick: number;
  readonly strategicRegions: readonly StrategicRegion[];
  readonly protectionTargets: readonly ProtectionTarget[];
  readonly contentionTargets: readonly ContentionTarget[];
  readonly expansionPriority: readonly ExpansionPriority[];
  readonly decisions: readonly TerritoryDecision[];
}

export interface StrategicRegion {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly controlledBy: 'friendly' | 'enemy' | 'neutral';
  readonly strategicValue: number;
  readonly defenseRequirement: number;
}

export interface ProtectionTarget {
  readonly regionId: string;
  readonly priority: number;
  readonly threatLevel: number;
  readonly requiredForces: number;
}

export interface ContentionTarget {
  readonly regionId: string;
  readonly priority: number;
  readonly difficulty: number;
  readonly requiredForces: number;
}

export interface ExpansionPriority {
  readonly regionId: string;
  readonly viability: number;
  readonly riskLevel: number;
  readonly resources: number;
}

export interface TerritoryDecision {
  readonly tick: number;
  readonly regionId: string;
  readonly action: 'protect' | 'attack' | 'expand' | 'hold';
  readonly reasoning: string;
}

export class TerritoryController {
  analyzeTerritory(tick: number, world: WorldState): TerritoryControl {
    const strategicRegions = this.identifyStrategicRegions(world);
    const protectionTargets = this.identifyProtectionTargets(strategicRegions);
    const contentionTargets = this.identifyContentionTargets(strategicRegions);
    const expansionPriority = this.prioritizeExpansions(strategicRegions);
    const decisions = this.makeDecisions(tick, strategicRegions, protectionTargets, contentionTargets, expansionPriority);

    return {
      tick,
      strategicRegions,
      protectionTargets,
      contentionTargets,
      expansionPriority,
      decisions,
    };
  }

  private identifyStrategicRegions(world: WorldState): readonly StrategicRegion[] {
    const regions: StrategicRegion[] = [];

    for (let i = 0; i < 6; i++) {
      const x = Math.floor((i % 3) * 16);
      const y = Math.floor((i / 3) * 25);
      const hash = x + y;

      let controlledBy: 'friendly' | 'enemy' | 'neutral' = 'neutral';
      if (hash % 3 === 0) controlledBy = 'friendly';
      else if (hash % 3 === 1) controlledBy = 'enemy';

      regions.push({
        id: `region-${i}`,
        x,
        y,
        controlledBy,
        strategicValue: 0.4 + (hash % 60) / 100,
        defenseRequirement: 0.2 + (hash % 40) / 100,
      });
    }

    return regions;
  }

  private identifyProtectionTargets(
    strategicRegions: readonly StrategicRegion[]
  ): readonly ProtectionTarget[] {
    const targets: ProtectionTarget[] = [];

    for (const region of strategicRegions) {
      if (region.controlledBy === 'friendly') {
        const threatLevel = Math.min(1, region.defenseRequirement);
        targets.push({
          regionId: region.id,
          priority: region.strategicValue * (1 - region.defenseRequirement),
          threatLevel,
          requiredForces: Math.ceil(region.defenseRequirement * 10),
        });
      }
    }

    return targets.sort((a, b) => b.priority - a.priority);
  }

  private identifyContentionTargets(
    strategicRegions: readonly StrategicRegion[]
  ): readonly ContentionTarget[] {
    const targets: ContentionTarget[] = [];

    for (const region of strategicRegions) {
      if (region.controlledBy === 'enemy') {
        targets.push({
          regionId: region.id,
          priority: region.strategicValue,
          difficulty: region.defenseRequirement,
          requiredForces: Math.ceil((region.defenseRequirement + 0.3) * 10),
        });
      }
    }

    return targets.sort((a, b) => b.priority - a.priority);
  }

  private prioritizeExpansions(
    strategicRegions: readonly StrategicRegion[]
  ): readonly ExpansionPriority[] {
    const targets: ExpansionPriority[] = [];

    for (const region of strategicRegions) {
      if (region.controlledBy === 'neutral') {
        targets.push({
          regionId: region.id,
          viability: region.strategicValue * (1 - region.defenseRequirement * 0.5),
          riskLevel: region.defenseRequirement,
          resources: Math.floor(region.strategicValue * 20),
        });
      }
    }

    return targets.sort((a, b) => b.viability - a.viability);
  }

  private makeDecisions(
    tick: number,
    strategicRegions: readonly StrategicRegion[],
    protectionTargets: readonly ProtectionTarget[],
    contentionTargets: readonly ContentionTarget[],
    expansionPriority: readonly ExpansionPriority[]
  ): readonly TerritoryDecision[] {
    const decisions: TerritoryDecision[] = [];

    if (protectionTargets.length > 0 && protectionTargets[0].threatLevel > 0.5) {
      decisions.push({
        tick,
        regionId: protectionTargets[0].regionId,
        action: 'protect',
        reasoning: `High threat level (${(protectionTargets[0].threatLevel * 100).toFixed(0)}%)`,
      });
    }

    if (contentionTargets.length > 0 && contentionTargets[0].priority > 0.6) {
      decisions.push({
        tick,
        regionId: contentionTargets[0].regionId,
        action: 'attack',
        reasoning: `High strategic value (${(contentionTargets[0].priority * 100).toFixed(0)}%)`,
      });
    }

    if (expansionPriority.length > 0 && expansionPriority[0].viability > 0.5) {
      decisions.push({
        tick,
        regionId: expansionPriority[0].regionId,
        action: 'expand',
        reasoning: `Viable expansion (${(expansionPriority[0].viability * 100).toFixed(0)}%)`,
      });
    }

    for (const region of strategicRegions) {
      const isProtected = decisions.some((d) => d.regionId === region.id);
      const isContested = decisions.some((d) => d.regionId === region.id);
      if (!isProtected && !isContested && region.controlledBy === 'friendly') {
        decisions.push({
          tick,
          regionId: region.id,
          action: 'hold',
          reasoning: 'Maintain current position',
        });
      }
    }

    return decisions;
  }
}
