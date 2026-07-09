/**
 * RL Interface Command Executor
 *
 * Executes commands against the 0 A.D. RL Interface.
 * Commands are sent in the official format: playerId;jsonCommand\n
 *
 * 0 A.D. commands follow the game engine's command protocol for:
 * - Unit movement and targeting
 * - Building construction
 * - Technology research
 * - Gather operations
 * - Military actions
 */

import { Logger } from '../config/logger.js';
import { RLHTTPClient, GameCommand } from './http-client.js';
import { RawGameState } from './types.js';

export interface ExecutionResult {
  commandType: string;
  playerID: number;
  success: boolean;
  sentAt: Date;
  tickBefore: number;
  tickAfter: number;
  evidence: string;
  error?: string;
}

/**
 * Standard 0 A.D. command builders
 *
 * Based on 0 A.D. engine command structure:
 * https://gitea.wildfiregames.com/0ad/0ad/src/master/source/simulation2/
 */
export namespace Commands {
  /**
   * Move units to a location
   * @param entities Entity IDs of units to move
   * @param x Target X coordinate
   * @param z Target Z coordinate (note: 0 A.D. uses X,Z not X,Y)
   * @param queued Whether to queue this command
   */
  export function Move(
    entities: number[],
    x: number,
    z: number,
    queued = false
  ): unknown {
    return {
      type: 'Move',
      entities,
      x: Math.round(x),
      z: Math.round(z),
      queued,
    };
  }

  /**
   * Attack a target entity
   * @param entities Entity IDs of attacking units
   * @param target Target entity ID
   * @param queued Whether to queue this command
   */
  export function Attack(
    entities: number[],
    target: number,
    queued = false
  ): unknown {
    return {
      type: 'Attack',
      entities,
      target,
      queued,
    };
  }

  /**
   * Gather resources from a location
   * @param entities Entity IDs of gathering units
   * @param target Target resource entity ID
   * @param queued Whether to queue this command
   */
  export function Gather(
    entities: number[],
    target: number,
    queued = false
  ): unknown {
    return {
      type: 'Gather',
      entities,
      target,
      queued,
    };
  }

  /**
   * Build a structure
   * @param playerID Player ID performing the build
   * @param template Entity template to build (e.g. "structures/iberian_tower")
   * @param x Build location X
   * @param z Build location Z
   * @param angle Building angle (0-2PI)
   */
  export function Build(
    playerID: number,
    template: string,
    x: number,
    z: number,
    angle = 0
  ): unknown {
    return {
      type: 'Build',
      playerID,
      template,
      x: Math.round(x),
      z: Math.round(z),
      angle,
    };
  }

  /**
   * Train units at a structure
   * @param playerID Player ID performing the train
   * @param template Entity template to train (e.g. "units/athenian_soldier_hoplite_b")
   * @param count Number of units to train
   * @param buildingEntity Building entity ID
   */
  export function Train(
    playerID: number,
    template: string,
    count: number,
    buildingEntity: number
  ): unknown {
    return {
      type: 'Train',
      playerID,
      template,
      count,
      buildingEntity,
    };
  }

  /**
   * Research a technology
   * @param playerID Player ID researching
   * @param technology Technology name
   * @param buildingEntity Building providing tech (e.g. "structures/athenian_temple")
   */
  export function Research(
    playerID: number,
    technology: string,
    buildingEntity: number
  ): unknown {
    return {
      type: 'Research',
      playerID,
      technology,
      buildingEntity,
    };
  }

  /**
   * Set stance (aggressive/defensive/passive)
   * @param entities Entity IDs
   * @param stance One of: "Aggressive", "Defensive", "Passive"
   */
  export function SetStance(
    entities: number[],
    stance: 'Aggressive' | 'Defensive' | 'Passive'
  ): unknown {
    return {
      type: 'SetStance',
      entities,
      stance,
    };
  }

  /**
   * Repair a structure
   * @param entities Entity IDs of repair units
   * @param target Target structure to repair
   */
  export function Repair(entities: number[], target: number): unknown {
    return {
      type: 'Repair',
      entities,
      target,
    };
  }

  /**
   * Delete/cancel a queued command
   * @param entities Entity IDs
   */
  export function CancelOrder(entities: number[]): unknown {
    return {
      type: 'CancelOrder',
      entities,
    };
  }
}

export class CommandExecutor {
  constructor(private client: RLHTTPClient, private logger: Logger) {}

  /**
   * Execute a single command and return results
   */
  async executeCommand(
    playerID: number,
    command: unknown,
    commandType: string
  ): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      commandType,
      playerID,
      success: false,
      sentAt: new Date(),
      tickBefore: 0,
      tickAfter: 0,
      evidence: '',
      error: undefined,
    };

    try {
      // Get state before
      const beforeState = await this.client.step([]);
      result.tickBefore = beforeState.tick || 0;

      // Execute command
      const gameCommand: GameCommand = {
        playerID,
        json_cmd: command,
      };

      this.logger.info(`Executing ${commandType}`, {
        playerID,
        commandType,
      });

      const afterState = await this.client.step([gameCommand]);
      result.tickAfter = afterState.tick || 0;

      result.success = true;
      result.evidence = `Command executed. Tick: ${result.tickBefore} → ${result.tickAfter}`;

      return result;
    } catch (error) {
      result.success = false;
      result.error = String(error);
      result.evidence = `Command failed: ${error}`;

      this.logger.error(`Failed to execute ${commandType}`, {
        error: String(error),
      });

      return result;
    }
  }

  /**
   * Execute multiple commands in sequence
   */
  async executeCommandSequence(
    commands: Array<{
      playerID: number;
      command: unknown;
      type: string;
    }>
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = [];

    for (const cmd of commands) {
      const result = await this.executeCommand(
        cmd.playerID,
        cmd.command,
        cmd.type
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Execute all commands in a single tick
   */
  async executeCommandBatch(
    commands: Array<{
      playerID: number;
      command: unknown;
    }>
  ): Promise<RawGameState> {
    const gameCommands: GameCommand[] = commands.map(cmd => ({
      playerID: cmd.playerID,
      json_cmd: cmd.command,
    }));

    this.logger.info('Executing command batch', {
      commandCount: gameCommands.length,
    });

    return await this.client.step(gameCommands);
  }
}
