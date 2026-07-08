import { GameCommand, createCommandId } from './command-types.js';
import { Logger } from '../config/logger.js';
import { ZeroADAdapterError, ZeroADAdapterErrorCode } from '../types/errors.js';

export interface ZeroADRawCommand {
  type: string;
  entities?: number[];
  entity?: number;
  x?: number;
  z?: number;
  template?: string;
  target?: number;
  queued?: boolean;
  angle?: number;
  count?: number;
  resourceType?: string;
}

export class CommandConverter {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  convert(gameCommand: GameCommand): ZeroADRawCommand {
    const startTime = Date.now();

    try {
      let rawCommand: ZeroADRawCommand;

      switch (gameCommand.type) {
        case 'move':
          rawCommand = this.convertMove(gameCommand);
          break;
        case 'attack':
          rawCommand = this.convertAttack(gameCommand);
          break;
        case 'gather':
          rawCommand = this.convertGather(gameCommand);
          break;
        case 'build':
          rawCommand = this.convertBuild(gameCommand);
          break;
        case 'train':
          rawCommand = this.convertTrain(gameCommand);
          break;
        case 'patrol':
          rawCommand = this.convertPatrol(gameCommand);
          break;
        case 'repair':
          rawCommand = this.convertRepair(gameCommand);
          break;
        case 'stop':
          rawCommand = this.convertStop(gameCommand);
          break;
        default:
          throw new ZeroADAdapterError(
            ZeroADAdapterErrorCode.UNKNOWN,
            `Unknown command type: ${(gameCommand as any).type}`
          );
      }

      const duration = Date.now() - startTime;
      if (duration > 10) {
        this.logger.warn('Slow command conversion', {
          type: gameCommand.type,
          duration,
        });
      }

      return rawCommand;
    } catch (err) {
      this.logger.error('Failed to convert command', err);
      throw err;
    }
  }

  private convertMove(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);
    this.validatePosition(cmd.targetX, cmd.targetZ);

    return {
      type: 'move',
      entities: cmd.entityIds,
      x: cmd.targetX,
      z: cmd.targetZ,
      queued: cmd.queued || false,
    };
  }

  private convertAttack(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);
    this.validateEntityId(cmd.targetEntityId);

    return {
      type: 'attack',
      entities: cmd.entityIds,
      target: cmd.targetEntityId,
      queued: cmd.queued || false,
    };
  }

  private convertGather(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);
    this.validateEntityId(cmd.targetEntityId);

    return {
      type: 'gather',
      entities: cmd.entityIds,
      target: cmd.targetEntityId,
      resourceType: cmd.resourceType,
      queued: cmd.queued || false,
    };
  }

  private convertBuild(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.builderEntityIds);
    this.validateTemplate(cmd.templateName);
    this.validatePosition(cmd.positionX, cmd.positionZ);

    return {
      type: 'build',
      entities: cmd.builderEntityIds,
      template: cmd.templateName,
      x: cmd.positionX,
      z: cmd.positionZ,
      angle: cmd.angle || 0,
    };
  }

  private convertTrain(cmd: any): ZeroADRawCommand {
    this.validateEntityId(cmd.builderEntityId);
    this.validateTemplate(cmd.templateName);

    return {
      type: 'train',
      entity: cmd.builderEntityId,
      template: cmd.templateName,
      count: cmd.count || 1,
    };
  }

  private convertPatrol(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);
    this.validatePosition(cmd.targetX, cmd.targetZ);

    return {
      type: 'patrol',
      entities: cmd.entityIds,
      x: cmd.targetX,
      z: cmd.targetZ,
      queued: cmd.queued || false,
    };
  }

  private convertRepair(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);
    this.validateEntityId(cmd.targetEntityId);

    return {
      type: 'repair',
      entities: cmd.entityIds,
      target: cmd.targetEntityId,
      queued: cmd.queued || false,
    };
  }

  private convertStop(cmd: any): ZeroADRawCommand {
    this.validateEntityIds(cmd.entityIds);

    return {
      type: 'stop',
      entities: cmd.entityIds,
    };
  }

  private validateEntityIds(ids: unknown): void {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.UNKNOWN,
        'Entity IDs must be a non-empty array'
      );
    }

    for (const id of ids) {
      if (typeof id !== 'number' || id <= 0) {
        throw new ZeroADAdapterError(
          ZeroADAdapterErrorCode.UNKNOWN,
          `Invalid entity ID: ${id}`
        );
      }
    }
  }

  private validateEntityId(id: unknown): void {
    if (typeof id !== 'number' || id <= 0) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.UNKNOWN,
        `Invalid entity ID: ${id}`
      );
    }
  }

  private validatePosition(x: unknown, z: unknown): void {
    if (typeof x !== 'number' || typeof z !== 'number') {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.UNKNOWN,
        `Invalid position: x=${x}, z=${z}`
      );
    }
  }

  private validateTemplate(template: unknown): void {
    if (typeof template !== 'string' || template.length === 0) {
      throw new ZeroADAdapterError(
        ZeroADAdapterErrorCode.UNKNOWN,
        `Invalid template: ${template}`
      );
    }
  }
}
