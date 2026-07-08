export class CommandVerifier {
    logger;
    previousState = null;
    verificationHistory = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Verify that a command had its intended effect on the world state.
     * Compares state before and after command execution.
     */
    verify(command, currentState, previousState) {
        const startTime = Date.now();
        try {
            if (!previousState) {
                const result = {
                    commandId: command.id,
                    verified: false,
                    latencyMs: Date.now() - startTime,
                    evidence: 'No previous state available for comparison',
                };
                this.verificationHistory.set(command.id, result);
                return result;
            }
            // Command verification logic depends on command type
            let verified = false;
            let evidence = '';
            switch (command.type) {
                case 'move':
                    [verified, evidence] = this.verifyMove(command, currentState, previousState);
                    break;
                case 'attack':
                    [verified, evidence] = this.verifyAttack(command, currentState, previousState);
                    break;
                case 'gather':
                    [verified, evidence] = this.verifyGather(command, currentState, previousState);
                    break;
                case 'build':
                    [verified, evidence] = this.verifyBuild(command, currentState, previousState);
                    break;
                case 'train':
                    [verified, evidence] = this.verifyTrain(command, currentState, previousState);
                    break;
                case 'patrol':
                    [verified, evidence] = this.verifyPatrol(command, currentState, previousState);
                    break;
                case 'repair':
                    [verified, evidence] = this.verifyRepair(command, currentState, previousState);
                    break;
                case 'stop':
                    [verified, evidence] = this.verifyStop(command, currentState, previousState);
                    break;
                default:
                    throw new Error(`Unknown command type: ${command.type}`);
            }
            const result = {
                commandId: command.id,
                verified,
                latencyMs: Date.now() - startTime,
                evidence,
            };
            this.verificationHistory.set(command.id, result);
            if (verified) {
                this.logger.debug('Command verified', { commandId: command.id, evidence });
            }
            else {
                this.logger.warn('Command verification failed', { commandId: command.id, evidence });
            }
            return result;
        }
        catch (err) {
            const result = {
                commandId: command.id,
                verified: false,
                latencyMs: Date.now() - startTime,
                evidence: 'Verification error',
                error: err instanceof Error ? err.message : String(err),
            };
            this.verificationHistory.set(command.id, result);
            this.logger.error('Command verification error', err);
            return result;
        }
    }
    updatePreviousState(state) {
        this.previousState = state;
    }
    getVerificationResult(commandId) {
        return this.verificationHistory.get(commandId);
    }
    getMetrics() {
        const total = this.verificationHistory.size;
        const verified = Array.from(this.verificationHistory.values()).filter((r) => r.verified).length;
        return {
            totalVerified: total,
            successfulVerifications: verified,
            failedVerifications: total - verified,
            verificationRate: total > 0 ? ((verified / total) * 100).toFixed(1) : '0.0',
        };
    }
    clearHistory() {
        this.verificationHistory.clear();
    }
    verifyMove(cmd, current, previous) {
        // Verify that at least one unit has moved closer to target or reached it
        const unitIds = cmd.entityIds;
        const targetPos = { x: cmd.targetX, z: cmd.targetZ };
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        const previousUnits = new Map(previous.units.map((u) => [u.id, u]));
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            const previousUnit = previousUnits.get(unitId);
            if (!currentUnit || !previousUnit)
                continue;
            const currentDist = this.distance(currentUnit.position, targetPos);
            const previousDist = this.distance(previousUnit.position, targetPos);
            // Unit should be closer to target or have orders set
            if (currentDist < previousDist || (currentUnit.orders && currentUnit.orders.length > 0)) {
                return [true, `Unit ${unitId} moved closer to target (${previousDist.toFixed(1)} → ${currentDist.toFixed(1)})`];
            }
        }
        return [false, `No units moved toward target position (${targetPos.x}, ${targetPos.z})`];
    }
    verifyAttack(cmd, current, previous) {
        // Verify that units have attack orders or target entity shows damage
        const unitIds = cmd.entityIds;
        const targetId = cmd.targetEntityId;
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        const previousUnits = new Map(previous.units.map((u) => [u.id, u]));
        const currentTargetUnit = currentUnits.get(targetId);
        const previousTargetUnit = previousUnits.get(targetId);
        // Check if attacking units have combat orders
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            if (currentUnit?.orders?.includes('attack')) {
                return [true, `Unit ${unitId} has attack order against target ${targetId}`];
            }
        }
        // Check if target unit took damage
        if (currentTargetUnit && previousTargetUnit && currentTargetUnit.health < previousTargetUnit.health) {
            const damage = previousTargetUnit.health - currentTargetUnit.health;
            return [true, `Target unit ${targetId} took ${damage} damage`];
        }
        return [false, `Target unit ${targetId} shows no signs of attack`];
    }
    verifyGather(cmd, current, previous) {
        // Verify that units have gather orders or are in resource gathering state
        const unitIds = cmd.entityIds;
        const targetId = cmd.targetEntityId;
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            if (currentUnit?.orders?.includes('gather') || currentUnit?.orders?.includes('resource-gather')) {
                return [true, `Unit ${unitId} has gather order against target ${targetId}`];
            }
        }
        return [false, `No units have gather orders for target ${targetId}`];
    }
    verifyBuild(cmd, current, previous) {
        // Verify that a new building was created or construction started
        const posX = cmd.positionX;
        const posZ = cmd.positionZ;
        const template = cmd.templateName;
        const currentBuildings = current.buildings;
        const previousBuildingCount = previous.buildings.length;
        const currentBuildingCount = currentBuildings.length;
        // Check if new building was created
        if (currentBuildingCount > previousBuildingCount) {
            const newBuilding = currentBuildings.find((b) => b.position.x === posX && b.position.z === posZ && b.type === template);
            if (newBuilding) {
                return [true, `Building ${newBuilding.id} constructed at (${posX}, ${posZ})`];
            }
        }
        return [false, `No building constructed at target position (${posX}, ${posZ})`];
    }
    verifyTrain(cmd, current, previous) {
        // Verify that building has units in production queue
        const builderId = cmd.builderEntityId;
        const template = cmd.templateName;
        const currentBuildings = new Map(current.buildings.map((b) => [b.id, b]));
        const currentBuilding = currentBuildings.get(builderId);
        if (currentBuilding?.production && currentBuilding.production.length > 0) {
            return [true, `Building ${builderId} has ${currentBuilding.production.length} units in production queue`];
        }
        return [false, `Building ${builderId} has no units in production queue`];
    }
    verifyPatrol(cmd, current, previous) {
        // Verify that units have patrol orders
        const unitIds = cmd.entityIds;
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            if (currentUnit?.orders?.includes('patrol')) {
                return [true, `Unit ${unitId} has patrol order`];
            }
        }
        return [false, `No units have patrol orders`];
    }
    verifyRepair(cmd, current, previous) {
        // Verify that target building is being repaired (health increasing)
        const unitIds = cmd.entityIds;
        const targetId = cmd.targetEntityId;
        const currentBuildings = new Map(current.buildings.map((b) => [b.id, b]));
        const previousBuildings = new Map(previous.buildings.map((b) => [b.id, b]));
        const currentTarget = currentBuildings.get(targetId);
        const previousTarget = previousBuildings.get(targetId);
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        // Check if repair units have repair orders
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            if (currentUnit?.orders?.includes('repair')) {
                return [true, `Unit ${unitId} has repair order for target ${targetId}`];
            }
        }
        // Check if target building health increased
        if (currentTarget && previousTarget && currentTarget.health > previousTarget.health) {
            const healed = currentTarget.health - previousTarget.health;
            return [true, `Building ${targetId} repaired by ${healed} health`];
        }
        return [false, `Building ${targetId} shows no repair progress`];
    }
    verifyStop(cmd, current, previous) {
        // Verify that units have no orders (stopped)
        const unitIds = cmd.entityIds;
        const currentUnits = new Map(current.units.map((u) => [u.id, u]));
        let stoppedCount = 0;
        for (const unitId of unitIds) {
            const currentUnit = currentUnits.get(unitId);
            if (!currentUnit?.orders || currentUnit.orders.length === 0) {
                stoppedCount++;
            }
        }
        if (stoppedCount > 0) {
            return [true, `${stoppedCount}/${unitIds.length} units stopped`];
        }
        return [false, `No units were stopped`];
    }
    distance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dz = pos1.z - pos2.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
}
//# sourceMappingURL=command-verifier.js.map