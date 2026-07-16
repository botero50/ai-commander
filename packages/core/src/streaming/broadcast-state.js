"use strict";
/**
 * EPIC 61.3 — Broadcast State (Real Arena Integration)
 *
 * Lightweight view layer that transforms arena data to broadcast format.
 * Reads directly from WorldState and arena context (no service aggregation).
 *
 * Data Flow:
 *   Arena Loop (WorldState, match context)
 *     ↓
 *   BroadcastState.buildState() (transformation only)
 *     ↓
 *   Broadcast Overlay (real data only)
 *
 * Key Design: BroadcastState is a VIEW of existing runtime state.
 * It does NOT create a second source of truth.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BroadcastState = void 0;
exports.createBroadcastState = createBroadcastState;
const logger_js_1 = require("../config/logger.js");
class BroadcastState {
    logger;
    constructor(logger) {
        this.logger = logger || new logger_js_1.Logger('info', 'BroadcastState');
    }
    /**
     * Build broadcast state from arena context
     * This transforms real WorldState to broadcast format
     */
    buildState(context) {
        // Debug: log player count and structure
        if (context.tick % 500 === 0) {
            this.logger.debug('Building broadcast state', {
                tick: context.tick,
                playersInWorldState: context.worldState.players?.length || 0,
                playerStructure: context.worldState.players?.map((p) => ({
                    id: p.id,
                    name: p.name,
                    hasCustomData: !!p.customData,
                    customDataKeys: p.customData ? Object.keys(p.customData) : [],
                })) || [],
            });
        }
        return {
            match: {
                matchId: context.matchId,
                map: {
                    name: context.map,
                    displayName: context.mapDisplayName,
                    players: 2,
                },
                players: [
                    this.buildPlayer(1, context),
                    this.buildPlayer(2, context),
                ],
                state: this.getMatchState(context),
                startTick: 0,
                currentTick: context.tick,
                estimatedDuration: 1800,
                result: context.winner ? this.buildResult(context) : undefined,
            },
            timestamp: new Date().toISOString(),
            recentEvents: [],
        };
    }
    /**
     * Build player data from WorldState
     */
    buildPlayer(playerId, context) {
        const worldPlayer = context.worldState.players?.[playerId - 1];
        const playerContext = playerId === 1 ? context.player1 : context.player2;
        const customData = (worldPlayer?.customData || {});
        const units = this.countUnits(context.worldState, playerId);
        const buildings = this.countBuildings(context.worldState, playerId);
        return {
            id: playerId,
            name: playerContext.name,
            civilization: playerContext.civilization || 'Unknown',
            faction: this.getFaction(playerContext.civilization),
            // Resources and Population
            resources: customData.resources || {
                wood: 0,
                stone: 0,
                food: 0,
                metal: 0,
            },
            population: customData.population || 0,
            // Military & Economy
            units,
            buildings,
            militaryValue: this.calculateMilitaryValue(context.worldState, playerId),
            economyScore: this.calculateEconomyScore(units, buildings),
            // Technology Progress
            phase: customData.phase || 'village',
            researched_techs: Array.isArray(customData.researched_techs) ? customData.researched_techs.length : 0,
            queued_techs: Array.isArray(customData.queued_techs) ? customData.queued_techs.length : 0,
            // AI metadata
            provider: playerContext.model,
            model: playerContext.model,
            // Match status
            status: customData.state || 'active',
        };
    }
    /**
     * Calculate economy score based on buildings and units
     */
    calculateEconomyScore(units, buildings) {
        // Rough score: buildings are more valuable for economy
        return Math.floor(buildings * 50 + units * 10);
    }
    /**
     * Count units for player
     */
    countUnits(worldState, playerId) {
        if (!worldState.agents)
            return 0;
        const playerIdStr = String(playerId);
        return worldState.agents.filter(a => String(a.controlledByPlayerId) === playerIdStr && a.customData?.type === 'unit').length;
    }
    /**
     * Count buildings for player
     */
    countBuildings(worldState, playerId) {
        if (!worldState.agents)
            return 0;
        const playerIdStr = String(playerId);
        return worldState.agents.filter(a => String(a.controlledByPlayerId) === playerIdStr && a.customData?.type === 'building').length;
    }
    /**
     * Calculate military value
     */
    calculateMilitaryValue(worldState, playerId) {
        const unitCount = this.countUnits(worldState, playerId);
        return Math.floor(Math.max(unitCount * 0.3, 0)) * 10;
    }
    /**
     * Determine match state
     */
    getMatchState(context) {
        if (!context.isRunning)
            return 'ended';
        if (context.tick < 1)
            return 'intro';
        if (context.tick > 1700)
            return 'conclusion';
        return 'running';
    }
    /**
     * Build match result
     */
    buildResult(context) {
        const winner = context.winner === 'player1' ? context.player1 : context.player2;
        const loser = context.winner === 'player1' ? context.player2 : context.player1;
        return {
            winner: {
                id: context.winner === 'player1' ? 1 : 2,
                name: winner.name,
                civilization: winner.civilization || 'Unknown',
            },
            losers: [{
                    id: context.winner === 'player1' ? 2 : 1,
                    name: loser.name,
                    civilization: loser.civilization || 'Unknown',
                }],
            duration: context.tick,
            reason: context.reason || 'Victory',
        };
    }
    /**
     * Get faction for civilization
     */
    getFaction(civName) {
        if (!civName)
            return 'unknown';
        const factions = {
            athenians: 'greek',
            britons: 'celtic',
            carthaginians: 'punic',
            gauls: 'celtic',
            germans: 'germanic',
            han: 'chinese',
            iberians: 'iberian',
            kushites: 'african',
            macedonians: 'greek',
            mauryas: 'indian',
            persians: 'persian',
            ptolemies: 'greek',
            romans: 'italic',
            seleucids: 'hellenistic',
            spartans: 'greek',
        };
        return factions[civName.toLowerCase()] || 'unknown';
    }
}
exports.BroadcastState = BroadcastState;
/**
 * Factory function
 */
function createBroadcastState(logger) {
    return new BroadcastState(logger);
}
//# sourceMappingURL=broadcast-state.js.map