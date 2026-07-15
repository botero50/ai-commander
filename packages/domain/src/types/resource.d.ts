/**
 * Type of resource in the game.
 * Abstract to support any resource system:
 * - Gold, wood, stone (RTS)
 * - Mana, health (fantasy)
 * - Action points (tactical)
 * - Cards, tokens (card games)
 */
export interface ResourceType {
    /**
     * Unique identifier for this resource type.
     * Examples: "gold", "wood", "health", "ap", "cards"
     */
    readonly id: string;
    /**
     * Human-readable name.
     */
    readonly name: string;
    /**
     * Category for grouping related resources.
     * Examples: "economy", "combat", "currency"
     */
    readonly category: string;
    /**
     * Minimum allowed value (usually 0 or negative for debt).
     */
    readonly min: number;
    /**
     * Maximum allowed value (usually positive or Infinity).
     */
    readonly max: number;
    /**
     * Is this resource stackable? (e.g., gold vs unique artifacts)
     */
    readonly stackable: boolean;
    /**
     * Whether this resource regenerates/resets each turn.
     */
    readonly renewable: boolean;
}
/**
 * Create a ResourceType value object.
 */
export declare function createResourceType(id: string, name: string, category: string, min?: number, max?: number, stackable?: boolean, renewable?: boolean): ResourceType;
/**
 * Amount of a specific resource.
 */
export interface Resource {
    /**
     * What type of resource this is.
     */
    readonly type: ResourceType;
    /**
     * Current amount.
     */
    readonly amount: number;
    /**
     * When this resource was last updated (tick number).
     */
    readonly lastUpdateTick: number;
}
/**
 * Create a Resource value object.
 */
export declare function createResource(type: ResourceType, amount: number, lastUpdateTick?: number): Resource;
/**
 * Collection of resources an entity has.
 */
export interface ResourcePool {
    /**
     * All resources currently held.
     */
    readonly resources: readonly Resource[];
    /**
     * Get a specific resource by type id.
     */
    getResource(typeId: string): Resource | undefined;
    /**
     * Get the amount of a specific resource type.
     * Returns 0 if resource not present.
     */
    getAmount(typeId: string): number;
    /**
     * Check if enough of a resource is available.
     */
    hasEnough(typeId: string, amount: number): boolean;
    /**
     * All resource types known to this pool.
     */
    readonly knownTypes: readonly ResourceType[];
}
/**
 * Create a ResourcePool value object.
 */
export declare function createResourcePool(resources: readonly Resource[], knownTypes: readonly ResourceType[]): ResourcePool;
/**
 * Empty resource pool.
 */
export declare function createEmptyResourcePool(knownTypes: readonly ResourceType[]): ResourcePool;
//# sourceMappingURL=resource.d.ts.map