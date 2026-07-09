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
/**
 * Standard 0 A.D. command builders
 *
 * Based on 0 A.D. engine command structure:
 * https://gitea.wildfiregames.com/0ad/0ad/src/master/source/simulation2/
 */
export var Commands;
(function (Commands) {
    /**
     * Move units to a location
     * @param entities Entity IDs of units to move
     * @param x Target X coordinate
     * @param z Target Z coordinate (note: 0 A.D. uses X,Z not X,Y)
     * @param queued Whether to queue this command
     */
    function Move(entities, x, z, queued = false) {
        return {
            type: 'Move',
            entities,
            x: Math.round(x),
            z: Math.round(z),
            queued,
        };
    }
    Commands.Move = Move;
    /**
     * Attack a target entity
     * @param entities Entity IDs of attacking units
     * @param target Target entity ID
     * @param queued Whether to queue this command
     */
    function Attack(entities, target, queued = false) {
        return {
            type: 'Attack',
            entities,
            target,
            queued,
        };
    }
    Commands.Attack = Attack;
    /**
     * Gather resources from a location
     * @param entities Entity IDs of gathering units
     * @param target Target resource entity ID
     * @param queued Whether to queue this command
     */
    function Gather(entities, target, queued = false) {
        return {
            type: 'Gather',
            entities,
            target,
            queued,
        };
    }
    Commands.Gather = Gather;
    /**
     * Build a structure
     * @param playerID Player ID performing the build
     * @param template Entity template to build (e.g. "structures/iberian_tower")
     * @param x Build location X
     * @param z Build location Z
     * @param angle Building angle (0-2PI)
     */
    function Build(playerID, template, x, z, angle = 0) {
        return {
            type: 'Build',
            playerID,
            template,
            x: Math.round(x),
            z: Math.round(z),
            angle,
        };
    }
    Commands.Build = Build;
    /**
     * Train units at a structure
     * @param playerID Player ID performing the train
     * @param template Entity template to train (e.g. "units/athenian_soldier_hoplite_b")
     * @param count Number of units to train
     * @param buildingEntity Building entity ID
     */
    function Train(playerID, template, count, buildingEntity) {
        return {
            type: 'Train',
            playerID,
            template,
            count,
            buildingEntity,
        };
    }
    Commands.Train = Train;
    /**
     * Research a technology
     * @param playerID Player ID researching
     * @param technology Technology name
     * @param buildingEntity Building providing tech (e.g. "structures/athenian_temple")
     */
    function Research(playerID, technology, buildingEntity) {
        return {
            type: 'Research',
            playerID,
            technology,
            buildingEntity,
        };
    }
    Commands.Research = Research;
    /**
     * Set stance (aggressive/defensive/passive)
     * @param entities Entity IDs
     * @param stance One of: "Aggressive", "Defensive", "Passive"
     */
    function SetStance(entities, stance) {
        return {
            type: 'SetStance',
            entities,
            stance,
        };
    }
    Commands.SetStance = SetStance;
    /**
     * Repair a structure
     * @param entities Entity IDs of repair units
     * @param target Target structure to repair
     */
    function Repair(entities, target) {
        return {
            type: 'Repair',
            entities,
            target,
        };
    }
    Commands.Repair = Repair;
    /**
     * Delete/cancel a queued command
     * @param entities Entity IDs
     */
    function CancelOrder(entities) {
        return {
            type: 'CancelOrder',
            entities,
        };
    }
    Commands.CancelOrder = CancelOrder;
})(Commands || (Commands = {}));
export class CommandExecutor {
    constructor(client, logger) {
        this.client = client;
        this.logger = logger;
    }
    /**
     * Execute a single command and return results
     */
    async executeCommand(playerID, command, commandType) {
        const result = {
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
            const gameCommand = {
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
        }
        catch (error) {
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
    async executeCommandSequence(commands) {
        const results = [];
        for (const cmd of commands) {
            const result = await this.executeCommand(cmd.playerID, cmd.command, cmd.type);
            results.push(result);
        }
        return results;
    }
    /**
     * Execute all commands in a single tick
     */
    async executeCommandBatch(commands) {
        const gameCommands = commands.map(cmd => ({
            playerID: cmd.playerID,
            json_cmd: cmd.command,
        }));
        this.logger.info('Executing command batch', {
            commandCount: gameCommands.length,
        });
        return await this.client.step(gameCommands);
    }
}
