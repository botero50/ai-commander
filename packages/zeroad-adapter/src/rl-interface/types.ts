/**
 * Raw Game State Types (from RL Interface)
 *
 * These are the types returned directly from 0 A.D. RL Interface /step endpoint.
 * No transformation applied - used for direct observation logging.
 */

/**
 * Complete raw game state returned by RL Interface
 */
export interface RawGameState {
  tick: number;
  time_elapsed: number;  // In seconds

  players: RawPlayer[];
  entities: RawEntity[];

  mapSize?: number;
  mapName?: string;
}

/**
 * Raw player state
 */
export interface RawPlayer {
  id?: number;
  name: string;
  civ?: string;  // Civilization (e.g., 'han', 'sele', 'brit')
  entity?: number;  // Entity ID controlling this player
  color?: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  controlsAll?: boolean;

  // Population stats
  popCount?: number;  // Current population
  popLimit?: number;  // Population limit
  popMax?: number;  // Maximum possible population

  // Resource counts (NEW: actual field name from 0 A.D.)
  resourceCounts?: {
    food: number;
    wood: number;
    stone: number;
    metal: number;
  };

  // Legacy field names (for backward compatibility)
  resources?: {
    food: number;
    wood: number;
    stone: number;
    metal: number;
  };

  population?: {
    current: number;
    limit: number;
  };

  phase?: string;  // 'village' | 'town' | 'city'
  researched_techs?: string[];
  queued_techs?: string[];

  state?: string;  // 'active' | 'defeated' | 'victorious'
}

/**
 * Raw entity (unit or building)
 */
export interface RawEntity {
  id: number;
  type: 'unit' | 'building' | 'resource';
  template: string;
  owner: number;  // Player ID (0 = neutral/gaia)

  position?: {
    x: number;
    z: number;
  };

  x?: number;     // Alternative position format
  z?: number;

  health?: {
    current: number;
    max: number;
  };

  hitpoints?: number;
  max_hitpoints?: number;

  stance?: string;  // 'aggressive' | 'defensive' | 'passive'
  orders?: Array<{ type: string; target?: number }>;

  // Building-specific
  production_queue?: Array<{ template: string; count: number }>;
  garrisoned?: number[];

  // Resource-specific
  amount?: number;
}

/**
 * Events that occurred during this tick
 */
export interface RawEvents {
  Create?: Array<{ entity_id: number }>;
  Destroy?: Array<{ entity_id: number }>;
  Attacked?: Array<{ attacker: number; target: number }>;
  Owned?: Array<{ entity_id: number; owner: number }>;
  [key: string]: unknown;
}

/**
 * RL Interface command format
 */
export interface RLCommand {
  player_id: number;
  command: {
    type: string;  // 'walk', 'attack', 'build', 'train', etc.
    entities?: number[];
    target?: number;
    x?: number;
    z?: number;
    queued?: boolean;
    [key: string]: unknown;
  };
}

/**
 * Metrics from observation
 */
export interface ObservationMetrics {
  tick: number;
  gameTime: number;
  playersObserved: number;
  unitsObserved: number;
  buildingsObserved: number;
  technologiesResearched: number;
  allFieldsValid: boolean;
}
