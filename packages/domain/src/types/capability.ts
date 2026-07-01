/**
 * Capability - what an agent is able to do.
 * Abstract representation of skills, abilities, or permissions.
 */
export interface Capability {
  /**
   * Unique identifier for this capability.
   * Examples: "move", "attack", "cast-fireball", "build", "gather"
   */
  readonly id: string;

  /**
   * Human-readable name.
   */
  readonly name: string;

  /**
   * Category for grouping related capabilities.
   * Examples: "movement", "combat", "magic", "economy", "social"
   */
  readonly category: string;

  /**
   * Is this capability currently enabled?
   */
  readonly enabled: boolean;

  /**
   * Resource requirements to use this capability.
   * Examples: {gold: 50, mana: 10, actionPoints: 1}
   */
  readonly resourceCost: Record<string, number>;

  /**
   * Cooldown remaining (if any).
   * 0 = ready to use, > 0 = must wait this many ticks.
   */
  readonly cooldownRemaining: number;

  /**
   * Maximum cooldown for this capability (after it's used).
   */
  readonly cooldownMax: number;

  /**
   * Game-specific properties.
   * Examples: {range, areaOfEffect, targetType, duration}
   */
  readonly properties: Record<string, unknown>;
}

/**
 * Create a Capability value object.
 */
export function createCapability(
  id: string,
  name: string,
  category: string,
  enabled: boolean = true,
  resourceCost: Record<string, number> = {},
  cooldownRemaining: number = 0,
  cooldownMax: number = 0,
  properties: Record<string, unknown> = {}
): Capability {
  if (!id || id.length === 0) {
    throw new Error('Capability id cannot be empty');
  }
  if (!name || name.length === 0) {
    throw new Error('Capability name cannot be empty');
  }
  if (!category || category.length === 0) {
    throw new Error('Capability category cannot be empty');
  }
  if (!Number.isInteger(cooldownRemaining) || cooldownRemaining < 0) {
    throw new Error('cooldownRemaining must be non-negative integer');
  }
  if (!Number.isInteger(cooldownMax) || cooldownMax < 0) {
    throw new Error('cooldownMax must be non-negative integer');
  }

  return Object.freeze({
    id,
    name,
    category,
    enabled,
    resourceCost: Object.freeze({ ...resourceCost }),
    cooldownRemaining,
    cooldownMax,
    properties: Object.freeze({ ...properties }),
  });
}

/**
 * Check if a capability is ready to use.
 */
export function isCapabilityReady(capability: Capability): boolean {
  return capability.enabled && capability.cooldownRemaining === 0;
}

/**
 * Check if a capability can be used with given resources.
 */
export function canUseCapability(
  capability: Capability,
  availableResources: Record<string, number>
): boolean {
  if (!isCapabilityReady(capability)) {
    return false;
  }

  for (const [resource, cost] of Object.entries(capability.resourceCost)) {
    if ((availableResources[resource] ?? 0) < cost) {
      return false;
    }
  }

  return true;
}

/**
 * Goal - what an agent is trying to achieve.
 * High-level objective (to be decomposed into plans).
 */
export interface Goal {
  /**
   * Unique identifier for this goal.
   */
  readonly id: string;

  /**
   * Human-readable description.
   */
  readonly description: string;

  /**
   * Type of goal.
   * Examples: "destroy-enemy", "gather-resources", "survive", "defend-position"
   */
  readonly goalType: string;

  /**
   * Priority of this goal (higher = more important).
   */
  readonly priority: number;

  /**
   * Is this goal still active?
   */
  readonly active: boolean;

  /**
   * Goal-specific constraints/requirements.
   * Examples: {targetAgentId, targetAmount, timeLimit, location}
   */
  readonly constraints: Record<string, unknown>;

  /**
   * Success criteria.
   * Examples: {enemyDestroyed, resourceGathered, timeExpired, completed}
   */
  readonly successCriteria: Record<string, unknown>;
}

/**
 * Create a Goal value object.
 */
export function createGoal(
  id: string,
  description: string,
  goalType: string,
  priority: number = 0,
  active: boolean = true,
  constraints: Record<string, unknown> = {},
  successCriteria: Record<string, unknown> = {}
): Goal {
  if (!id || id.length === 0) {
    throw new Error('Goal id cannot be empty');
  }
  if (!description || description.length === 0) {
    throw new Error('Goal description cannot be empty');
  }
  if (!goalType || goalType.length === 0) {
    throw new Error('Goal goalType cannot be empty');
  }

  return Object.freeze({
    id,
    description,
    goalType,
    priority,
    active,
    constraints: Object.freeze({ ...constraints }),
    successCriteria: Object.freeze({ ...successCriteria }),
  });
}

/**
 * Objective - tactical task toward achieving a goal.
 * Smaller, more concrete than a goal.
 */
export interface Objective {
  /**
   * Unique identifier.
   */
  readonly id: string;

  /**
   * Description of what needs to be done.
   */
  readonly description: string;

  /**
   * Type of objective.
   * Examples: "move-to-position", "defeat-enemy", "acquire-resource"
   */
  readonly objectiveType: string;

  /**
   * Parent goal this objective serves.
   */
  readonly parentGoalId: string;

  /**
   * Is this objective complete?
   */
  readonly completed: boolean;

  /**
   * Deadline (tick count).
   * null = no deadline.
   */
  readonly deadline: number | null;

  /**
   * Objective-specific parameters.
   * Examples: {targetPosition, targetAgent, quantity}
   */
  readonly parameters: Record<string, unknown>;
}

/**
 * Create an Objective value object.
 */
export function createObjective(
  id: string,
  description: string,
  objectiveType: string,
  parentGoalId: string,
  completed: boolean = false,
  deadline: number | null = null,
  parameters: Record<string, unknown> = {}
): Objective {
  if (!id || id.length === 0) {
    throw new Error('Objective id cannot be empty');
  }
  if (!description || description.length === 0) {
    throw new Error('Objective description cannot be empty');
  }
  if (!objectiveType || objectiveType.length === 0) {
    throw new Error('Objective objectiveType cannot be empty');
  }
  if (!parentGoalId || parentGoalId.length === 0) {
    throw new Error('Objective parentGoalId cannot be empty');
  }
  if (deadline !== null && (!Number.isInteger(deadline) || deadline < 0)) {
    throw new Error('deadline must be non-negative integer or null');
  }

  return Object.freeze({
    id,
    description,
    objectiveType,
    parentGoalId,
    completed,
    deadline,
    parameters: Object.freeze({ ...parameters }),
  });
}

/**
 * Check if objective is overdue.
 */
export function isObjectiveOverdue(objective: Objective, currentTick: number): boolean {
  return objective.deadline !== null && currentTick > objective.deadline;
}
