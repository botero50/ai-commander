import { GameState, Unit, Building, Player, Resources } from './state-types.js';
import { Logger } from '../config/logger.js';

export interface RawGameState {
  tick: number;
  timestamp: number;
  players: Array<{
    id: number;
    name: string;
    civ: string;
    color: string;
    resources: { food: number; wood: number; stone: number; metal: number };
    population: { current: number; max: number };
    diplomacy: Record<string, string>;
  }>;
  units: Array<{
    id: number;
    owner: number;
    type: string;
    position: { x: number; z: number };
    health: number;
    maxHealth: number;
    stance?: string;
    orders?: string[];
  }>;
  buildings: Array<{
    id: number;
    owner: number;
    type: string;
    position: { x: number; z: number };
    health: number;
    maxHealth: number;
    production?: string[];
    garrisoned?: number[];
  }>;
  map: { width: number; height: number; terrain: string };
}

export class StateExtractor {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  extract(rawState: RawGameState): GameState {
    const startTime = Date.now();

    try {
      const gameState: GameState = {
        tick: rawState.tick,
        timestamp: rawState.timestamp,
        players: this.extractPlayers(rawState.players),
        units: this.extractUnits(rawState.units),
        buildings: this.extractBuildings(rawState.buildings),
        map: rawState.map,
      };

      const duration = Date.now() - startTime;
      if (duration > 50) {
        this.logger.warn('State extraction took longer than 50ms', { duration });
      }

      return gameState;
    } catch (err) {
      this.logger.error('Failed to extract state', err);
      throw err;
    }
  }

  private extractPlayers(rawPlayers: RawGameState['players']): Player[] {
    return rawPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      civ: p.civ,
      color: p.color,
      resources: {
        food: p.resources.food,
        wood: p.resources.wood,
        stone: p.resources.stone,
        metal: p.resources.metal,
      },
      populationCurrent: p.population.current,
      populationMax: p.population.max,
      diplomacy: this.normalizeDiplomacy(p.diplomacy),
    }));
  }

  private extractUnits(rawUnits: RawGameState['units']): Unit[] {
    return rawUnits.map((u) => ({
      id: u.id,
      owner: u.owner,
      type: u.type,
      position: { x: u.position.x, z: u.position.z },
      health: u.health,
      maxHealth: u.maxHealth,
      stance: u.stance,
      orders: u.orders,
    }));
  }

  private extractBuildings(rawBuildings: RawGameState['buildings']): Building[] {
    return rawBuildings.map((b) => ({
      id: b.id,
      owner: b.owner,
      type: b.type,
      position: { x: b.position.x, z: b.position.z },
      health: b.health,
      maxHealth: b.maxHealth,
      production: b.production,
      garrisoned: b.garrisoned,
    }));
  }

  private normalizeDiplomacy(diplomacy: Record<string, string>): Record<number, string> {
    const normalized: Record<number, string> = {};
    for (const [key, value] of Object.entries(diplomacy)) {
      const playerId = parseInt(key, 10);
      if (!isNaN(playerId)) {
        normalized[playerId] = value;
      }
    }
    return normalized;
  }
}
