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
export function createResourceType(
  id: string,
  name: string,
  category: string,
  min: number = 0,
  max: number = Infinity,
  stackable: boolean = true,
  renewable: boolean = false
): ResourceType {
  if (!id || id.length === 0) {
    throw new Error('ResourceType id cannot be empty');
  }
  if (!name || name.length === 0) {
    throw new Error('ResourceType name cannot be empty');
  }
  if (!category || category.length === 0) {
    throw new Error('ResourceType category cannot be empty');
  }
  if (min > max) {
    throw new Error('ResourceType min cannot exceed max');
  }

  return Object.freeze({
    id,
    name,
    category,
    min,
    max,
    stackable,
    renewable,
  });
}

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
export function createResource(
  type: ResourceType,
  amount: number,
  lastUpdateTick: number = 0
): Resource {
  if (!Number.isInteger(amount) || amount < type.min || amount > type.max) {
    throw new Error(`Resource amount must be integer between ${type.min} and ${type.max}`);
  }
  if (!Number.isInteger(lastUpdateTick) || lastUpdateTick < 0) {
    throw new Error('lastUpdateTick must be non-negative integer');
  }

  return Object.freeze({
    type,
    amount,
    lastUpdateTick,
  });
}

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
export function createResourcePool(
  resources: readonly Resource[],
  knownTypes: readonly ResourceType[]
): ResourcePool {
  const resourceMap = new Map(resources.map((r) => [r.type.id, r]));

  return Object.freeze({
    resources: Object.freeze([...resources]),
    knownTypes: Object.freeze([...knownTypes]),
    getResource: (typeId: string) => resourceMap.get(typeId),
    getAmount: (typeId: string) => resourceMap.get(typeId)?.amount ?? 0,
    hasEnough: (typeId: string, amount: number) => {
      const resource = resourceMap.get(typeId);
      return resource ? resource.amount >= amount : false;
    },
  });
}

/**
 * Empty resource pool.
 */
export function createEmptyResourcePool(knownTypes: readonly ResourceType[]): ResourcePool {
  return createResourcePool([], knownTypes);
}
