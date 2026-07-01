/**
 * OpenRA Order representation.
 * Mirrors the OpenRA Order class structure for translation purposes.
 */

export interface OpenRAOrder {
  readonly playerIndex: number;
  readonly orderName: string;
  readonly targetActor?: number; // Actor ID, if targeting an actor
  readonly targetPosition?: { x: number; y: number }; // Position, if targeting location
  readonly targetString?: string; // String data (building type, etc)
  readonly groupedWithNext: boolean; // Group with next order for atomic execution
}

/**
 * Translation result when converting framework Command to OpenRA Order.
 */
export interface CommandTranslationResult {
  readonly success: boolean;
  readonly order?: OpenRAOrder;
  readonly error?: {
    readonly code: string;
    readonly reason: string;
  };
}

/**
 * Supported command types and their OpenRA equivalents.
 */
export const SUPPORTED_COMMANDS = {
  MOVE: 'move',
  ATTACK: 'attack',
  ATTACK_GROUND: 'attack-ground',
  BUILD: 'build',
  CANCEL: 'cancel',
} as const;

/**
 * Command parameter names used in framework Commands.
 */
export const COMMAND_PARAMETERS = {
  TARGET_POSITION: 'targetPosition',
  TARGET_AGENT: 'targetAgent',
  TARGET_TYPE: 'targetType',
  AGENT_ID: 'agentId',
} as const;
