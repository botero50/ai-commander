import type { Command } from '@ai-commander/domain';
import type { CommandTranslationResult, OpenRAOrder } from '../types/openra-command.js';
import { SUPPORTED_COMMANDS, COMMAND_PARAMETERS } from '../types/openra-command.js';

/**
 * Translates AI Commander Commands into OpenRA Orders.
 *
 * Responsibility: Convert framework Command into OpenRA Order format.
 * Does NOT execute orders or contain game logic.
 * Pure translation and validation.
 */
export class OpenRACommandTranslator {
  /**
   * Translate a framework Command into an OpenRA Order.
   *
   * @param command Framework command to translate
   * @param playerIndex OpenRA player index for validation
   * @returns Translation result with order or error
   */
  translateCommand(command: Command, playerIndex: number): CommandTranslationResult {
    // Validate command has required properties
    if (!command.actionType || command.actionType.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_ACTION_TYPE',
          reason: 'Command actionType is required and cannot be empty',
        },
      };
    }

    if (!command.agentId || command.agentId.length === 0) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID',
          reason: 'Command agentId is required and cannot be empty',
        },
      };
    }

    // Route to appropriate translator based on action type
    switch (command.actionType) {
      case SUPPORTED_COMMANDS.MOVE:
        return this.translateMoveCommand(command, playerIndex);

      case SUPPORTED_COMMANDS.ATTACK:
        return this.translateAttackCommand(command, playerIndex);

      case SUPPORTED_COMMANDS.ATTACK_GROUND:
        return this.translateAttackGroundCommand(command, playerIndex);

      case SUPPORTED_COMMANDS.BUILD:
        return this.translateBuildCommand(command, playerIndex);

      case SUPPORTED_COMMANDS.CANCEL:
        return this.translateCancelCommand(command, playerIndex);

      default:
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_ACTION',
            reason: `Action type '${command.actionType}' is not supported`,
          },
        };
    }
  }

  private translateMoveCommand(command: Command, playerIndex: number): CommandTranslationResult {
    const targetPosition = command.parameters[COMMAND_PARAMETERS.TARGET_POSITION];

    if (!targetPosition) {
      return {
        success: false,
        error: {
          code: 'MISSING_TARGET',
          reason: 'Move command requires targetPosition parameter',
        },
      };
    }

    if (
      typeof targetPosition !== 'object' ||
      !targetPosition ||
      typeof (targetPosition as any).x !== 'number' ||
      typeof (targetPosition as any).y !== 'number'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_POSITION',
          reason: 'targetPosition must be {x: number, y: number}',
        },
      };
    }

    // Extract actor ID from command.agentId (format: "actor-123")
    const actorId = this.extractActorId(command.agentId);
    if (!actorId) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID_FORMAT',
          reason: `agentId '${command.agentId}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const order: OpenRAOrder = {
      playerIndex,
      orderName: 'Move',
      targetActor: actorId,
      targetPosition: {
        x: Math.floor((targetPosition as any).x),
        y: Math.floor((targetPosition as any).y),
      },
      groupedWithNext: false,
    };

    return { success: true, order };
  }

  private translateAttackCommand(command: Command, playerIndex: number): CommandTranslationResult {
    const targetAgent = command.parameters[COMMAND_PARAMETERS.TARGET_AGENT];

    if (!targetAgent) {
      return {
        success: false,
        error: {
          code: 'MISSING_TARGET',
          reason: 'Attack command requires targetAgent parameter',
        },
      };
    }

    const sourceActorId = this.extractActorId(command.agentId);
    if (!sourceActorId) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID_FORMAT',
          reason: `agentId '${command.agentId}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const targetActorId = this.extractActorId(String(targetAgent));
    if (targetActorId === undefined) {
      return {
        success: false,
        error: {
          code: 'INVALID_TARGET_AGENT',
          reason: `targetAgent '${String(targetAgent)}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const order: OpenRAOrder = {
      playerIndex,
      orderName: 'Attack',
      targetActor: sourceActorId,
      targetString: String(targetActorId), // Target actor encoded as string
      groupedWithNext: false,
    };

    return { success: true, order };
  }

  private translateAttackGroundCommand(command: Command, playerIndex: number): CommandTranslationResult {
    const targetPosition = command.parameters[COMMAND_PARAMETERS.TARGET_POSITION];

    if (!targetPosition) {
      return {
        success: false,
        error: {
          code: 'MISSING_TARGET',
          reason: 'AttackGround command requires targetPosition parameter',
        },
      };
    }

    if (
      typeof targetPosition !== 'object' ||
      !targetPosition ||
      typeof (targetPosition as any).x !== 'number' ||
      typeof (targetPosition as any).y !== 'number'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_POSITION',
          reason: 'targetPosition must be {x: number, y: number}',
        },
      };
    }

    const actorId = this.extractActorId(command.agentId);
    if (!actorId) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID_FORMAT',
          reason: `agentId '${command.agentId}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const order: OpenRAOrder = {
      playerIndex,
      orderName: 'AttackGround',
      targetActor: actorId,
      targetPosition: {
        x: Math.floor((targetPosition as any).x),
        y: Math.floor((targetPosition as any).y),
      },
      groupedWithNext: false,
    };

    return { success: true, order };
  }

  private translateBuildCommand(command: Command, playerIndex: number): CommandTranslationResult {
    const targetType = command.parameters[COMMAND_PARAMETERS.TARGET_TYPE];
    const targetPosition = command.parameters[COMMAND_PARAMETERS.TARGET_POSITION];

    if (!targetType || typeof targetType !== 'string') {
      return {
        success: false,
        error: {
          code: 'MISSING_TARGET_TYPE',
          reason: 'Build command requires targetType parameter (building type string)',
        },
      };
    }

    if (!targetPosition) {
      return {
        success: false,
        error: {
          code: 'MISSING_POSITION',
          reason: 'Build command requires targetPosition parameter',
        },
      };
    }

    if (
      typeof targetPosition !== 'object' ||
      !targetPosition ||
      typeof (targetPosition as any).x !== 'number' ||
      typeof (targetPosition as any).y !== 'number'
    ) {
      return {
        success: false,
        error: {
          code: 'INVALID_POSITION',
          reason: 'targetPosition must be {x: number, y: number}',
        },
      };
    }

    // For Build, we might not have a specific actor (MCV can be inferred)
    // But we still need a builder (usually MCV or construction vehicle)
    const builderActorId = this.extractActorId(command.agentId);
    if (!builderActorId) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID_FORMAT',
          reason: `agentId '${command.agentId}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const order: OpenRAOrder = {
      playerIndex,
      orderName: 'Build',
      targetActor: builderActorId,
      targetPosition: {
        x: Math.floor((targetPosition as any).x),
        y: Math.floor((targetPosition as any).y),
      },
      targetString: targetType,
      groupedWithNext: false,
    };

    return { success: true, order };
  }

  private translateCancelCommand(command: Command, playerIndex: number): CommandTranslationResult {
    const actorId = this.extractActorId(command.agentId);
    if (!actorId) {
      return {
        success: false,
        error: {
          code: 'INVALID_AGENT_ID_FORMAT',
          reason: `agentId '${command.agentId}' does not match expected format 'actor-<id>'`,
        },
      };
    }

    const order: OpenRAOrder = {
      playerIndex,
      orderName: 'Cancel',
      targetActor: actorId !== undefined ? actorId : 0,
      groupedWithNext: false,
    };

    return { success: true, order };
  }

  /**
   * Extract actor ID from agent ID string.
   * Expected format: "actor-123" → 123
   *
   * @param agentId Agent ID in format "actor-<number>"
   * @returns Numeric actor ID, or undefined if format is invalid
   */
  private extractActorId(agentId: string): number | undefined {
    if (!agentId || !agentId.startsWith('actor-')) {
      return undefined;
    }

    const idString = agentId.substring('actor-'.length);
    const id = parseInt(idString, 10);

    return Number.isInteger(id) && id >= 0 ? id : undefined;
  }
}
