import type {
  Agent,
  AgentSnapshot,
  AgentState,
  PlayerId,
  TeamId,
  WorldState,
  GameTime,
  GameMap,
  Position,
  Player,
  Team,
  ResourcePool,
  ResourceType,
  Resource,
  Tick,
  Phase,
} from '@ai-commander/domain';
import {
  createAgent,
  createAgentSnapshot,
  AgentState as AgentStateEnum,
  createPlayer,
  createTeam,
  createWorldState,
  createGameTime,
  createTick,
  createGameMap,
  createPosition,
  createResource,
  createResourceType,
  createResourcePool,
} from '@ai-commander/domain';
import type {
  OpenRAGameState,
  OpenRAActor,
  OpenRAPlayer,
  OpenRALocation,
} from '../types/openra-state.js';

/**
 * Maps OpenRA world state to AI Commander WorldState.
 * Provides deterministic, immutable snapshots of the game world.
 */
export class OpenRAObservationMapper {
  private readonly playersCache = new Map<number, PlayerId>();

  mapGameState(openraState: OpenRAGameState): WorldState {
    const players = this.mapPlayers(openraState.world.players);
    const teams = this.mapTeams(openraState.world.players);
    const gameMap = this.mapMap(openraState.world.map);
    const gameTime = this.mapGameTime(openraState.world.tick);
    const agents = this.mapAgents(openraState.world.actors, players);

    return createWorldState(gameTime, gameMap, players, teams, agents, {
      openraWorldTick: openraState.world.tick,
      openraFrameNumber: openraState.world.frameNumber,
      openraMapName: openraState.world.map.name,
    });
  }

  private mapPlayers(openraPlayers: readonly OpenRAPlayer[]): readonly Player[] {
    return openraPlayers.map((p) => {
      const playerId = this.getPlayerId(p.index);
      return createPlayer(
        playerId,
        p.playerName || `Player ${p.index}`,
        p.teamId >= 0 ? this.createTeamId(p.teamId) : null,
        !p.isBot && !p.isObserver,
        {
          openraIndex: p.index,
          openraClientIndex: p.clientIndex,
          openraColor: p.color,
          openraFaction: p.faction,
          openraIsBot: p.isBot,
          openraIsObserver: p.isObserver,
          openraIsAlive: p.isAlive,
          openraTeamId: p.teamId,
          openraCash: p.cash,
          openraResources: p.resources,
        }
      );
    });
  }

  private mapTeams(openraPlayers: readonly OpenRAPlayer[]): readonly Team[] {
    const teamMap = new Map<number, OpenRAPlayer[]>();

    for (const player of openraPlayers) {
      if (player.teamId >= 0) {
        if (!teamMap.has(player.teamId)) {
          teamMap.set(player.teamId, []);
        }
        teamMap.get(player.teamId)!.push(player);
      }
    }

    return Array.from(teamMap.entries()).map(([teamIndex, players]) => {
      const teamId = this.createTeamId(teamIndex);
      const playerIds = players.map((p) => this.getPlayerId(p.index));

      return createTeam(teamId, `Team ${teamIndex}`, playerIds, {
        openraTeamIndex: teamIndex,
        openraPlayerCount: players.length,
      });
    });
  }

  private mapMap(openraMap: {
    name: string;
    bounds: { left: number; top: number; width: number; height: number };
  }): GameMap {
    // Generate minimal key positions based on map bounds and corners.
    // Full map grid generation would create O(width*height) positions,
    // which is inefficient for observation. Instead, create positions for:
    // - Map corners (absolute bounds)
    // - Center point (strategic location)
    // - These capture the map's spatial extent without full grid materialization.
    const positions = this.generateKeyPositions(
      openraMap.bounds.left,
      openraMap.bounds.top,
      openraMap.bounds.width,
      openraMap.bounds.height
    );

    const width = openraMap.bounds.width || 0;
    const height = openraMap.bounds.height || 0;

    return createGameMap(
      openraMap.name,
      openraMap.name,
      positions,
      width > 0 ? width : null,
      height > 0 ? height : null
    );
  }

  private generateKeyPositions(
    left: number,
    top: number,
    width: number,
    height: number
  ): readonly Position[] {
    const positions: Position[] = [];
    const right = left + width;
    const bottom = top + height;
    const centerX = left + Math.floor(width / 2);
    const centerY = top + Math.floor(height / 2);

    // Top-left corner
    positions.push(createPosition(`tile:${left},${top}`, `NW Corner (${left}, ${top})`));

    // Top-right corner
    positions.push(createPosition(`tile:${right - 1},${top}`, `NE Corner (${right - 1}, ${top})`));

    // Bottom-left corner
    positions.push(
      createPosition(`tile:${left},${bottom - 1}`, `SW Corner (${left}, ${bottom - 1})`)
    );

    // Bottom-right corner
    positions.push(
      createPosition(`tile:${right - 1},${bottom - 1}`, `SE Corner (${right - 1}, ${bottom - 1})`)
    );

    // Center point
    positions.push(createPosition(`tile:${centerX},${centerY}`, `Center (${centerX}, ${centerY})`));

    return positions;
  }

  private mapGameTime(tick: number): GameTime {
    const currentTick = createTick(tick);
    const seconds = Math.floor(tick / 25); // 25 ticks/second
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const displayTime = `${hours.toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;

    return createGameTime(currentTick, null, displayTime);
  }

  private mapAgents(
    openraActors: readonly OpenRAActor[],
    players: readonly Player[]
  ): readonly AgentSnapshot[] {
    return openraActors.map((actor) => {
      const agentId = createAgent(`actor-${actor.actorID}`);
      const controlledByPlayerId = actor.owner ? this.getPlayerId(actor.owner.index) : null;
      const state = this.mapActorState(actor);
      const resources = this.mapActorResources(actor, players);
      const customData = this.mapActorCustomData(actor, actor.owner);

      return createAgentSnapshot(agentId, controlledByPlayerId, state, resources, customData);
    });
  }

  private mapActorState(actor: OpenRAActor): AgentState {
    if (!actor.owner.isAlive) {
      return AgentStateEnum.Defeated;
    }

    if (actor.isIdle) {
      return AgentStateEnum.Idle;
    }

    return AgentStateEnum.Acting;
  }

  private mapActorResources(actor: OpenRAActor, players: readonly Player[]): ResourcePool {
    const healthType = createResourceType('health', 'Health', 'combat', 0, Infinity, true, false);

    const resources: Resource[] = [];

    if (typeof actor.maxHealth === 'number' && actor.maxHealth > 0) {
      const healthAmount = typeof actor.health === 'number' ? actor.health : actor.maxHealth;
      resources.push(createResource(healthType, healthAmount, 0));
    }

    return createResourcePool(resources, [healthType]);
  }

  private mapActorCustomData(actor: OpenRAActor, owner: OpenRAPlayer): Record<string, unknown> {
    return Object.freeze({
      openraActorId: actor.actorID,
      openraActorType: actor.info.name,
      openraActorTraits: actor.info.traits,
      openraLocation: actor.location
        ? {
            x: actor.location.x,
            y: actor.location.y,
          }
        : null,
      openraCenterLocation: actor.centerLocation
        ? {
            x: actor.centerLocation.x,
            y: actor.centerLocation.y,
          }
        : null,
      openraHealth: actor.health,
      openraMaxHealth: actor.maxHealth,
      openraIsIdle: actor.isIdle,
      openraFaction: owner.faction,
    });
  }

  private getPlayerId(index: number): PlayerId {
    if (!this.playersCache.has(index)) {
      this.playersCache.set(index, `player-${index}` as PlayerId);
    }
    return this.playersCache.get(index)!;
  }

  private createTeamId(index: number): TeamId {
    return `team-${index}` as TeamId;
  }
}
