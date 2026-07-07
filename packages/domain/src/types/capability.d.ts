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
export declare function createCapability(id: string, name: string, category: string, enabled?: boolean, resourceCost?: Record<string, number>, cooldownRemaining?: number, cooldownMax?: number, properties?: Record<string, unknown>): Capability;
/**
 * Check if a capability is ready to use.
 */
export declare function isCapabilityReady(capability: Capability): boolean;
/**
 * Check if a capability can be used with given resources.
 */
export declare function canUseCapability(capability: Capability, availableResources: Record<string, number>): boolean;
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
export declare function createGoal(id: string, description: string, goalType: string, priority?: number, active?: boolean, constraints?: Record<string, unknown>, successCriteria?: Record<string, unknown>): Goal;
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
export declare function createObjective(id: string, description: string, objectiveType: string, parentGoalId: string, completed?: boolean, deadline?: number | null, parameters?: Record<string, unknown>): Objective;
/**
 * Check if objective is overdue.
 */
export declare function isObjectiveOverdue(objective: Objective, currentTick: number): boolean;
//# sourceMappingURL=capability.d.ts.map