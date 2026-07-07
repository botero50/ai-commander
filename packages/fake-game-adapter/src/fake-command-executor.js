import { AdapterErrorCode } from '@ai-commander/adapter';
import { moveWorker, waitWorker, gatherWorker, depositWorker, produceWorker, trainMilitaryUnit, scoutArea, moveMilitaryUnit, attackUnit, } from './world/fake-world-state.js';
import { parseFakeCommand } from './types/fake-command.js';
/**
 * Fake command executor.
 *
 * Executes framework Commands against the in-memory fake world.
 * Maps framework commands to world state mutations.
 */
export class FakeCommandExecutor {
    constructor(initialWorld) {
        this.available = false;
        this.onWorldChanged = null;
        this.world = initialWorld;
        this.available = true;
    }
    async isExecutionAvailable() {
        return Promise.resolve(this.available);
    }
    async canExecuteCommand(command) {
        if (!this.available) {
            return Promise.resolve(false);
        }
        const fakeCmd = parseFakeCommand(command.actionType, command.parameters, command.agentId);
        return Promise.resolve(fakeCmd !== null);
    }
    async executeCommand(command) {
        if (!this.available) {
            return {
                success: false,
                message: 'Execution provider is not available',
                error: {
                    code: AdapterErrorCode.ExecutionUnavailable,
                    reason: 'Executor is not available',
                },
            };
        }
        const fakeCmd = parseFakeCommand(command.actionType, command.parameters, command.agentId);
        if (!fakeCmd) {
            return {
                success: false,
                message: `Unknown command type: ${command.actionType}`,
                error: {
                    code: AdapterErrorCode.CommandInvalid,
                    reason: `Unknown action type: ${command.actionType}`,
                },
            };
        }
        try {
            let newWorld;
            if (fakeCmd.type === 'move') {
                newWorld = moveWorker(this.world, fakeCmd.workerId, fakeCmd.dx, fakeCmd.dy);
            }
            else if (fakeCmd.type === 'wait') {
                newWorld = waitWorker(this.world, fakeCmd.workerId);
            }
            else if (fakeCmd.type === 'gather') {
                newWorld = gatherWorker(this.world, fakeCmd.workerId);
            }
            else if (fakeCmd.type === 'deposit') {
                newWorld = depositWorker(this.world, fakeCmd.workerId);
            }
            else if (fakeCmd.type === 'produce') {
                newWorld = produceWorker(this.world);
            }
            else if (fakeCmd.type === 'train') {
                newWorld = trainMilitaryUnit(this.world, fakeCmd.unitType);
            }
            else if (fakeCmd.type === 'scout') {
                newWorld = scoutArea(this.world, fakeCmd.unitId);
            }
            else if (fakeCmd.type === 'move-military') {
                newWorld = moveMilitaryUnit(this.world, fakeCmd.unitId, fakeCmd.dx, fakeCmd.dy);
            }
            else if (fakeCmd.type === 'attack') {
                newWorld = attackUnit(this.world, fakeCmd.attackerId, fakeCmd.targetId);
            }
            else {
                const _exhaustive = fakeCmd;
                const exhaustiveCheck = _exhaustive;
                throw new Error(`Unexpected command type: ${String(exhaustiveCheck.type)}`);
            }
            this.world = newWorld;
            if (this.onWorldChanged) {
                this.onWorldChanged(newWorld);
            }
            return Promise.resolve({
                success: true,
                message: `Executed ${fakeCmd.type} command`,
                data: { newTick: newWorld.tick },
            });
        }
        catch (err) {
            return Promise.resolve({
                success: false,
                message: `Failed to execute command: ${err instanceof Error ? err.message : 'unknown error'}`,
                error: {
                    code: AdapterErrorCode.CommandFailed,
                    reason: 'Command execution failed',
                },
            });
        }
    }
    // Internal: Register callback for world changes
    onWorldChange(callback) {
        this.onWorldChanged = callback;
    }
    // Internal: Mark executor as unavailable
    markUnavailable() {
        this.available = false;
    }
    // Internal: Mark executor as available
    markAvailable() {
        this.available = true;
    }
    // Internal: Get current world
    getCurrentWorld() {
        return this.world;
    }
}
//# sourceMappingURL=fake-command-executor.js.map