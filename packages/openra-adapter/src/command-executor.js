export class CommandExecutor {
    static executeCommand(brainCommand, unitId, gameState, playerName) {
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
        const target = brainCommand.target;
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
    static parseCommandType(action) {
        const types = ["move", "attack", "gather", "build", "train", "stop", "patrol", "repair"];
        for (const type of types) {
            if (action.toLowerCase().includes(type))
                return type;
        }
        return null;
    }
    static validateMove(unit, target, gameState) {
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
    static validateAttack(unit, target, gameState, playerName) {
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
    static validateGather(unit, target, gameState) {
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
    static validateBuild(unit, target, gameState, playerName) {
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
    static validateTrain(unit, gameState, playerName) {
        const building = gameState.buildings.find((b) => b.owner === playerName && ["BarracksN", "WarFactory"].includes(b.type));
        if (!building) {
            return { valid: false, reason: "No production building" };
        }
        return {
            valid: true,
            executedCommand: { type: "train", unitId: unit.id, targetBuildingId: building.id, buildingType: "Rifleman" },
            expectedEffect: "Trains unit",
        };
    }
    static validateStop(unit) {
        return {
            valid: true,
            executedCommand: { type: "stop", unitId: unit.id },
            expectedEffect: "Stops action",
        };
    }
    static validatePatrol(unit, target, gameState) {
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
    static validateRepair(unit, target, gameState, playerName) {
        if (unit.type !== "Engineer") {
            return { valid: false, reason: "Only Engineer can repair" };
        }
        const targetBuilding = gameState.buildings.find((b) => b.owner === playerName && b.x === target.x && b.y === target.y && b.health < b.maxHealth);
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
//# sourceMappingURL=command-executor.js.map