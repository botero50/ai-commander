/**
 * Event Synchronization — Maintain deterministic replay
 *
 * Synchronize observable events:
 * - unit created
 * - unit destroyed
 * - building completed
 * - combat
 * - resources changed
 * - deaths
 *
 * All events keyed by tick for replay.
 */
export type GameEventType = "unit-created" | "unit-destroyed" | "building-started" | "building-completed" | "combat" | "resource-gathered" | "resource-lost" | "player-defeated" | "player-victorious";
export interface GameEvent {
    readonly tick: number;
    readonly timestamp: number;
    readonly type: GameEventType;
    readonly actor: string;
    readonly target?: string;
    readonly detail: Record<string, unknown>;
}
export interface EventTimeline {
    readonly events: GameEvent[];
    readonly lastTick: number;
}
/**
 * EventSynchronizer: Record observable game events for replay
 *
 * Events are recorded as they occur in observable game state.
 * No event inference or hidden state assumptions.
 * Pure observation.
 */
export declare class EventSynchronizer {
    private timeline;
    private lastObservedState;
    recordEvent(event: GameEvent): void;
    detectStateChanges(tick: number, previousUnitIds: Set<string>, currentUnitIds: Set<string>, previousBuildings: Map<string, number>, currentBuildings: Map<string, number>, previousResources: Map<string, number>, currentResources: Map<string, number>): GameEvent[];
    recordCombat(tick: number, attackerId: string, targetId: string, damage: number): void;
    recordPlayerDefeated(tick: number, playerId: string): void;
    recordPlayerVictorious(tick: number, playerId: string): void;
    getTimeline(): EventTimeline;
    getEventsSince(tick: number): GameEvent[];
    exportJSON(): string;
}
//# sourceMappingURL=event-synchronizer.d.ts.map