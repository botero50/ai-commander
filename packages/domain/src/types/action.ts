import type { Agent } from './agent.js';
import type { Tick } from './temporal.js';

/**
 * Unique identifier for an action.
 */
export type ActionId = string & { readonly __actionId: unique symbol };

/**
 * Create an ActionId.
 */
export function createActionId(id: string): ActionId {
  if (!id || id.length === 0) {
    throw new Error('ActionId cannot be empty');
  }
  return id as ActionId;
}

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
export function createCommand(
  id: ActionId,
  agentId: Agent,
  actionType: string,
  parameters: Record<string, unknown>,
  issuedAtTick: Tick,
  priority: number = 0
): Command {
  if (!actionType || actionType.length === 0) {
    throw new Error('actionType cannot be empty');
  }
  if (!Number.isInteger(priority)) {
    throw new Error('priority must be integer');
  }

  return Object.freeze({
    id,
    agentId,
    actionType,
    parameters: Object.freeze({ ...parameters }),
    issuedAtTick,
    priority,
  });
}

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
export function createActionSuccess(
  command: Command,
  executedAtTick: Tick,
  effects: Record<string, unknown> = {}
): ActionSuccess {
  return Object.freeze({
    type: 'success' as const,
    command,
    executedAtTick,
    effects: Object.freeze({ ...effects }),
  });
}

/**
 * Create a failed action result.
 */
export function createActionFailure(
  command: Command,
  reason: string,
  attemptedAtTick: Tick
): ActionFailure {
  if (!reason || reason.length === 0) {
    throw new Error('failure reason cannot be empty');
  }

  return Object.freeze({
    type: 'failure' as const,
    command,
    reason,
    attemptedAtTick,
  });
}

/**
 * Check if action result was successful.
 */
export function isActionSuccess(result: ActionResult): result is ActionSuccess {
  return result.type === 'success';
}

/**
 * Check if action result was a failure.
 */
export function isActionFailure(result: ActionResult): result is ActionFailure {
  return result.type === 'failure';
}
