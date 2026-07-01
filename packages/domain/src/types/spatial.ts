/**
 * Position in game world. Format is abstract to support:
 * - Grid coordinates (row, col)
 * - Continuous coordinates (x, y, z)
 * - Hex grids
 * - Graph nodes
 * - Custom positioning schemes
 */
export interface Position {
  /**
   * Unique identifier for this position.
   * Format depends on game world layout.
   * Examples: "row:0,col:1", "100.5,200.3", "hex-15-20", "node-42"
   */
  readonly id: string;

  /**
   * Human-readable description of position.
   * Format depends on game world.
   * Examples: "North wall", "Center plaza", "Hex (15,20)"
   */
  readonly description: string;
}

/**
 * Create a Position value object.
 */
export function createPosition(id: string, description: string): Position {
  if (!id || id.length === 0) {
    throw new Error('Position id cannot be empty');
  }
  return Object.freeze({ id, description });
}

/**
 * Check if two positions are the same.
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.id === b.id;
}

/**
 * Map or region in the game world.
 * Represents the layout and structure of the playable space.
 */
export interface GameMap {
  /**
   * Unique identifier for this map.
   */
  readonly id: string;

  /**
   * Human-readable name of the map.
   */
  readonly name: string;

  /**
   * All positions/locations on this map.
   * Immutable collection - order is consistent.
   */
  readonly positions: readonly Position[];

  /**
   * Width of map (if applicable to grid).
   * null if map has no grid dimensions.
   */
  readonly width: number | null;

  /**
   * Height of map (if applicable to grid).
   * null if map has no grid dimensions.
   */
  readonly height: number | null;
}

/**
 * Create a GameMap value object.
 */
export function createGameMap(
  id: string,
  name: string,
  positions: readonly Position[],
  width: number | null = null,
  height: number | null = null
): GameMap {
  if (!id || id.length === 0) {
    throw new Error('Map id cannot be empty');
  }
  if (!name || name.length === 0) {
    throw new Error('Map name cannot be empty');
  }
  if (positions.length === 0) {
    throw new Error('Map must have at least one position');
  }
  if ((width === null) !== (height === null)) {
    throw new Error('Both width and height must be null or both must be numbers');
  }
  if ((width !== null && width <= 0) || (height !== null && height <= 0)) {
    throw new Error('Map dimensions must be positive');
  }

  return Object.freeze({
    id,
    name,
    positions: Object.freeze([...positions]),
    width,
    height,
  });
}

/**
 * Region or area within the game world.
 * Used for grouping positions, visibility calculations, etc.
 */
export interface Region {
  /**
   * Unique identifier for this region.
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Positions contained in this region.
   */
  readonly positions: readonly Position[];
}

/**
 * Create a Region value object.
 */
export function createRegion(id: string, name: string, positions: readonly Position[]): Region {
  if (!id || id.length === 0) {
    throw new Error('Region id cannot be empty');
  }
  if (!name || name.length === 0) {
    throw new Error('Region name cannot be empty');
  }
  if (positions.length === 0) {
    throw new Error('Region must have at least one position');
  }

  return Object.freeze({
    id,
    name,
    positions: Object.freeze([...positions]),
  });
}
