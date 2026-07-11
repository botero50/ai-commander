/**
 * Dramatic Moment Detector
 *
 * Identifies important gameplay events that warrant cinematic response:
 * - Unit eliminations (kill events)
 * - Building destructions
 * - Victory conditions
 * - Large army engagements
 * - Major expansions
 * - Player eliminations
 */

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

export type DramaticMomentType =
  | 'unit_eliminated'
  | 'building_destroyed'
  | 'player_eliminated'
  | 'large_engagement'
  | 'major_expansion'
  | 'victory'
  | 'defeat';

export interface DramaticMoment {
  readonly type: DramaticMomentType;
  readonly position: { readonly x: number; readonly z: number };
  readonly severity: number; // 0-100, how dramatic
  readonly description: string;
  readonly players: readonly string[]; // Players involved
  readonly tick: number;
}

export class DramaticMomentDetector {
  private previousState: Map<string, Unit> = new Map();
  private previousBuildings: Map<string, Building> = new Map();
  private playerUnitCounts: Map<string, number> = new Map();

  /**
   * Analyze game state for dramatic moments
   */
  detectDramaticMoments(currentState: GameState, previousState?: GameState): readonly DramaticMoment[] {
    const moments: DramaticMoment[] = [];

    if (!previousState) {
      this.indexState(currentState);
      return moments;
    }

    // Detect unit eliminations
    moments.push(...this.detectUnitEliminations(currentState, previousState));

    // Detect building destructions
    moments.push(...this.detectBuildingDestructions(currentState, previousState));

    // Detect player eliminations
    moments.push(...this.detectPlayerEliminations(currentState, previousState));

    // Detect large engagements
    moments.push(...this.detectLargeEngagements(currentState));

    // Detect major expansions
    moments.push(...this.detectMajorExpansions(currentState, previousState));

    // Update indexed state
    this.indexState(currentState);

    return moments;
  }

  /**
   * Detect unit eliminations (units that were alive, now dead)
   */
  private detectUnitEliminations(
    currentState: GameState,
    previousState: GameState
  ): DramaticMoment[] {
    const moments: DramaticMoment[] = [];
    const currentUnitIds = new Set(currentState.units.map((u) => u.id));

    for (const prevUnit of previousState.units) {
      if (!currentUnitIds.has(prevUnit.id)) {
        // Unit was eliminated
        moments.push({
          type: 'unit_eliminated',
          position: prevUnit.position,
          severity: 40, // Moderate severity
          description: `Unit eliminated at (${Math.round(prevUnit.position.x)}, ${Math.round(prevUnit.position.z)})`,
          players: [prevUnit.owner],
          tick: currentState.tick,
        });
      }
    }

    return moments;
  }

  /**
   * Detect building destructions
   */
  private detectBuildingDestructions(
    currentState: GameState,
    previousState: GameState
  ): DramaticMoment[] {
    const moments: DramaticMoment[] = [];
    const currentBuildingIds = new Set(currentState.buildings.map((b) => b.id));

    for (const prevBuilding of previousState.buildings) {
      if (!currentBuildingIds.has(prevBuilding.id)) {
        // Building was destroyed
        const severity = prevBuilding.type === 'base' ? 90 : 60;

        moments.push({
          type: 'building_destroyed',
          position: prevBuilding.position,
          severity,
          description: `${prevBuilding.type} destroyed`,
          players: [prevBuilding.owner],
          tick: currentState.tick,
        });
      }
    }

    return moments;
  }

  /**
   * Detect player eliminations (all units and buildings gone)
   */
  private detectPlayerEliminations(
    currentState: GameState,
    previousState: GameState
  ): DramaticMoment[] {
    const moments: DramaticMoment[] = [];

    // Count units per player in both states
    const prevPlayerUnits = this.countUnitsPerPlayer(previousState);
    const currPlayerUnits = this.countUnitsPerPlayer(currentState);

    for (const [playerId, prevCount] of prevPlayerUnits) {
      const currCount = currPlayerUnits.get(playerId) ?? 0;

      // Player had units before, has none now
      if (prevCount > 0 && currCount === 0) {
        // Check if they also lost all buildings
        const prevBuildings = previousState.buildings.filter((b) => b.owner === playerId);
        const currBuildings = currentState.buildings.filter((b) => b.owner === playerId);

        if (prevBuildings.length > 0 && currBuildings.length === 0) {
          // Player is completely eliminated
          const player = previousState.players.find((p) => p.id === playerId);
          const playerName = player?.name ?? playerId;

          moments.push({
            type: 'player_eliminated',
            position: { x: 256, z: 256 }, // Map center (default)
            severity: 100,
            description: `${playerName} has been eliminated!`,
            players: [playerId],
            tick: currentState.tick,
          });
        }
      }
    }

    return moments;
  }

  /**
   * Detect large engagements (many units from different players in proximity)
   */
  private detectLargeEngagements(state: GameState): DramaticMoment[] {
    const moments: DramaticMoment[] = [];
    const engagementDistance = 200; // Larger proximity threshold
    const minUnitsTotal = 4; // Minimum total units to count as engagement (lowered from 6)

    // Group units by proximity
    const clusters: Map<string, Unit[]> = new Map();
    const processed = new Set<string>();

    for (const unit of state.units) {
      const unitKey = unit.id;
      if (processed.has(unitKey)) continue;

      const cluster: Unit[] = [unit];
      processed.add(unitKey);

      // Find all nearby units
      for (const other of state.units) {
        if (processed.has(other.id)) continue;

        const dist = Math.hypot(unit.position.x - other.position.x, unit.position.z - other.position.z);
        if (dist < engagementDistance) {
          cluster.push(other);
          processed.add(other.id);
        }
      }

      // Check if cluster has units from multiple players
      if (cluster.length >= minUnitsTotal) {
        const owners = new Set(cluster.map((u) => u.owner));

        if (owners.size >= 2) {
          const avgPos = {
            x: cluster.reduce((sum, u) => sum + u.position.x, 0) / cluster.length,
            z: cluster.reduce((sum, u) => sum + u.position.z, 0) / cluster.length,
          };

          moments.push({
            type: 'large_engagement',
            position: avgPos,
            severity: Math.min(100, 60 + cluster.length * 2),
            description: `Battle with ${cluster.length} units from ${owners.size} players`,
            players: Array.from(owners),
            tick: state.tick,
          });
        }
      }
    }

    return moments;
  }

  /**
   * Detect major expansions (new buildings)
   */
  private detectMajorExpansions(
    currentState: GameState,
    previousState: GameState
  ): DramaticMoment[] {
    const moments: DramaticMoment[] = [];
    const previousIds = new Set(previousState.buildings.map((b) => b.id));

    const newBuildings = currentState.buildings.filter((b) => !previousIds.has(b.id));

    // Check for strategic buildings
    const strategicTypes = ['fortress', 'temple', 'wonder'];

    for (const building of newBuildings) {
      const isStrategic = strategicTypes.includes(building.type);
      const severity = isStrategic ? 75 : 50;

      moments.push({
        type: 'major_expansion',
        position: building.position,
        severity,
        description: `New ${building.type} constructed`,
        players: [building.owner],
        tick: currentState.tick,
      });
    }

    return moments;
  }

  /**
   * Count units per player
   */
  private countUnitsPerPlayer(state: GameState): Map<string, number> {
    const counts = new Map<string, number>();

    for (const unit of state.units) {
      const current = counts.get(unit.owner) ?? 0;
      counts.set(unit.owner, current + 1);
    }

    return counts;
  }

  /**
   * Index current state for future comparison
   */
  private indexState(state: GameState): void {
    this.previousState.clear();
    for (const unit of state.units) {
      this.previousState.set(unit.id, unit);
    }

    this.previousBuildings.clear();
    for (const building of state.buildings) {
      this.previousBuildings.set(building.id, building);
    }
  }
}
