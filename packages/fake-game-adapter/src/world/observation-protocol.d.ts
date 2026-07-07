/**
 * Observation & Prompt Protocol
 *
 * Canonical format for world observations.
 * Every LLM provider receives EXACTLY the same information.
 * Supports both structured JSON and human-readable prompt rendering.
 */
import type { FakeWorldSnapshot } from './fake-world-state.js';
export interface ObservationJSON {
    readonly tick: number;
    readonly gameState: string;
    readonly resources: number;
    readonly workers: ReadonlyArray<{
        readonly id: number;
        readonly position: {
            x: number;
            y: number;
        };
        readonly carrying: number;
        readonly busy: boolean;
    }>;
    readonly military: ReadonlyArray<{
        readonly id: string;
        readonly type: string;
        readonly position: {
            x: number;
            y: number;
        };
        readonly health: number;
    }>;
    readonly knownEnemies: ReadonlyArray<{
        readonly id: string;
        readonly position: {
            x: number;
            y: number;
        };
        readonly lastSeen: number;
    }>;
    readonly resourceDeposits: ReadonlyArray<{
        readonly location: string;
        readonly remaining: number;
    }>;
    readonly base: {
        x: number;
        y: number;
    };
}
export interface ObservationContext {
    readonly timestamp: number;
    readonly matchId: string;
    readonly playerId: string;
}
export interface CanonicalObservation {
    readonly context: ObservationContext;
    readonly json: ObservationJSON;
    readonly prompt: string;
}
/**
 * Converts world snapshot to canonical JSON format
 */
export declare function worldToJSON(world: FakeWorldSnapshot): ObservationJSON;
/**
 * Renders canonical observation as human-readable prompt
 */
export declare function renderPrompt(observation: ObservationJSON): string;
/**
 * Creates canonical observation from world state
 */
export declare function createObservation(world: FakeWorldSnapshot, matchId: string, playerId: string): CanonicalObservation;
/**
 * Validates observation integrity
 */
export declare function validateObservation(observation: CanonicalObservation): string[];
/**
 * Observation statistics for analysis
 */
export declare function getObservationStats(observation: CanonicalObservation): {
    workerCount: number;
    militaryCount: number;
    enemyCount: number;
    depositCount: number;
    totalUnits: number;
    promptLength: number;
    jsonSize: number;
};
//# sourceMappingURL=observation-protocol.d.ts.map