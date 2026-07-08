import {
  WorldState,
  createWorldState,
  Player as DomainPlayer,
  createPlayer,
  Team,
  createTeam,
  AgentSnapshot,
  AgentState,
  createAgent,
  createTick,
  createGameTime,
  createPosition,
  createGameMap,
} from '@ai-commander/domain';
import { GameState, Unit, Building, Player } from '../state/state-types.js';
import { Logger } from '../config/logger.js';
import { PlayerId, TeamId, ResourcePool } from '@ai-commander/domain';

export class WorldMapper {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  map(gameState: GameState): WorldState {
    const startTime = Date.now();

    try {
      // Map time
      const tick = createTick(gameState.tick);
      const gameTime = createGameTime(tick, null, `Tick ${gameState.tick}`);

      // Map map
      const map = createGameMap(`0ad-map-${gameState.map.terrain}`, gameState.map.terrain, [], gameState.map.width, gameState.map.height);

      // Map players
      const domainPlayers = gameState.players.map((p) => this.mapPlayer(p));

      // Map units and buildings as agents
      const agents = this.mapAgents(gameState);

      // Create world state
      const worldState = createWorldState(gameTime, map, domainPlayers, [], agents, {
        gameState: gameState,
      });

      const duration = Date.now() - startTime;
      if (duration > 20) {
        this.logger.warn('World mapping took longer than 20ms', {
          duration,
          entities: agents.length,
        });
      }

      return worldState;
    } catch (err) {
      this.logger.error('Failed to map world state', err);
      throw err;
    }
  }

  private mapPlayer(player: Player): DomainPlayer {
    return createPlayer(
      (player.id.toString() as unknown) as PlayerId,
      player.name,
      null, // No team support in 0 A.D. (free-for-all)
      false, // All players are AI-controlled
      {
        civilization: player.civ,
        color: player.color,
        resources: {
          food: player.resources.food,
          wood: player.resources.wood,
          stone: player.resources.stone,
          metal: player.resources.metal,
        },
        population: {
          current: player.populationCurrent,
          max: player.populationMax,
        },
        diplomacy: player.diplomacy,
      }
    );
  }

  private mapAgents(gameState: GameState): AgentSnapshot[] {
    const agents: AgentSnapshot[] = [];

    // Map units as agents
    for (const unit of gameState.units) {
      agents.push(this.mapUnit(unit));
    }

    // Map buildings as agents
    for (const building of gameState.buildings) {
      agents.push(this.mapBuilding(building));
    }

    return agents;
  }

  private mapUnit(unit: Unit): AgentSnapshot {
    return {
      agentId: createAgent(`unit-${unit.id}`),
      controlledByPlayerId: (unit.owner.toString() as unknown) as PlayerId,
      state: this.determineUnitState(unit),
      resources: this.createResourcePool(unit.health, unit.maxHealth),
      customData: {
        type: unit.type,
        position: unit.position,
        health: unit.health,
        maxHealth: unit.maxHealth,
        stance: unit.stance,
        orders: unit.orders,
      },
    };
  }

  private mapBuilding(building: Building): AgentSnapshot {
    return {
      agentId: createAgent(`building-${building.id}`),
      controlledByPlayerId: (building.owner.toString() as unknown) as PlayerId,
      state: AgentState.Acting, // Buildings are always "active"
      resources: this.createResourcePool(building.health, building.maxHealth),
      customData: {
        type: building.type,
        position: building.position,
        health: building.health,
        maxHealth: building.maxHealth,
        production: building.production,
        garrisoned: building.garrisoned,
      },
    };
  }

  private determineUnitState(unit: Unit): AgentState {
    if (unit.health <= 0) {
      return AgentState.Defeated;
    }

    if (unit.orders && unit.orders.length > 0) {
      const firstOrder = unit.orders[0];
      if (firstOrder === 'move' || firstOrder === 'patrol') {
        return AgentState.Acting;
      }
      if (firstOrder === 'attack') {
        return AgentState.Acting;
      }
    }

    return AgentState.Idle;
  }

  private createResourcePool(current: number, max: number): ResourcePool {
    return {
      health: {
        current,
        max,
      },
    };
  }
}
