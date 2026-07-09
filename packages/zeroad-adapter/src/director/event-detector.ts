/**
 * Event Detection Engine
 * Detects interesting moments in real-time gameplay for directing and commentary
 */

import { GameState, Unit, Building, Player } from '../state/state-types.js';

export type DetectedEventType =
  | 'army_collision'
  | 'first_scout'
  | 'expansion'
  | 'technology_complete'
  | 'base_attack'
  | 'large_battle'
  | 'wonder_construction'
  | 'player_elimination'
  | 'victory_push'
  | 'resource_spike'
  | 'military_advantage'
  | 'population_threshold'
  | 'unit_loss'
  | 'building_destruction'
  | 'cavalry_arrival'
  | 'siege_initiated';

export interface DetectedEvent {
  type: DetectedEventType;
  timestamp: number;
  tick: number;
  severity: 'low' | 'medium' | 'high' | 'critical'; // importance for directing
  playerId?: 1 | 2;
  position?: { x: number; z: number };
  title: string;
  description: string;
  data: Record<string, unknown>;
}

interface PlayerSnapshot {
  resources: Record<string, number>;
  populationUsed: number;
  populationMax: number;
  unitCount: number;
  militaryValue: number;
  buildingCount: number;
  discoveredUnits: number[];
}

interface GameSnapshot {
  tick: number;
  timestamp: number;
  player1: PlayerSnapshot;
  player2: PlayerSnapshot;
  engagements: number; // active combat zones
}

/**
 * Detects interesting gameplay events from state transitions
 */
export class EventDetector {
  private previousSnapshot: GameSnapshot | null = null;
  private eventHistory: DetectedEvent[] = [];
  private lastScoutTime: Record<number, number> = { 1: 0, 2: 0 };
  private baseLocations: Record<number, { x: number; z: number }[]> = { 1: [], 2: [] };
  private militaryThresholdReached: Record<number, boolean> = { 1: false, 2: false };
  private wonderConstructing: Record<number, boolean> = { 1: false, 2: false };

  // Configuration
  private readonly ARMY_COLLISION_DISTANCE = 15; // units
  private readonly LARGE_BATTLE_UNIT_COUNT = 12; // units in collision
  private readonly RESOURCE_SPIKE_THRESHOLD = 100; // resource change
  private readonly MILITARY_VALUE_THRESHOLD = 500; // total unit value
  private readonly BASE_DISTANCE_THRESHOLD = 50; // for expansion detection

  /**
   * Analyze game state and detect events
   */
  detect(currentState: GameState): DetectedEvent[] {
    const newEvents: DetectedEvent[] = [];

    // Build snapshot
    const snapshot = this.buildSnapshot(currentState);

    // If first update, just save snapshot
    if (!this.previousSnapshot) {
      this.previousSnapshot = snapshot;
      return [];
    }

    // Detect all event types
    newEvents.push(...this.detectCollisions(currentState));
    newEvents.push(...this.detectScouts(currentState));
    newEvents.push(...this.detectExpansion(currentState));
    newEvents.push(...this.detectTechnology(currentState));
    newEvents.push(...this.detectBaseAttacks(currentState));
    newEvents.push(...this.detectLargeBattles(currentState));
    newEvents.push(...this.detectWonderConstruction(currentState));
    newEvents.push(...this.detectPlayerElimination(snapshot));
    newEvents.push(...this.detectVictoryPush(currentState, snapshot));
    newEvents.push(...this.detectResourceSpikes(snapshot));
    newEvents.push(...this.detectMilitaryAdvantage(snapshot));
    newEvents.push(...this.detectUnitLoss(currentState));
    newEvents.push(...this.detectCavalryArrival(currentState));
    newEvents.push(...this.detectSiegeInitiated(currentState));

    // Update state
    this.previousSnapshot = snapshot;
    this.eventHistory.push(...newEvents);

    // Keep last 1000 events
    if (this.eventHistory.length > 1000) {
      this.eventHistory = this.eventHistory.slice(-1000);
    }

    return newEvents;
  }

  /**
   * Detect army collisions (two armies meeting)
   */
  private detectCollisions(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    // Find military units for each player
    const player1Units = state.units.filter((u) => u.owner === 1 && this.isMilitaryUnit(u));
    const player2Units = state.units.filter((u) => u.owner === 2 && this.isMilitaryUnit(u));

    // Check for collisions
    for (const u1 of player1Units) {
      for (const u2 of player2Units) {
        const distance = this.getDistance(u1.position, u2.position);

        if (distance < this.ARMY_COLLISION_DISTANCE) {
          events.push({
            type: 'army_collision',
            timestamp: state.timestamp,
            tick: state.tick,
            severity: 'high',
            playerId: 1, // event for player 1
            position: this.getAveragePosition([u1.position, u2.position]),
            title: 'Armies Colliding',
            description: `Army engagement detected between ${player1Units.length} and ${player2Units.length} units`,
            data: {
              player1Units: player1Units.length,
              player2Units: player2Units.length,
              distance,
            },
          });

          return events; // Only report once per detection
        }
      }
    }

    return events;
  }

  /**
   * Detect first scout (unit moving far from base)
   */
  private detectScouts(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const player = state.players[playerId - 1];
      const units = state.units.filter((u) => u.owner === playerId);

      // Update base locations
      if (this.baseLocations[playerId].length === 0) {
        const townHalls = units.filter((u) => u.type === 'Town Hall' || u.type === 'Civic Centre');
        if (townHalls.length > 0) {
          this.baseLocations[playerId] = [townHalls[0].position];
        }
      }

      if (this.baseLocations[playerId].length === 0) continue;

      const basePos = this.baseLocations[playerId][0];

      // Check for scouts far from base
      for (const unit of units) {
        const distance = this.getDistance(unit.position, basePos);

        if (distance > this.BASE_DISTANCE_THRESHOLD && state.tick - this.lastScoutTime[playerId] > 100) {
          // Scout moving far from base
          if (this.isScoutUnit(unit)) {
            events.push({
              type: 'first_scout',
              timestamp: state.timestamp,
              tick: state.tick,
              severity: 'medium',
              playerId,
              position: unit.position,
              title: `${this.getPlayerName(playerId)} Sends Scout`,
              description: `Scout moving ${Math.round(distance)} units from base`,
              data: { unitType: unit.type, distance: Math.round(distance) },
            });

            this.lastScoutTime[playerId] = state.tick;
            break;
          }
        }
      }
    }

    return events;
  }

  /**
   * Detect expansion (new base founded)
   */
  private detectExpansion(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const civCentres = state.units.filter(
        (u) =>
          u.owner === playerId &&
          (u.type === 'Town Hall' || u.type === 'Civic Centre' || u.type === 'Capital')
      );

      if (civCentres.length > this.baseLocations[playerId].length) {
        const newBase = civCentres[civCentres.length - 1];

        events.push({
          type: 'expansion',
          timestamp: state.timestamp,
          tick: state.tick,
          severity: 'high',
          playerId,
          position: newBase.position,
          title: `${this.getPlayerName(playerId)} Expands`,
          description: `New settlement established`,
          data: {
            newBaseCount: civCentres.length,
            position: newBase.position,
          },
        });

        this.baseLocations[playerId].push(newBase.position);
      }
    }

    return events;
  }

  /**
   * Detect technology completion (significant unit type appears)
   */
  private detectTechnology(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];
    const advancedUnitTypes = ['War Elephant', 'Cataphract', 'Cavalry', 'Crossbowman', 'Champion', 'Siege Tower', 'Ram'];

    for (const playerId of [1, 2] as const) {
      const units = state.units.filter((u) => u.owner === playerId);

      for (const unitType of advancedUnitTypes) {
        if (units.some((u) => u.type.includes(unitType))) {
          const key = `tech_${playerId}_${unitType}`;

          if (!this.previousSnapshot || !this.didHaveUnitType(unitType, playerId)) {
            const unit = units.find((u) => u.type.includes(unitType));

            events.push({
              type: 'technology_complete',
              timestamp: state.timestamp,
              tick: state.tick,
              severity: 'high',
              playerId,
              position: unit?.position,
              title: `${this.getPlayerName(playerId)} Unlocks ${unitType}`,
              description: `Advanced military unit type now available`,
              data: { unitType },
            });

            // Mark as detected
            break;
          }
        }
      }
    }

    return events;
  }

  /**
   * Detect base under attack
   */
  private detectBaseAttacks(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const defenderBuildings = state.buildings.filter((b) => b.owner === playerId);
      const enemyUnits = state.units.filter((u) => u.owner === 3 - playerId && this.isMilitaryUnit(u));

      for (const building of defenderBuildings) {
        // Check if damaged and enemy nearby
        if (building.health < building.maxHealth * 0.9) {
          const nearbyEnemies = enemyUnits.filter(
            (u) => this.getDistance(u.position, building.position) < 20
          );

          if (nearbyEnemies.length > 2) {
            events.push({
              type: 'base_attack',
              timestamp: state.timestamp,
              tick: state.tick,
              severity: 'critical',
              playerId,
              position: building.position,
              title: `${this.getPlayerName(playerId)}'s Base Under Attack!`,
              description: `${nearbyEnemies.length} enemy units attacking structures`,
              data: {
                building: building.type,
                enemyCount: nearbyEnemies.length,
                healthPercent: Math.round((building.health / building.maxHealth) * 100),
              },
            });

            return events; // Report once
          }
        }
      }
    }

    return events;
  }

  /**
   * Detect large battles
   */
  private detectLargeBattles(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    const player1Military = state.units.filter((u) => u.owner === 1 && this.isMilitaryUnit(u));
    const player2Military = state.units.filter((u) => u.owner === 2 && this.isMilitaryUnit(u));

    // Find clusters of combat
    const combatZones = this.findCombatClusters(state);

    for (const zone of combatZones) {
      if (zone.totalUnits >= this.LARGE_BATTLE_UNIT_COUNT) {
        events.push({
          type: 'large_battle',
          timestamp: state.timestamp,
          tick: state.tick,
          severity: 'critical',
          position: zone.center,
          title: 'Large Battle Erupting!',
          description: `${zone.totalUnits} units engaged in combat`,
          data: {
            totalUnits: zone.totalUnits,
            player1Units: zone.player1Count,
            player2Units: zone.player2Count,
          },
        });
      }
    }

    return events;
  }

  /**
   * Detect wonder construction starting
   */
  private detectWonderConstruction(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const buildings = state.buildings.filter((b) => b.owner === playerId);
      const hasWonder = buildings.some((b) => b.type === 'Wonder');

      if (hasWonder && !this.wonderConstructing[playerId]) {
        const wonder = buildings.find((b) => b.type === 'Wonder');

        events.push({
          type: 'wonder_construction',
          timestamp: state.timestamp,
          tick: state.tick,
          severity: 'critical',
          playerId,
          position: wonder?.position,
          title: `${this.getPlayerName(playerId)} Starts Wonder!`,
          description: `Wonder construction in progress - victory push beginning`,
          data: { position: wonder?.position },
        });

        this.wonderConstructing[playerId] = true;
      }
    }

    return events;
  }

  /**
   * Detect player elimination
   */
  private detectPlayerElimination(snapshot: GameSnapshot): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    if (!this.previousSnapshot) return events;

    // Check if player lost all military units and structures
    for (const playerId of [1, 2] as const) {
      const currentData = playerId === 1 ? snapshot.player1 : snapshot.player2;
      const previousData = playerId === 1 ? this.previousSnapshot.player1 : this.previousSnapshot.player2;

      if (previousData.unitCount > 0 && currentData.unitCount === 0 && currentData.buildingCount === 0) {
        const winnerId = (3 - playerId) as 1 | 2;
        events.push({
          type: 'player_elimination',
          timestamp: snapshot.timestamp,
          tick: snapshot.tick,
          severity: 'critical',
          playerId: winnerId,
          title: `${this.getPlayerName(winnerId)} Eliminates ${this.getPlayerName(playerId)}`,
          description: `Victory achieved`,
          data: { winner: winnerId },
        });
      }
    }

    return events;
  }

  /**
   * Detect victory push (massive army moving toward enemy base)
   */
  private detectVictoryPush(state: GameState, snapshot: GameSnapshot): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const militaryUnits = state.units.filter((u) => u.owner === playerId && this.isMilitaryUnit(u));

      if (militaryUnits.length > 25) {
        // Large army exists
        const basePos = this.baseLocations[3 - playerId]?.[0];

        if (basePos) {
          const unitAdvancingCount = militaryUnits.filter(
            (u) => this.getDistance(u.position, basePos) < 60
          ).length;

          if (unitAdvancingCount > militaryUnits.length * 0.6) {
            // Majority moving toward enemy base
            events.push({
              type: 'victory_push',
              timestamp: state.timestamp,
              tick: state.tick,
              severity: 'critical',
              playerId,
              position: basePos,
              title: `${this.getPlayerName(playerId)} Launches Victory Attack!`,
              description: `Massive army converging on enemy base`,
              data: {
                armySize: militaryUnits.length,
                advancingUnits: unitAdvancingCount,
              },
            });
          }
        }
      }
    }

    return events;
  }

  /**
   * Detect resource spikes (significant change)
   */
  private detectResourceSpikes(snapshot: GameSnapshot): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    if (!this.previousSnapshot) return events;

    for (const playerId of [1, 2] as const) {
      const currentData = playerId === 1 ? snapshot.player1 : snapshot.player2;
      const previousData = playerId === 1 ? this.previousSnapshot.player1 : this.previousSnapshot.player2;

      for (const [resource, amount] of Object.entries(currentData.resources)) {
        const previousAmount = previousData.resources[resource] || 0;
        const change = (amount as number) - previousAmount;

        if (change > this.RESOURCE_SPIKE_THRESHOLD) {
          events.push({
            type: 'resource_spike',
            timestamp: snapshot.timestamp,
            tick: snapshot.tick,
            severity: 'medium',
            playerId,
            title: `${this.getPlayerName(playerId)} Gains ${resource}`,
            description: `+${Math.round(change)} ${resource} harvested`,
            data: { resource, amount: Math.round(change) },
          });
        }
      }
    }

    return events;
  }

  /**
   * Detect military advantage shift
   */
  private detectMilitaryAdvantage(snapshot: GameSnapshot): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    if (!this.previousSnapshot) return events;

    for (const playerId of [1, 2] as const) {
      const currentData = playerId === 1 ? snapshot.player1 : snapshot.player2;
      const enemyData = playerId === 1 ? snapshot.player2 : snapshot.player1;

      const currentAdvantage = currentData.militaryValue > enemyData.militaryValue * 1.5;
      const previousData = playerId === 1 ? this.previousSnapshot.player1 : this.previousSnapshot.player2;
      const previousEnemyData = playerId === 1 ? this.previousSnapshot.player2 : this.previousSnapshot.player1;
      const hadAdvantage = previousData.militaryValue > previousEnemyData.militaryValue * 1.5;

      if (currentAdvantage && !hadAdvantage && !this.militaryThresholdReached[playerId]) {
        events.push({
          type: 'military_advantage',
          timestamp: snapshot.timestamp,
          tick: snapshot.tick,
          severity: 'high',
          playerId,
          title: `${this.getPlayerName(playerId)} Gains Military Advantage`,
          description: `Superior military force assembled`,
          data: {
            ourValue: currentData.militaryValue,
            enemyValue: enemyData.militaryValue,
            ratio: (currentData.militaryValue / enemyData.militaryValue).toFixed(2),
          },
        });

        this.militaryThresholdReached[playerId] = true;
      }
    }

    return events;
  }

  /**
   * Detect unit loss (damaged units)
   */
  private detectUnitLoss(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    if (!this.previousSnapshot) return events;

    for (const playerId of [1, 2] as const) {
      const currentUnits = state.units.filter((u) => u.owner === playerId);
      const unitsCriticallyDamaged = currentUnits.filter((u) => u.health < u.maxHealth * 0.2);

      if (unitsCriticallyDamaged.length >= 3) {
        events.push({
          type: 'unit_loss',
          timestamp: state.timestamp,
          tick: state.tick,
          severity: 'medium',
          playerId,
          title: `${this.getPlayerName(playerId)} Units Heavily Damaged`,
          description: `${unitsCriticallyDamaged.length} units taking heavy fire`,
          data: { damagedCount: unitsCriticallyDamaged.length },
        });
      }
    }

    return events;
  }

  /**
   * Detect cavalry arrival (mounted units appearing)
   */
  private detectCavalryArrival(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    const cavalryTypes = ['Cavalry', 'Knight', 'Mounted Archer', 'War Elephant', 'Cataphract'];

    for (const playerId of [1, 2] as const) {
      const cavalry = state.units.filter(
        (u) =>
          u.owner === playerId &&
          cavalryTypes.some((ct) => u.type.includes(ct))
      );

      if (cavalry.length > 0) {
        const hadCavalry = this.previousSnapshot
          ? this.previousSnapshot[playerId === 1 ? 'player1' : 'player2'].discoveredUnits?.includes(cavalry[0].id)
          : false;

        if (!hadCavalry) {
          events.push({
            type: 'cavalry_arrival',
            timestamp: state.timestamp,
            tick: state.tick,
            severity: 'high',
            playerId,
            position: cavalry[0].position,
            title: `${this.getPlayerName(playerId)} Deploys Cavalry!`,
            description: `Mounted units joining the battle`,
            data: { unitType: cavalry[0].type, count: cavalry.length },
          });
        }
      }
    }

    return events;
  }

  /**
   * Detect siege initiated (units attacking buildings)
   */
  private detectSiegeInitiated(state: GameState): DetectedEvent[] {
    const events: DetectedEvent[] = [];

    for (const playerId of [1, 2] as const) {
      const enemyBuildings = state.buildings.filter((b) => b.owner === 3 - playerId);

      for (const building of enemyBuildings) {
        if (building.health < building.maxHealth) {
          const nearbyUnits = state.units.filter(
            (u) =>
              u.owner === playerId &&
              this.isMilitaryUnit(u) &&
              this.getDistance(u.position, building.position) < 15
          );

          if (nearbyUnits.length >= 3) {
            events.push({
              type: 'siege_initiated',
              timestamp: state.timestamp,
              tick: state.tick,
              severity: 'high',
              playerId,
              position: building.position,
              title: `${this.getPlayerName(playerId)} Sieges ${building.type}`,
              description: `${nearbyUnits.length} units attacking fortification`,
              data: {
                building: building.type,
                unitCount: nearbyUnits.length,
                healthPercent: Math.round((building.health / building.maxHealth) * 100),
              },
            });

            return events; // Report first siege
          }
        }
      }
    }

    return events;
  }

  /**
   * Build state snapshot for change detection
   */
  private buildSnapshot(state: GameState): GameSnapshot {
    const createPlayerSnapshot = (playerId: number): PlayerSnapshot => {
      const player = state.players[playerId - 1];
      const units = state.units.filter((u) => u.owner === playerId);
      const buildings = state.buildings.filter((b) => b.owner === playerId);

      const militaryValue = units
        .filter((u) => this.isMilitaryUnit(u))
        .reduce((sum, u) => sum + this.getUnitValue(u), 0);

      return {
        resources: {
          food: player.resources.food,
          wood: player.resources.wood,
          stone: player.resources.stone,
          metal: player.resources.metal,
        },
        populationUsed: player.populationCurrent,
        populationMax: player.populationMax,
        unitCount: units.length,
        militaryValue,
        buildingCount: buildings.length,
        discoveredUnits: units.map((u) => u.id),
      };
    };

    return {
      tick: state.tick,
      timestamp: state.timestamp,
      player1: createPlayerSnapshot(1),
      player2: createPlayerSnapshot(2),
      engagements: this.findCombatClusters(state).length,
    };
  }

  /**
   * Find clusters of combat activity
   */
  private findCombatClusters(state: GameState): Array<{ center: { x: number; z: number }; totalUnits: number; player1Count: number; player2Count: number }> {
    const clusters: Array<{ center: { x: number; z: number }; totalUnits: number; player1Count: number; player2Count: number }> = [];
    const militaryUnits = state.units.filter((u) => this.isMilitaryUnit(u));

    const visited = new Set<number>();

    for (const unit of militaryUnits) {
      if (visited.has(unit.id)) continue;

      const cluster = [unit];
      visited.add(unit.id);

      // Find nearby units
      for (const other of militaryUnits) {
        if (visited.has(other.id)) continue;

        if (this.getDistance(unit.position, other.position) < 30) {
          cluster.push(other);
          visited.add(other.id);
        }
      }

      if (cluster.length >= 3) {
        const avgX = cluster.reduce((sum, u) => sum + u.position.x, 0) / cluster.length;
        const avgZ = cluster.reduce((sum, u) => sum + u.position.z, 0) / cluster.length;

        const player1Count = cluster.filter((u) => u.owner === 1).length;
        const player2Count = cluster.filter((u) => u.owner === 2).length;

        if (player1Count > 0 && player2Count > 0) {
          clusters.push({
            center: { x: avgX, z: avgZ },
            totalUnits: cluster.length,
            player1Count,
            player2Count,
          });
        }
      }
    }

    return clusters;
  }

  /**
   * Check if unit is military
   */
  private isMilitaryUnit(unit: Unit): boolean {
    const militaryKeywords = ['soldier', 'warrior', 'cavalry', 'archer', 'siege', 'cataphract', 'elephant', 'tower'];
    const unitTypeLower = unit.type.toLowerCase();
    return militaryKeywords.some((keyword) => unitTypeLower.includes(keyword));
  }

  /**
   * Check if unit is scout
   */
  private isScoutUnit(unit: Unit): boolean {
    const scoutKeywords = ['scout', 'cavalry scout', 'female', 'merchant'];
    return scoutKeywords.some((keyword) => unit.type.toLowerCase().includes(keyword));
  }

  /**
   * Get value of unit for military calculations
   */
  private getUnitValue(unit: Unit): number {
    const valueMap: Record<string, number> = {
      'Cavalry': 40,
      'War Elephant': 60,
      'Cataphract': 50,
      'Champion': 30,
      'Crossbowman': 15,
      'Archer': 12,
      'Spearman': 10,
      'Sword': 10,
      'Female': 1,
    };

    for (const [type, value] of Object.entries(valueMap)) {
      if (unit.type.includes(type)) {
        return value;
      }
    }

    return 5; // default
  }

  /**
   * Calculate distance between two positions
   */
  private getDistance(pos1: { x: number; z: number }, pos2: { x: number; z: number }): number {
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * Get average position
   */
  private getAveragePosition(positions: Array<{ x: number; z: number }>): { x: number; z: number } {
    const avgX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
    const avgZ = positions.reduce((sum, p) => sum + p.z, 0) / positions.length;
    return { x: avgX, z: avgZ };
  }

  /**
   * Check if unit type exists in previous snapshot
   */
  private didHaveUnitType(unitType: string, playerId: number): boolean {
    // This is a simplified check - in practice you'd track discovered unit types
    return false;
  }

  /**
   * Get player name
   */
  private getPlayerName(playerId: number): string {
    return playerId === 1 ? 'Player 1' : 'Player 2';
  }

  /**
   * Get all detected events
   */
  getEventHistory(): DetectedEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 20): DetectedEvent[] {
    return this.eventHistory.slice(-count);
  }

  /**
   * Get critical events
   */
  getCriticalEvents(): DetectedEvent[] {
    return this.eventHistory.filter((e) => e.severity === 'critical');
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.previousSnapshot = null;
    this.eventHistory = [];
    this.lastScoutTime = { 1: 0, 2: 0 };
    this.baseLocations = { 1: [], 2: [] };
    this.militaryThresholdReached = { 1: false, 2: false };
    this.wonderConstructing = { 1: false, 2: false };
  }
}
