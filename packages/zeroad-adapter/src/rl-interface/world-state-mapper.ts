/**
 * World State Mapper
 *
 * Converts raw RL Interface observations into AI Commander WorldState.
 * Maps 0 A.D. entities to agents, players, and game map.
 *
 * No information loss - all raw data preserved in customData.
 */

import { Logger } from '../config/logger.js';
import {
  RawGameState,
  RawPlayer,
  RawEntity,
} from './types.js';
import {
  createWorldState,
  createAgent,
  createPlayer,
  createGameMap,
  createGameTime,
  createAgentSnapshot,
  createTick,
  createPlayerId,
  createPosition,
  AgentState,
  createEmptyResourcePool,
} from '@ai-commander/domain';
import type {
  WorldState,
  Agent,
  Player,
  GameMap,
  GameTime,
  AgentSnapshot,
  PlayerId,
  Position,
} from '@ai-commander/domain';

export class WorldStateMapper {
  constructor(private logger: Logger) {}

  /**
   * Convert raw RL observation to WorldState
   */
  mapObservationToWorldState(rawState: RawGameState): WorldState {
    try {
      // Map game time from tick
      const gameTime = this.mapGameTime(rawState);

      // Map map/spatial data
      const gameMap = this.mapGameMap(rawState);

      // Map players
      const players = this.mapPlayers(rawState);

      // Map agents (units and buildings)
      const agents = this.mapAgents(rawState, players);

      // Create world state
      const worldState = createWorldState(
        gameTime,
        gameMap,
        players,
        [], // No team support yet
        agents,
        {
          rawObservation: rawState,
          mapName: rawState.mapName,
          mapSize: rawState.mapSize,
        }
      );

      this.logger.info('World state created', {
        tick: gameTime.currentTick.number,
        playersCount: players.length,
        agentsCount: agents.length,
      });

      return worldState;
    } catch (error) {
      this.logger.error('Failed to map observation to world state', {
        error: String(error),
      });
      throw error;
    }
  }

  /**
   * Map game time from tick
   */
  private mapGameTime(rawState: RawGameState): GameTime {
    const tickNumber = rawState.tick || 0;
    const displayTime = `Tick ${tickNumber} (${(rawState.time_elapsed || 0).toFixed(1)}s)`;

    return createGameTime(
      createTick(tickNumber),
      null, // No phases in 0 A.D. RL Interface
      displayTime
    );
  }

  /**
   * Map game map/spatial data
   */
  private mapGameMap(rawState: RawGameState): GameMap {
    const mapSize = rawState.mapSize || 256;
    // Create positions grid for the map
    const positions: Position[] = [];
    // Add a few key positions (center and corners)
    positions.push(createPosition('center', 'Map Center'));
    positions.push(createPosition('nw', 'Northwest'));
    positions.push(createPosition('ne', 'Northeast'));
    positions.push(createPosition('sw', 'Southwest'));
    positions.push(createPosition('se', 'Southeast'));

    return createGameMap(
      rawState.mapName || 'Unknown',
      rawState.mapName || 'Unknown Map',
      positions,
      mapSize,
      mapSize
    );
  }

  /**
   * Map players from raw player data
   */
  private mapPlayers(rawState: RawGameState): readonly Player[] {
    if (!rawState.players || rawState.players.length === 0) {
      this.logger.warn('No players in raw state');
      return [];
    }

    return rawState.players.map((rawPlayer) =>
      createPlayer(
        createPlayerId(String(rawPlayer.id)),
        rawPlayer.name || `Player ${rawPlayer.id}`,
        null, // No teams
        false, // Assume AI (0 A.D. has mixed control)
        {
          civ: (rawPlayer as any).civ || 'unknown',
          phase: rawPlayer.phase || 'village',
          state: rawPlayer.state || 'active',
          resources: rawPlayer.resources,
          population: rawPlayer.population,
          researched_techs: rawPlayer.researched_techs,
          queued_techs: rawPlayer.queued_techs,
        }
      )
    );
  }

  /**
   * Map agents (units and buildings) from raw entities
   *
   * Note: entities comes as an object map { id: entity }, not an array.
   * This was fixed in http-client.ts parseGameState()
   */
  private mapAgents(
    rawState: RawGameState,
    players: readonly Player[]
  ): readonly AgentSnapshot[] {
    if (!rawState.entities || (Array.isArray(rawState.entities) && rawState.entities.length === 0)) {
      this.logger.warn('No entities in raw state');
      return [];
    }

    // Convert to array if needed (should already be array from http-client.ts)
    const entitiesArray = Array.isArray(rawState.entities)
      ? rawState.entities
      : Object.values(rawState.entities);


    return entitiesArray
      .map((rawEntity: any) => {
        try {
          return this.mapEntity(rawEntity, players);
        } catch (error) {
          this.logger.warn('Failed to map entity', {
            entityId: rawEntity.id,
            error: String(error),
          });
          return null;
        }
      })
      .filter((agent): agent is AgentSnapshot => agent !== null);
  }

  /**
   * Map single entity to agent
   */
  private mapEntity(
    entity: RawEntity,
    players: readonly Player[]
  ): AgentSnapshot {
    const agentId = createAgent(`entity_${entity.id}`);

    // Check if this is a neutral/gaia entity
    let controlledByPlayerId: PlayerId | null = null;
    if (entity.owner && entity.owner > 0) {
      controlledByPlayerId = createPlayerId(String(entity.owner));
    }

    // Extract position (0 A.D. uses x,z not x,y)
    // Position comes as [x, z] array from RL Interface
    let position: { x: number; z: number };

    if (Array.isArray(entity.position) && entity.position.length >= 2) {
      // RL Interface returns position as [x, z] array
      position = { x: entity.position[0], z: entity.position[1] };
    } else if (entity.position && typeof entity.position === 'object') {
      // Fallback: might be { x, z } object format
      position = { x: entity.position.x || 0, z: entity.position.z || 0 };
    } else {
      // Final fallback: try separate x, z fields
      position = { x: entity.x || 0, z: entity.z || 0 };
    }

    // Map health
    const health = entity.health || {
      current: entity.hitpoints || 0,
      max: entity.max_hitpoints || 100,
    };

    // Infer entity type from template name if type is not set
    const inferredType = entity.type || this.inferTypeFromTemplate(entity.template || '');

    return createAgentSnapshot(
      agentId,
      controlledByPlayerId,
      this.mapAgentState(entity),
      createEmptyResourcePool([]), // 0 A.D. doesn't track per-unit resources
      {
        entityId: entity.id,
        type: inferredType,
        template: entity.template,
        owner: entity.owner,
        health,
        positionRaw: {
          x: Math.round(position.x),
          z: Math.round((position as any).z || 0),
        },
        stance: entity.stance,
        orders: entity.orders,
        production_queue: entity.production_queue,
        garrisoned: entity.garrisoned,
        amount: entity.amount,
      }
    );
  }

  /**
   * Infer entity type from template name
   */
  private inferTypeFromTemplate(template: string): string {
    if (template.includes('structures/') || template.includes('civil_centre') || template.includes('barracks')) {
      return 'building';
    }
    if (template.includes('units/') || template.includes('infantry') || template.includes('cavalry')) {
      return 'unit';
    }
    if (template.includes('gaia/') || template.includes('flora') || template.includes('fauna')) {
      return 'resource';
    }
    return 'unknown';
  }

  /**
   * Map 0 A.D. entity state to domain AgentState
   */
  private mapAgentState(entity: RawEntity): AgentState {
    // Simple heuristic based on entity properties
    if (entity.type === 'unit') {
      if (!entity.orders || entity.orders.length === 0) {
        return AgentState.Idle;
      }
      return AgentState.Acting;
    }

    // Buildings are always idle (no movement)
    return AgentState.Idle;
  }

  /**
   * Generate mapping report
   */
  generateMappingReport(
    rawState: RawGameState,
    worldState: WorldState
  ): string {
    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════╗');
    lines.push('║         WORLD STATE MAPPING REPORT                  ║');
    lines.push('╚═══════════════════════════════════════════════════════╝');
    lines.push('');

    lines.push('Raw Observation → World State');
    lines.push('');

    // Game Time
    lines.push('Game Time:');
    lines.push(`  Tick: ${worldState.time.currentTick.number}`);
    lines.push(`  Display: ${worldState.time.displayTime}`);
    lines.push('');

    // Map
    lines.push('Map:');
    lines.push(`  Name: ${rawState.mapName || 'Unknown'}`);
    lines.push(`  Size: ${rawState.mapSize || 0}x${rawState.mapSize || 0}`);
    lines.push('');

    // Players
    lines.push('Players:');
    lines.push(`  Raw Count: ${rawState.players?.length || 0}`);
    lines.push(`  Mapped Count: ${worldState.players.length}`);
    for (const player of worldState.players) {
      lines.push(`    - ${player.name} (${player.id})`);
    }
    lines.push('');

    // Agents
    lines.push('Agents:');
    lines.push(`  Raw Entities: ${rawState.entities?.length || 0}`);
    lines.push(`  Mapped Agents: ${worldState.agents.length}`);

    // Count by type
    const unitCount = worldState.agents.filter(
      (a) => (a.customData as any)?.type === 'unit'
    ).length;
    const buildingCount = worldState.agents.filter(
      (a) => (a.customData as any)?.type === 'building'
    ).length;
    const resourceCount = worldState.agents.filter(
      (a) => (a.customData as any)?.type === 'resource'
    ).length;

    lines.push(`    - Units: ${unitCount}`);
    lines.push(`    - Buildings: ${buildingCount}`);
    lines.push(`    - Resources: ${resourceCount}`);
    lines.push('');

    lines.push('Mapping Status: ✓ Complete');
    lines.push('');

    return lines.join('\n');
  }
}
