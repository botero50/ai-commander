/**
 * Worker Validator — Validate worker loop with observable state
 *
 * Validates:
 * 1. Move to ore field
 * 2. Gather resources
 * 3. Return to refinery
 * 4. Deposit resources
 *
 * All observable from game state changes.
 * No hidden assumptions.
 */
/**
 * WorkerValidator: Track worker through complete gather cycle
 */
export class WorkerValidator {
    /**
     * Validate a complete worker cycle.
     *
     * Finds a Harvester unit and validates it:
     * 1. Moves to ore field
     * 2. Gathers resources
     * 3. Returns to refinery
     * 4. Deposits
     */
    static validateWorkerCycle(startState, finalState, events, playerName) {
        const actions = [];
        const errors = [];
        // Find a Harvester
        const harvester = startState.units.find((u) => u.type === "Harvester" && u.owner === playerName);
        if (!harvester) {
            return {
                success: false,
                actions: [],
                errors: ["No Harvester unit found"],
                finalResources: 0,
                cycleTime: 0,
            };
        }
        // Find refinery (ore processing building)
        const refinery = startState.buildings.find((b) => b.type === "Refinery" && b.owner === playerName);
        if (!refinery) {
            return {
                success: false,
                actions: [],
                errors: ["No Refinery building found"],
                finalResources: 0,
                cycleTime: 0,
            };
        }
        // Phase 1: Move to ore field
        const moveEvent = events.find((e) => e.type === "unit-created" ||
            e.detail.unitId === harvester.id);
        if (!moveEvent) {
            errors.push("No movement detected");
        }
        else {
            actions.push({
                tick: moveEvent.tick,
                action: "move-to-field",
                expected: "Harvester moves to ore field",
                observed: true,
            });
        }
        // Phase 2: Gather resources (check resource increase in events)
        const gatherEvent = events.find((e) => e.type === "resource-gathered");
        if (!gatherEvent) {
            errors.push("No resource gathering detected");
            actions.push({
                tick: finalState.tick,
                action: "gathering",
                expected: "Harvester gathers ore",
                observed: false,
            });
        }
        else {
            actions.push({
                tick: gatherEvent.tick,
                action: "gathering",
                expected: "Harvester gathers ore",
                observed: true,
            });
        }
        // Phase 3: Return to refinery
        // Check if Harvester position gets closer to refinery
        const finalHarvester = finalState.units.find((u) => u.id === harvester.id);
        if (!finalHarvester) {
            errors.push("Harvester was destroyed");
        }
        else {
            const distanceToRefinery = Math.abs(finalHarvester.x - refinery.x) +
                Math.abs(finalHarvester.y - refinery.y);
            const returned = distanceToRefinery < 5;
            actions.push({
                tick: finalState.tick,
                action: "return-to-ref",
                expected: "Harvester returns to refinery",
                observed: returned,
            });
            if (!returned) {
                errors.push(`Harvester not returned to refinery (distance: ${distanceToRefinery})`);
            }
        }
        // Phase 4: Deposit resources
        const finalPlayerResources = finalState.players.find((p) => p.name === playerName)?.credits || 0;
        const startPlayerResources = startState.players.find((p) => p.name === playerName)?.credits || 0;
        const resourcesDeposited = finalPlayerResources > startPlayerResources;
        actions.push({
            tick: finalState.tick,
            action: "depositing",
            expected: "Resources deposited at refinery",
            observed: resourcesDeposited,
        });
        if (!resourcesDeposited) {
            errors.push("Resources not deposited");
        }
        const cycleTime = finalState.tick - startState.tick;
        const success = errors.length === 0 && resourcesDeposited;
        return {
            success,
            actions,
            errors,
            finalResources: finalPlayerResources,
            cycleTime,
        };
    }
    /**
     * Validate multiple worker cycles.
     * Check that workers are productive over time.
     */
    static validateMultipleCycles(states, allEvents, playerName, cycles = 3) {
        const cycleResults = [];
        for (let i = 0; i < Math.min(cycles, states.length - 1); i++) {
            const startState = states[i];
            const endIdx = Math.min(i + 50, states.length - 1); // 50 tick cycles
            const endState = states[endIdx];
            const cycleEvents = allEvents.filter((e) => e.tick >= startState.tick && e.tick <= endState.tick);
            const result = this.validateWorkerCycle(startState, endState, cycleEvents, playerName);
            cycleResults.push(result);
        }
        const successCycles = cycleResults.filter((r) => r.success).length;
        const totalResources = cycleResults[cycleResults.length - 1]?.finalResources || 0;
        const avgCycleTime = cycleResults.length > 0
            ? cycleResults.reduce((sum, r) => sum + r.cycleTime, 0) / cycleResults.length
            : 0;
        return {
            success: successCycles >= Math.ceil(cycles * 0.8), // 80% success
            cycleResults,
            totalResourcesGathered: totalResources,
            avgCycleTime,
        };
    }
    /**
     * Generate human-readable report.
     */
    static generateReport(result) {
        const lines = [
            "=== Worker Validation Report ===",
            `Status: ${result.success ? "PASS" : "FAIL"}`,
            `Cycle Time: ${result.cycleTime} ticks`,
            `Final Resources: ${result.finalResources}`,
            "",
            "Actions:",
        ];
        for (const action of result.actions) {
            const status = action.observed ? "✓" : "✗";
            lines.push(`  [${action.tick}] ${status} ${action.action}`);
        }
        if (result.errors.length > 0) {
            lines.push("");
            lines.push("Errors:");
            for (const error of result.errors) {
                lines.push(`  - ${error}`);
            }
        }
        return lines.join("\n");
    }
}
//# sourceMappingURL=worker-validator.js.map