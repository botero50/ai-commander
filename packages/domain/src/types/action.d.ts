import type { Agent } from './agent.js';
import type { Tick } from './temporal.js';
/**
 * Unique identifier for an action.
 */
export type ActionId = string & {
    readonly __actionId: unique symbol;
};
/**
 * Create an ActionId.
 */
export declare function createActionId(id: string): ActionId;
/**
 * Command to execute an action.
 * Represents an agent's intent to perform a specific action.
 */
export interface Command {
    /**
     * Unique identifier for this command.
     */
    readonly id: ActionId;
    /**
     * Agent issuing this command.
     */
    readonly agentId: Agent;
    /**
     * Type of action to perform.
     * Examples: "move", "attack", "cast-spell", "pass", "build"
     */
    readonly actionType: string;
    /**
     * Action-specific parameters.
     * Examples: {targetPosition, targetAgent, quantity, targetTile}
     */
    readonly parameters: Record<string, unknown>;
    /**
     * Tick when this command was issued.
     */
    readonly issuedAtTick: Tick;
    /**
     * Priority of this command (higher = earlier execution).
     * Useful for tiebreaking simultaneous commands.
     */
    readonly priority: number;
}
/**
 * Create a Command value object.
 */
export declare function createCommand(id: ActionId, agentId: Agent, actionType: string, parameters: Record<string, unknown>, issuedAtTick: Tick, priority?: number): Command;
/**
 * Result of executing an action.
 * Discriminated union of success vs failure.
 */
export type ActionResult = ActionSuccess | ActionFailure;
/**
 * Action executed successfully.
 */
export interface ActionSuccess {
    readonly type: 'success';
    readonly command: Command;
    readonly executedAtTick: Tick;
    readonly effects: Record<string, unknown>;
}
/**
 * Action failed or was not executed.
 */
export interface ActionFailure {
    readonly type: 'failure';
    readonly command: Command;
    readonly reason: string;
    readonly attemptedAtTick: Tick;
}
/**
 * Create a successful action result.
 */
export declare function createActionSuccess(command: Command, executedAtTick: Tick, effects?: Record<string, unknown>): ActionSuccess;
/**
 * Create a failed action result.
 */
export declare function createActionFailure(command: Command, reason: string, attemptedAtTick: Tick): ActionFailure;
/**
 * Check if action result was successful.
 */
export declare function isActionSuccess(result: ActionResult): result is ActionSuccess;
/**
 * Check if action result was a failure.
 */
export declare function isActionFailure(result: ActionResult): result is ActionFailure;
//# sourceMappingURL=action.d.ts.map