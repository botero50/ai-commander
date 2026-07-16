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
import { Logger } from '../config/logger.js';
import type { WorldState } from '@ai-commander/domain';
export interface BroadcastPlayer {
    id: number;
    name: string;
    civilization: string;
    faction?: string;
    resources?: {
        wood: number;
        stone: number;
        food: number;
        metal?: number;
    };
    population?: number;
    units: number;
    buildings: number;
    militaryValue: number;
    economyScore: number;
    phase: string;
    researched_techs: number;
    queued_techs: number;
    provider?: string;
    model?: string;
    latency?: number;
    currentTrashTalk?: {
        message: string;
        tick: number;
    };
    status: 'active' | 'defeated' | 'victorious';
}
export interface BroadcastMatch {
    matchId: string;
    map: {
        name: string;
        displayName: string;
        players: number;
    };
    players: BroadcastPlayer[];
    state: 'intro' | 'running' | 'conclusion' | 'ended';
    startTick: number;
    currentTick: number;
    estimatedDuration?: number;
    result?: {
        winner: {
            id: number;
            name: string;
            civilization: string;
        };
        losers: Array<{
            id: number;
            name: string;
            civilization: string;
        }>;
        duration: number;
        reason: string;
    };
    history?: {
        matchNumber: number;
        previousResults?: Array<{
            winner: string;
            loser: string;
            duration: number;
            date: string;
        }>;
    };
}
export interface BroadcastStreamState {
    match: BroadcastMatch;
    timestamp: string;
    recentEvents?: Array<{
        type: string;
        playerId?: number;
        tick: number;
        description: string;
    }>;
}
/**
 * Arena context — what's actually available during match execution
 */
export interface ArenaMatchContext {
    matchId: string;
    matchNumber: number;
    map: string;
    mapDisplayName: string;
    worldState: WorldState;
    player1: {
        name: string;
        model: string;
        civilization?: string;
    };
    player2: {
        name: string;
        model: string;
        civilization?: string;
    };
    tick: number;
    isRunning: boolean;
    winner?: string;
    reason?: string;
}
export declare class BroadcastState {
    private logger;
    constructor(logger?: Logger);
    /**
     * Build broadcast state from arena context
     * This transforms real WorldState to broadcast format
     */
    buildState(context: ArenaMatchContext): BroadcastStreamState;
    /**
     * Build player data from WorldState
     */
    private buildPlayer;
    /**
     * Calculate economy score based on buildings and units
     */
    private calculateEconomyScore;
    /**
     * Count units for player
     */
    private countUnits;
    /**
     * Count buildings for player
     */
    private countBuildings;
    /**
     * Calculate military value
     */
    private calculateMilitaryValue;
    /**
     * Determine match state
     */
    private getMatchState;
    /**
     * Build match result
     */
    private buildResult;
    /**
     * Get faction for civilization
     */
    private getFaction;
}
/**
 * Factory function
 */
export declare function createBroadcastState(logger?: Logger): BroadcastState;
//# sourceMappingURL=broadcast-state.d.ts.map