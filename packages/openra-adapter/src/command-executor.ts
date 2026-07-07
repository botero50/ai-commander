import type { CommandOption } from "@ai-commander/brain";
import type { OpenRAGameState, OpenRAUnit } from "./state-reader";

export type OpenRACommandType =
  | "move"
  | "attack"
  | "gather"
  | "build"
  | "train"
  | "stop"
  | "patrol"
  | "repair";

export interface OpenRACommand {
  readonly type: OpenRACommandType;
  readonly unitId: string;
  readonly targetPosition?: { x: number; y: number };
  readonly targetUnitId?: string;
  readonly targetBuildingId?: string;
  readonly buildingType?: string;
  readonly patrolStart?: { x: number; y: number };
  readonly patrolEnd?: { x: number; y: number };
}

export interface CommandValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
  readonly executedCommand?: OpenRACommand;
  readonly expectedEffect?: string;
}

export class CommandExecutor {
  static executeCommand(
    brainCommand: CommandOption,
    unitId: string,
    gameState: OpenRAGameState,
    playerName: string
  ): CommandValidationResult {
    const unit = gameState.units.find((u) => u.id === unitId);
    if (!unit) {
      return { valid: false, reason: `Unit not found: ${unitId}` };
    }

    if (unit.owner !== playerName) {
      return { valid: false, reason: `Unit not owned by player` };
    }

    const commandType = this.parseCommandType(brainCommand.action);
    if (!commandType) {
      return { valid: false, reason: `Unknown command type` };
    }

    const target = brainCommand.target as { x: number; y: number } | undefined;

    switch (commandType) {
      case "move":
        return target ? this.validateMove(unit, target, gameState) : { valid: false, reason: "No target" };
      case "attack":
        return target ? this.validateAttack(unit, target, gameState, playerName) : { valid: false, reason: "No target" };
      case "gather":
        return target ? this.validateGather(unit, target, gameState) : { valid: false, reason: "No target" };
      case "build":
        return target ? this.validateBuild(unit, target, gameState, playerName) : { valid: false, reason: "No target" };
      case "train":
        return this.validateTrain(unit, gameState, playerName);
      case "stop":
        return this.validateStop(unit);
      case "patrol":
        return target ? this.validatePatrol(unit, target, gameState) : { valid: false, reason: "No target" };
      case "repair":
        return target ? this.validateRepair(unit, target, gameState, playerName) : { valid: false, reason: "No target" };
      default:
        return { valid: false, reason: `Unsupported command` };
    }
  }

  private static parseCommandType(action: string): OpenRACommandType | null {
    const types: OpenRACommandType[] = ["move", "attack", "gather", "build", "train", "stop", "patrol", "repair"];
    for (const type of types) {
      if (action.toLowerCase().includes(type)) return type;
    }
    return null;
  }

  private static validateMove(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState
  ): CommandValidationResult {
    if (target.x < 0 || target.x >= gameState.mapWidth || target.y < 0 || target.y >= gameState.mapHeight) {
      return { valid: false, reason: "Target out of bounds" };
    }
    if (["Harvester", "WarFactory"].includes(unit.type)) {
      return { valid: false, reason: "Unit cannot move" };
    }
    return {
      valid: true,
      executedCommand: { type: "move", unitId: unit.id, targetPosition: target },
      expectedEffect: "Unit moves",
    };
  }

  private static validateAttack(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState,
    playerName: string
  ): CommandValidationResult {
    if (!["Rifleman", "Medium Tank", "Light Tank", "Artillery"].includes(unit.type)) {
      return { valid: false, reason: "Unit cannot attack" };
    }
    const targetUnit = gameState.units.find((u) => u.owner !== playerName && u.x === target.x && u.y === target.y);
    if (!targetUnit) {
      return { valid: false, reason: "No enemy target" };
    }
    return {
      valid: true,
      executedCommand: { type: "attack", unitId: unit.id, targetUnitId: targetUnit.id, targetPosition: target },
      expectedEffect: "Attacks enemy",
    };
  }

  private static validateGather(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState
  ): CommandValidationResult {
    if (unit.type !== "Harvester") {
      return { valid: false, reason: "Only Harvester can gather" };
    }
    if (target.x < 0 || target.x >= gameState.mapWidth || target.y < 0 || target.y >= gameState.mapHeight) {
      return { valid: false, reason: "Target out of bounds" };
    }
    return {
      valid: true,
      executedCommand: { type: "gather", unitId: unit.id, targetPosition: target },
      expectedEffect: "Gathers resources",
    };
  }

  private static validateBuild(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState,
    playerName: string
  ): CommandValidationResult {
    if (unit.type !== "MCV") {
      return { valid: false, reason: "Only MCV can build" };
    }
    const occupied = gameState.buildings.find((b) => b.x === target.x && b.y === target.y);
    if (occupied) {
      return { valid: false, reason: "Position occupied" };
    }
    return {
      valid: true,
      executedCommand: { type: "build", unitId: unit.id, targetPosition: target, buildingType: "BarracksN" },
      expectedEffect: "Builds structure",
    };
  }

  private static validateTrain(
    unit: OpenRAUnit,
    gameState: OpenRAGameState,
    playerName: string
  ): CommandValidationResult {
    const building = gameState.buildings.find(
      (b) => b.owner === playerName && ["BarracksN", "WarFactory"].includes(b.type)
    );
    if (!building) {
      return { valid: false, reason: "No production building" };
    }
    return {
      valid: true,
      executedCommand: { type: "train", unitId: unit.id, targetBuildingId: building.id, buildingType: "Rifleman" },
      expectedEffect: "Trains unit",
    };
  }

  private static validateStop(unit: OpenRAUnit): CommandValidationResult {
    return {
      valid: true,
      executedCommand: { type: "stop", unitId: unit.id },
      expectedEffect: "Stops action",
    };
  }

  private static validatePatrol(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState
  ): CommandValidationResult {
    if (target.x < 0 || target.x >= gameState.mapWidth || target.y < 0 || target.y >= gameState.mapHeight) {
      return { valid: false, reason: "Target out of bounds" };
    }
    const patrolEnd = { x: Math.min(gameState.mapWidth - 1, target.x + 10), y: target.y };
    return {
      valid: true,
      executedCommand: { type: "patrol", unitId: unit.id, patrolStart: { x: unit.x, y: unit.y }, patrolEnd },
      expectedEffect: "Patrols",
    };
  }

  private static validateRepair(
    unit: OpenRAUnit,
    target: { x: number; y: number },
    gameState: OpenRAGameState,
    playerName: string
  ): CommandValidationResult {
    if (unit.type !== "Engineer") {
      return { valid: false, reason: "Only Engineer can repair" };
    }
    const targetBuilding = gameState.buildings.find(
      (b) => b.owner === playerName && b.x === target.x && b.y === target.y && b.health < b.maxHealth
    );
    if (!targetBuilding) {
      return { valid: false, reason: "No damaged building" };
    }
    return {
      valid: true,
      executedCommand: { type: "repair", unitId: unit.id, targetBuildingId: targetBuilding.id, targetPosition: target },
      expectedEffect: "Repairs building",
    };
  }
}
