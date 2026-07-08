/**
 * Decision Timeline
 *
 * Format and display decision history with observation → reasoning → command flow.
 * - Map decisions to timeline frames
 * - Extract observation snapshots
 * - Format reasoning and commands for display
 */
/**
 * Format a raw command string into structured commands
 */
function parseCommands(commandString) {
    // If it's a JSON array, parse it
    if (commandString.startsWith('[')) {
        try {
            const parsed = JSON.parse(commandString);
            if (Array.isArray(parsed)) {
                return parsed.map((cmd, i) => ({
                    id: `cmd-${i}`,
                    action: typeof cmd === 'string' ? cmd : cmd.action || 'unknown',
                    target: typeof cmd === 'object' ? cmd.target : undefined,
                    parameters: typeof cmd === 'object' && cmd.parameters ? cmd.parameters : undefined,
                }));
            }
        }
        catch {
            // Fall through to string parsing
        }
    }
    // Parse as space-separated commands
    const commands = commandString
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    return commands.map((cmd, i) => ({
        id: `cmd-${i}`,
        action: cmd,
    }));
}
/**
 * Decision timeline manager
 */
export class DecisionTimeline {
    entries = new Map();
    /**
     * Add decision to timeline
     */
    addDecision(decision, observation) {
        const commands = this.parseCommandList(decision.commands);
        const entry = {
            tick: decision.tick,
            timestamp: decision.timestamp,
            player: decision.player === 'player1' ? 'Player 1' : 'Player 2',
            brain: decision.brainName,
            observation: {
                tick: observation.tick,
                unitCount: observation.gameState.unitCount,
                buildingCount: observation.gameState.buildingCount,
                playerCount: observation.gameState.playerCount,
                resourcesPerPlayer: [...observation.gameState.resourcesPerPlayer],
            },
            reasoning: decision.reasoning || '',
            commands,
            duration: decision.durationMs,
            commandCount: commands.length,
        };
        this.entries.set(decision.tick, entry);
    }
    /**
     * Parse command list from decision
     */
    parseCommandList(commands) {
        if (Array.isArray(commands)) {
            return commands.map((cmd, i) => parseCommands(cmd).map((c) => ({ ...c, id: `${i}-${c.id}` }))).flat();
        }
        return parseCommands(commands);
    }
    /**
     * Get decision at tick
     */
    getDecision(tick) {
        return this.entries.get(tick) || null;
    }
    /**
     * Get decisions in range
     */
    getDecisionsInRange(startTick, endTick) {
        const results = [];
        for (let tick = startTick; tick <= endTick; tick++) {
            const entry = this.entries.get(tick);
            if (entry) {
                results.push(entry);
            }
        }
        return results;
    }
    /**
     * Get all decisions
     */
    getAllDecisions() {
        return Array.from(this.entries.values()).sort((a, b) => a.tick - b.tick);
    }
    /**
     * Get decisions by player
     */
    getDecisionsByPlayer(player) {
        return this.getAllDecisions().filter((d) => d.player === player);
    }
    /**
     * Get decisions by brain
     */
    getDecisionsByBrain(brainName) {
        return this.getAllDecisions().filter((d) => d.brain === brainName);
    }
    /**
     * Search decisions by reasoning keyword
     */
    searchByReasoning(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return this.getAllDecisions().filter((d) => d.reasoning.toLowerCase().includes(lowerKeyword));
    }
    /**
     * Get decision statistics
     */
    getStatistics() {
        const decisions = this.getAllDecisions();
        if (decisions.length === 0) {
            return {
                totalDecisions: 0,
                averageDuration: 0,
                totalCommands: 0,
                averageCommandsPerDecision: 0,
            };
        }
        const totalDuration = decisions.reduce((sum, d) => sum + d.duration, 0);
        const totalCommands = decisions.reduce((sum, d) => sum + d.commandCount, 0);
        return {
            totalDecisions: decisions.length,
            averageDuration: Math.round(totalDuration / decisions.length),
            totalCommands,
            averageCommandsPerDecision: Math.round((totalCommands / decisions.length) * 100) / 100,
        };
    }
    /**
     * Get ticks with decisions
     */
    getTicksWithDecisions() {
        return Array.from(this.entries.keys()).sort((a, b) => a - b);
    }
}
//# sourceMappingURL=decision-timeline.js.map