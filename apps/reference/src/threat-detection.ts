import type { WorldState } from '@ai-commander/domain';

export interface EnemyUnit {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly unitType: string;
}

export interface EnemyStructure {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly structureType: string;
}

export interface Threat {
  readonly id: string;
  readonly position: { x: number; y: number };
  readonly threatType: 'unit' | 'structure';
  readonly subType: string;
  readonly priority: number;
  readonly distance: number;
  readonly reason: string;
}

export interface ThreatModel {
  readonly activeThreatCount: number;
  readonly highestPriority: number;
  readonly threats: readonly Threat[];
}

/**
 * ThreatDetection: Observes battlefield and maintains threat model.
 *
 * Decision factors:
 * 1. Proximity to friendly structures
 * 2. Proximity to friendly units
 * 3. Enemy unit type (military > economy)
 * 4. Distance to nearest friendly asset
 */
export class ThreatDetection {
  private readonly criticalDistance = 10;
  private readonly warningDistance = 20;
  private readonly watchDistance = 40;
  private lastKnownThreats: Map<string, Threat> = new Map();

  /**
   * Observe enemy units from world state.
   */
  observeEnemyUnits(worldState: WorldState): EnemyUnit[] {
    if (!worldState) return [];

    const agents = worldState.agents as any[];
    if (!Array.isArray(agents)) return [];

    return agents
      .filter((a: any) => a.customData?.isEnemy === true)
      .map((a: any) => ({
        id: a.id,
        position: {
          x: a.customData?.position?.x ?? a.position?.x ?? 0,
          y: a.customData?.position?.y ?? a.position?.y ?? 0,
        },
        unitType: a.customData?.unitType ?? 'unit',
      }))
      .filter((u): u is EnemyUnit => !!(u.id && u.position));
  }

  /**
   * Observe enemy structures from world state.
   */
  observeEnemyStructures(worldState: WorldState): EnemyStructure[] {
    if (!worldState || !worldState.customData) return [];

    const buildings = (worldState.customData as any).buildings as any[];
    if (!Array.isArray(buildings)) return [];

    return buildings
      .filter((b: any) => b.customData?.isEnemy === true)
      .map((b: any) => ({
        id: b.id,
        position: this.extractPosition(b),
        structureType: b.customData?.type ?? 'structure',
      }))
      .filter((b): b is EnemyStructure => b.id && b.position !== null);
  }

  /**
   * Observe friendly assets for threat assessment.
   */
  observeFriendlyAssets(worldState: WorldState): Array<{ position: { x: number; y: number } }> {
    if (!worldState) return [];

    const assets: Array<{ position: { x: number; y: number } }> = [];

    // Military units
    const agents = worldState.agents as any[];
    if (Array.isArray(agents)) {
      agents
        .filter((a: any) => a.customData?.isMilitary === true)
        .forEach((a: any) => {
          const pos = {
            x: a.customData?.position?.x ?? a.position?.x ?? 0,
            y: a.customData?.position?.y ?? a.position?.y ?? 0,
          };
          if (pos.x > 0 || pos.y > 0) assets.push({ position: pos });
        });
    }

    // Structures
    if (worldState.customData) {
      const buildings = (worldState.customData as any).buildings as any[];
      if (Array.isArray(buildings)) {
        buildings
          .filter((b: any) => b.customData?.isEnemy !== true)
          .forEach((b: any) => {
            const pos = this.extractPosition(b);
            if (pos) assets.push({ position: pos });
          });
      }
    }

    return assets;
  }

  /**
   * Classify threat with priority.
   */
  classifyThreat(
    threatId: string,
    threatType: 'unit' | 'structure',
    subType: string,
    position: { x: number; y: number },
    distance: number
  ): Threat {
    let priority = 0;
    let reason = '';

    if (threatType === 'unit') {
      // Military units are highest threat
      priority = 0.8;
      reason = `military_unit_${distance}`;
    } else {
      // Structures are lower threat
      priority = 0.4;
      reason = `structure_${distance}`;
    }

    // Distance adjustment
    if (distance <= this.criticalDistance) {
      priority = Math.min(1, priority + 0.2);
      reason = `critical_${reason}`;
    } else if (distance <= this.warningDistance) {
      priority = Math.min(1, priority + 0.1);
      reason = `warning_${reason}`;
    } else if (distance > this.watchDistance) {
      priority = Math.max(0.1, priority - 0.2);
      reason = `watch_${reason}`;
    }

    return {
      id: threatId,
      position,
      threatType,
      subType,
      priority,
      distance,
      reason,
    };
  }

  /**
   * Build complete threat model.
   */
  buildThreatModel(
    enemyUnits: EnemyUnit[],
    enemyStructures: EnemyStructure[],
    friendlyAssets: Array<{ position: { x: number; y: number } }>
  ): ThreatModel {
    const threats: Threat[] = [];

    // Classify enemy units
    for (const unit of enemyUnits) {
      const minDistance = friendlyAssets.length > 0
        ? Math.min(...friendlyAssets.map(a => this.distance(unit.position, a.position)))
        : 999;

      threats.push(
        this.classifyThreat(unit.id, 'unit', unit.unitType, unit.position, minDistance)
      );
    }

    // Classify enemy structures
    for (const structure of enemyStructures) {
      const minDistance = friendlyAssets.length > 0
        ? Math.min(...friendlyAssets.map(a => this.distance(structure.position, a.position)))
        : 999;

      threats.push(
        this.classifyThreat(structure.id, 'structure', structure.structureType, structure.position, minDistance)
      );
    }

    // Sort by priority descending
    threats.sort((a, b) => b.priority - a.priority);

    const highestPriority = threats.length > 0 ? threats[0].priority : 0;

    return {
      activeThreatCount: threats.length,
      highestPriority,
      threats: Object.freeze([...threats]),
    };
  }

  /**
   * Detect newly discovered threats.
   */
  getNewThreats(currentModel: ThreatModel): Threat[] {
    const newThreats: Threat[] = [];

    for (const threat of currentModel.threats) {
      if (!this.lastKnownThreats.has(threat.id)) {
        newThreats.push(threat);
      }
    }

    return newThreats;
  }

  /**
   * Detect threats that disappeared.
   */
  getResolvedThreats(currentModel: ThreatModel): string[] {
    const resolved: string[] = [];
    const currentIds = new Set(currentModel.threats.map(t => t.id));

    for (const [id] of this.lastKnownThreats) {
      if (!currentIds.has(id)) {
        resolved.push(id);
      }
    }

    return resolved;
  }

  /**
   * Update threat model state.
   */
  updateThreatState(threatModel: ThreatModel): void {
    this.lastKnownThreats.clear();
    for (const threat of threatModel.threats) {
      this.lastKnownThreats.set(threat.id, threat);
    }
  }

  /**
   * Calculate Manhattan distance.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  /**
   * Extract position from building.
   */
  private extractPosition(building: any): { x: number; y: number } | null {
    try {
      const posStr = building.customData?.position as string;
      if (!posStr) return null;

      const match = posStr.match(/^(\d+),(\d+)$/);
      if (match && match[1] && match[2]) {
        return {
          x: parseInt(match[1], 10),
          y: parseInt(match[2], 10),
        };
      }

      return null;
    } catch {
      return null;
    }
  }
}
