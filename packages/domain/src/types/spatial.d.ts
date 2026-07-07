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
export declare function createPosition(id: string, description: string): Position;
/**
 * Check if two positions are the same.
 */
export declare function positionsEqual(a: Position, b: Position): boolean;
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
export declare function createGameMap(id: string, name: string, positions: readonly Position[], width?: number | null, height?: number | null): GameMap;
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
export declare function createRegion(id: string, name: string, positions: readonly Position[]): Region;
//# sourceMappingURL=spatial.d.ts.map