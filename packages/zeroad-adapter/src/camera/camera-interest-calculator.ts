/**
 * Camera Interest Calculator
 *
 * Analyzes game state to identify interesting locations.
 * Scores locations by strategic importance:
 * - Combat: armies fighting (100)
 * - Expansion: new buildings (80)
 * - Gathering: resource operations (60)
 * - Movement: army movements (50)
 */

export interface CameraInterest {
  readonly x: number;
  readonly z: number;
  readonly score: number;
  readonly reason: 'combat' | 'expansion' | 'gathering' | 'movement';
  readonly timestamp: number;
  readonly unitCount?: number;
}

interface Unit {
  readonly id: string;
  readonly owner: string;
  readonly position: { readonly x: number; readonly z: number };
  readonly health?: number;
}

interface Building {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly position: { readonly x: number; readonly z: number };
}

interface GameState {
  readonly tick: number;
  readonly units: readonly Unit[];
  readonly buildings: readonly Building[];
  readonly players: Array<{ readonly id: string; readonly name: string }>;
}

export class CameraInterestCalculator {
  private lastInterests: Map<string, CameraInterest> = new Map();
  private lastBuildingIds: Set<string> = new Set();
  private readonly decayRate = 0.95; // Interests fade over time
  private readonly timeDecayMs = 500; // Degrade interests older than 500ms

  /**
   * Calculate all interests in current game state
   */
  calculateInterests(
    currentState: GameState,
    previousState?: GameState
  ): CameraInterest[] {
    const interests: Map<string, CameraInterest> = new Map();

    // Detect combat zones
    this.detectCombat(currentState).forEach((interest) => {
      interests.set(this.positionKey(interest.x, interest.z), interest);
    });

    // Detect expansions (new buildings)
    if (previousState) {
      this.detectExpansions(currentState, previousState).forEach((interest) => {
        interests.set(this.positionKey(interest.x, interest.z), interest);
      });
    }

    // Detect gathering operations
    this.detectGathering(currentState).forEach((interest) => {
      interests.set(this.positionKey(interest.x, interest.z), interest);
    });

    // Detect army movements
    if (previousState) {
      this.detectMovement(currentState, previousState).forEach((interest) => {
        interests.set(this.positionKey(interest.x, interest.z), interest);
      });
    }

    // Apply time decay to previous interests
    this.applyTimeDecay(interests, currentState.tick);

    this.lastInterests = interests;
    return Array.from(interests.values());
  }

  /**
   * Get top N most interesting locations
   */
  getTopInterests(state: GameState, count: number = 3): CameraInterest[] {
    const interests = this.calculateInterests(state);
    return interests.sort((a, b) => b.score - a.score).slice(0, count);
  }

  /**
   * Get best single interest (highest score)
   */
  getBestInterest(state: GameState): CameraInterest | null {
    const interests = this.getTopInterests(state, 1);
    return interests.length > 0 ? interests[0] : null;
  }

  private detectCombat(state: GameState): CameraInterest[] {
    const interests: CameraInterest[] = [];
    const combatZones: Map<string, Unit[]> = new Map();
    const combatDistance = 100; // pixels

    // Group units by proximity
    for (const unit of state.units) {
      let foundZone = false;

      for (const [key, units] of combatZones) {
        for (const otherUnit of units) {
          if (
            this.distance(unit.position, otherUnit.position) < combatDistance &&
            unit.owner !== otherUnit.owner
          ) {
            units.push(unit);
            foundZone = true;
            break;
          }
        }
        if (foundZone) break;
      }

      if (!foundZone) {
        combatZones.set(this.positionKey(unit.position.x, unit.position.z), [unit]);
      }
    }

    // Score combat zones with multiple units from different owners
    for (const [, units] of combatZones) {
      const owners = new Set(units.map((u) => u.owner));
      if (owners.size >= 2 && units.length >= 2) {
        const avgPos = this.averagePosition(units);
        interests.push({
          x: avgPos.x,
          z: avgPos.z,
          score: Math.min(100, 70 + owners.size * 10),
          reason: 'combat',
          timestamp: Date.now(),
          unitCount: units.length,
        });
      }
    }

    return interests;
  }

  private detectExpansions(currentState: GameState, previousState: GameState): CameraInterest[] {
    const interests: CameraInterest[] = [];

    const previousIds = new Set(previousState.buildings.map((b) => b.id));
    const newBuildings = currentState.buildings.filter((b) => !previousIds.has(b.id));

    this.lastBuildingIds = new Set(currentState.buildings.map((b) => b.id));

    for (const building of newBuildings) {
      interests.push({
        x: building.position.x,
        z: building.position.z,
        score: 80,
        reason: 'expansion',
        timestamp: Date.now(),
        unitCount: 1,
      });
    }

    return interests;
  }

  private detectGathering(state: GameState): CameraInterest[] {
    const interests: CameraInterest[] = [];
    const gatherDistance = 50; // pixels
    const minUnits = 3; // Need at least 3 units to count as gathering

    const unitClusters: Map<string, Unit[]> = new Map();

    for (const unit of state.units) {
      let foundCluster = false;

      for (const [, clusterUnits] of unitClusters) {
        for (const other of clusterUnits) {
          if (
            unit.owner === other.owner &&
            this.distance(unit.position, other.position) < gatherDistance
          ) {
            clusterUnits.push(unit);
            foundCluster = true;
            break;
          }
        }
        if (foundCluster) break;
      }

      if (!foundCluster) {
        unitClusters.set(this.positionKey(unit.position.x, unit.position.z), [unit]);
      }
    }

    for (const [, units] of unitClusters) {
      if (units.length >= minUnits) {
        const avgPos = this.averagePosition(units);
        interests.push({
          x: avgPos.x,
          z: avgPos.z,
          score: 60,
          reason: 'gathering',
          timestamp: Date.now(),
          unitCount: units.length,
        });
      }
    }

    return interests;
  }

  private detectMovement(currentState: GameState, previousState: GameState): CameraInterest[] {
    const interests: CameraInterest[] = [];
    const movementThreshold = 30; // pixels
    const minUnits = 4; // Large group

    const positionMap = new Map<string, Unit>();
    for (const unit of currentState.units) {
      positionMap.set(unit.id, unit);
    }

    const movingUnits: Unit[] = [];
    for (const oldUnit of previousState.units) {
      const newUnit = positionMap.get(oldUnit.id);
      if (newUnit && this.distance(oldUnit.position, newUnit.position) > movementThreshold) {
        movingUnits.push(newUnit);
      }
    }

    // Group moving units and score if large enough
    const movementClusters: Map<string, Unit[]> = new Map();
    for (const unit of movingUnits) {
      let foundCluster = false;

      for (const [, clusterUnits] of movementClusters) {
        for (const other of clusterUnits) {
          if (
            unit.owner === other.owner &&
            this.distance(unit.position, other.position) < 100
          ) {
            clusterUnits.push(unit);
            foundCluster = true;
            break;
          }
        }
        if (foundCluster) break;
      }

      if (!foundCluster) {
        movementClusters.set(this.positionKey(unit.position.x, unit.position.z), [unit]);
      }
    }

    for (const [, units] of movementClusters) {
      if (units.length >= minUnits) {
        const avgPos = this.averagePosition(units);
        interests.push({
          x: avgPos.x,
          z: avgPos.z,
          score: 50,
          reason: 'movement',
          timestamp: Date.now(),
          unitCount: units.length,
        });
      }
    }

    return interests;
  }

  private applyTimeDecay(interests: Map<string, CameraInterest>, currentTick: number): void {
    // Apply decay to interests from previous calculation
    for (const [key, oldInterest] of this.lastInterests) {
      const age = Date.now() - oldInterest.timestamp;
      if (age < this.timeDecayMs && !interests.has(key)) {
        const decayedScore = oldInterest.score * this.decayRate;
        if (decayedScore > 10) {
          // Keep if still significant
          interests.set(key, {
            ...oldInterest,
            score: decayedScore,
          });
        }
      }
    }
  }

  private distance(a: { readonly x: number; readonly z: number }, b: { readonly x: number; readonly z: number }): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private averagePosition(
    units: readonly Unit[]
  ): { x: number; z: number } {
    let x = 0;
    let z = 0;
    for (const unit of units) {
      x += unit.position.x;
      z += unit.position.z;
    }
    return {
      x: x / units.length,
      z: z / units.length,
    };
  }

  private positionKey(x: number, z: number): string {
    return `${Math.round(x)},${Math.round(z)}`;
  }
}
