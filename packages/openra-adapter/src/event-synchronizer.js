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
/**
 * EventSynchronizer: Record observable game events for replay
 *
 * Events are recorded as they occur in observable game state.
 * No event inference or hidden state assumptions.
 * Pure observation.
 */
export class EventSynchronizer {
    constructor() {
        this.timeline = [];
        this.lastObservedState = new Map();
    }
    recordEvent(event) {
        this.timeline.push(event);
    }
    detectStateChanges(tick, previousUnitIds, currentUnitIds, previousBuildings, currentBuildings, previousResources, currentResources) {
        const events = [];
        // Detect unit creation
        for (const unitId of currentUnitIds) {
            if (!previousUnitIds.has(unitId)) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "unit-created",
                    actor: unitId,
                    detail: { unitId },
                });
            }
        }
        // Detect unit destruction
        for (const unitId of previousUnitIds) {
            if (!currentUnitIds.has(unitId)) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "unit-destroyed",
                    actor: unitId,
                    detail: { unitId },
                });
            }
        }
        // Detect building completion
        for (const [buildingId, previousHealth] of previousBuildings) {
            const currentHealth = currentBuildings.get(buildingId);
            if (currentHealth && previousHealth < 100 && currentHealth === 100) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "building-completed",
                    actor: buildingId,
                    detail: { buildingId },
                });
            }
        }
        // Detect building destruction
        for (const [buildingId, previousHealth] of previousBuildings) {
            if (!currentBuildings.has(buildingId)) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "building-completed", // Destroyed counts as removed
                    actor: buildingId,
                    detail: { buildingId, destroyed: true },
                });
            }
        }
        // Detect resource changes
        for (const [resource, previousAmount] of previousResources) {
            const currentAmount = currentResources.get(resource) || 0;
            if (currentAmount > previousAmount) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "resource-gathered",
                    actor: resource,
                    detail: { resource, amount: currentAmount - previousAmount, total: currentAmount },
                });
            }
            else if (currentAmount < previousAmount) {
                events.push({
                    tick,
                    timestamp: Date.now(),
                    type: "resource-lost",
                    actor: resource,
                    detail: { resource, amount: previousAmount - currentAmount, total: currentAmount },
                });
            }
        }
        return events;
    }
    recordCombat(tick, attackerId, targetId, damage) {
        this.timeline.push({
            tick,
            timestamp: Date.now(),
            type: "combat",
            actor: attackerId,
            target: targetId,
            detail: { attacker: attackerId, target: targetId, damage },
        });
    }
    recordPlayerDefeated(tick, playerId) {
        this.timeline.push({
            tick,
            timestamp: Date.now(),
            type: "player-defeated",
            actor: playerId,
            detail: { player: playerId },
        });
    }
    recordPlayerVictorious(tick, playerId) {
        this.timeline.push({
            tick,
            timestamp: Date.now(),
            type: "player-victorious",
            actor: playerId,
            detail: { player: playerId },
        });
    }
    getTimeline() {
        return {
            events: this.timeline,
            lastTick: this.timeline.length > 0 ? this.timeline[this.timeline.length - 1].tick : 0,
        };
    }
    getEventsSince(tick) {
        return this.timeline.filter((e) => e.tick > tick);
    }
    exportJSON() {
        return JSON.stringify(this.getTimeline(), null, 2);
    }
}
//# sourceMappingURL=event-synchronizer.js.map