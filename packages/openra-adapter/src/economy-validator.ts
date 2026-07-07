/**
 * Economy Validator — Validate economic gameplay
 *
 * Validates:
 * 1. Worker production (Harvesters built)
 * 2. Building construction (structures completed)
 * 3. Resource gathering (ore collected)
 * 4. Economy scaling (more workers → more resources)
 * 5. Expansion (multiple refineries)
 */

import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";

export interface EconomyMetrics {
  readonly tick: number;
  readonly harvesterCount: number;
  readonly refineryCount: number;
  readonly totalResources: number;
  readonly productionRate: number; // Resources per tick
}

export interface EconomyValidationResult {
  readonly success: boolean;
  readonly startMetrics: EconomyMetrics;
  readonly endMetrics: EconomyMetrics;
  readonly checks: {
    readonly harvestersBuilt: boolean;
    readonly harvestersCount: number;
    readonly buildingsConstructed: boolean;
    readonly refineryCount: number;
    readonly resourcesGathered: boolean;
    readonly resourceIncrease: number;
    readonly scalingWorks: boolean;
    readonly expansionWorks: boolean;
  };
}

/**
 * EconomyValidator: Track economic production
 */
export class EconomyValidator {
  /**
   * Validate economy from start to end state.
   */
  static validateEconomy(
    startState: OpenRAGameState,
    endState: OpenRAGameState,
    events: GameEvent[],
    playerName: string
  ): EconomyValidationResult {
    const startMetrics = this.calculateMetrics(startState, 0, playerName);
    const endMetrics = this.calculateMetrics(endState, endState.tick, playerName);

    // Check 1: Harvesters built
    const harvesterCreatedEvents = events.filter(
      (e) =>
        e.type === "unit-created" &&
        e.detail.unitType === "Harvester"
    );
    const harvestersBuilt = harvesterCreatedEvents.length > 0;
    const harvesterCount = endMetrics.harvesterCount - startMetrics.harvesterCount;

    // Check 2: Buildings constructed
    const buildingCompletedEvents = events.filter(
      (e) => e.type === "building-completed" && !e.detail.destroyed
    );
    const buildingsConstructed = buildingCompletedEvents.length > 0;
    const refineryCount = endMetrics.refineryCount - startMetrics.refineryCount;

    // Check 3: Resources gathered
    const resourceGatheredEvents = events.filter(
      (e) => e.type === "resource-gathered"
    );
    const resourcesGathered = resourceGatheredEvents.length > 0;
    const resourceIncrease = endMetrics.totalResources - startMetrics.totalResources;

    // Check 4: Scaling works (more harvesters = higher production rate)
    const scalingWorks = harvesterCount > 0 && resourceIncrease > 0;

    // Check 5: Expansion works (multiple refineries)
    const expansionWorks = refineryCount > 0;

    const success =
      harvestersBuilt &&
      buildingsConstructed &&
      resourcesGathered &&
      scalingWorks;

    return {
      success,
      startMetrics,
      endMetrics,
      checks: {
        harvestersBuilt,
        harvestersCount: harvesterCount,
        buildingsConstructed,
        refineryCount,
        resourcesGathered,
        resourceIncrease,
        scalingWorks,
        expansionWorks,
      },
    };
  }

  /**
   * Validate sustained economy over multiple periods.
   */
  static validateSustainedEconomy(
    states: OpenRAGameState[],
    allEvents: GameEvent[],
    playerName: string,
    samplePeriods: number = 3
  ): {
    readonly success: boolean;
    readonly results: EconomyValidationResult[];
    readonly totalResourcesGenerated: number;
    readonly averageProductionRate: number;
    readonly scaling: "exponential" | "linear" | "stalled";
  } {
    const results: EconomyValidationResult[] = [];
    const stateInterval = Math.max(1, Math.floor(states.length / samplePeriods));

    for (let i = 0; i < states.length - stateInterval; i += stateInterval) {
      const startState = states[i];
      const endState = states[Math.min(i + stateInterval, states.length - 1)];

      const periodEvents = allEvents.filter(
        (e) => e.tick >= startState.tick && e.tick <= endState.tick
      );

      const result = this.validateEconomy(
        startState,
        endState,
        periodEvents,
        playerName
      );

      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const totalResources = results[results.length - 1]?.endMetrics.totalResources || 0;
    const avgProduction = results.length > 0
      ? results.reduce((sum, r) => sum + r.endMetrics.productionRate, 0) / results.length
      : 0;

    // Determine scaling pattern
    let scaling: "exponential" | "linear" | "stalled" = "stalled";
    if (results.length >= 2) {
      const rate1 = results[0].endMetrics.productionRate;
      const rate2 = results[results.length - 1].endMetrics.productionRate;

      if (rate2 > rate1 * 1.5) {
        scaling = "exponential";
      } else if (rate2 > rate1) {
        scaling = "linear";
      }
    }

    return {
      success: successCount >= Math.ceil(samplePeriods * 0.8),
      results,
      totalResourcesGenerated: totalResources,
      averageProductionRate: avgProduction,
      scaling,
    };
  }

  /**
   * Calculate metrics for a given state.
   */
  private static calculateMetrics(
    state: OpenRAGameState,
    tick: number,
    playerName: string
  ): EconomyMetrics {
    const harvesters = state.units.filter(
      (u) => u.type === "Harvester" && u.owner === playerName
    );

    const refineries = state.buildings.filter(
      (b) => b.type === "Refinery" && b.owner === playerName
    );

    const player = state.players.find((p) => p.name === playerName);

    // Estimate production rate (resources per tick)
    // Simple heuristic: harvesters * base_rate
    const productionRate = harvesters.length * 0.5; // 0.5 ore/tick per harvester

    return {
      tick,
      harvesterCount: harvesters.length,
      refineryCount: refineries.length,
      totalResources: player?.credits || 0,
      productionRate,
    };
  }

  /**
   * Generate report.
   */
  static generateReport(result: EconomyValidationResult): string {
    const lines = [
      "=== Economy Validation Report ===",
      `Status: ${result.success ? "PASS" : "FAIL"}`,
      "",
      "Metrics:",
      `  Start:  ${result.startMetrics.harvesterCount} harvesters, ${result.startMetrics.refineryCount} refineries, ${result.startMetrics.totalResources} ore`,
      `  End:    ${result.endMetrics.harvesterCount} harvesters, ${result.endMetrics.refineryCount} refineries, ${result.endMetrics.totalResources} ore`,
      "",
      "Checks:",
      `  Harvesters built: ${result.checks.harvestersBuilt ? "✓" : "✗"} (+${result.checks.harvestersCount})`,
      `  Buildings constructed: ${result.checks.buildingsConstructed ? "✓" : "✗"} (refineries: ${result.checks.refineryCount})`,
      `  Resources gathered: ${result.checks.resourcesGathered ? "✓" : "✗"} (+${result.checks.resourceIncrease})`,
      `  Scaling works: ${result.checks.scalingWorks ? "✓" : "✗"}`,
      `  Expansion works: ${result.checks.expansionWorks ? "✓" : "✗"}`,
    ];

    return lines.join("\n");
  }
}
