/**
 * Military Validator — Validate combat gameplay
 *
 * Validates:
 * 1. Scouting (units move to explore)
 * 2. Enemy detection (units visible in visibility)
 * 3. Unit production (combat units trained)
 * 4. Combat engagement (combat events)
 * 5. Defense (base protection)
 * 6. Retreat (units preserve when outmatched)
 */

import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";

export interface MilitaryMetrics {
  readonly tick: number;
  readonly combatUnits: number;
  readonly enemiesSpotted: number;
  readonly combatEngagements: number;
  readonly unitsLost: number;
  readonly buildingsDestroyed: number;
}

export interface MilitaryValidationResult {
  readonly success: boolean;
  readonly startMetrics: MilitaryMetrics;
  readonly endMetrics: MilitaryMetrics;
  readonly checks: {
    readonly scoutingWorks: boolean;
    readonly enemyDetection: boolean;
    readonly unitProduction: boolean;
    readonly combatEngagement: boolean;
    readonly defenseWorks: boolean;
    readonly retreatPossible: boolean;
  };
}

/**
 * MilitaryValidator: Validate military gameplay
 */
export class MilitaryValidator {
  /**
   * Validate military from start to end state.
   */
  static validateMilitary(
    startState: OpenRAGameState,
    endState: OpenRAGameState,
    events: GameEvent[],
    playerName: string
  ): MilitaryValidationResult {
    const startMetrics = this.calculateMetrics(startState, 0, playerName);
    const endMetrics = this.calculateMetrics(endState, endState.tick, playerName);

    // Check 1: Scouting (units moved away from base)
    const scoutingWorks = endMetrics.enemiesSpotted > 0;

    // Check 2: Enemy detection (enemies visible in state)
    const enemyDetection = endState.units.some(
      (u) => u.owner !== playerName
    );

    // Check 3: Unit production (combat units trained)
    const unitProductionEvents = events.filter(
      (e) =>
        e.type === "unit-created" &&
        ["Rifleman", "Medium Tank", "Light Tank"].includes(
          e.detail.unitType as string
        )
    );
    const unitProduction = unitProductionEvents.length > 0;
    const unitsProduced = endMetrics.combatUnits - startMetrics.combatUnits;

    // Check 4: Combat engagement (combat events occurred)
    const combatEvents = events.filter((e) => e.type === "combat");
    const combatEngagement = combatEvents.length > 0;

    // Check 5: Defense works (base intact or minimal loss)
    const startBuildings = startState.buildings.filter(
      (b) => b.owner === playerName
    ).length;
    const endBuildings = endState.buildings.filter(
      (b) => b.owner === playerName
    ).length;
    const buildingsDestroyed = startBuildings - endBuildings;
    const defenseWorks = buildingsDestroyed <= 1; // At most 1 building lost

    // Check 6: Retreat possible (units survive)
    const startUnits = startState.units.filter(
      (u) => u.owner === playerName
    ).length;
    const endUnits = endState.units.filter(
      (u) => u.owner === playerName
    ).length;
    const unitsLost = startUnits - endUnits;
    const retreatPossible = unitsLost <= startUnits * 0.3; // Lost < 30%

    const success =
      unitProduction &&
      combatEngagement &&
      (defenseWorks || retreatPossible);

    return {
      success,
      startMetrics,
      endMetrics,
      checks: {
        scoutingWorks,
        enemyDetection,
        unitProduction,
        combatEngagement,
        defenseWorks,
        retreatPossible,
      },
    };
  }

  /**
   * Calculate military metrics.
   */
  private static calculateMetrics(
    state: OpenRAGameState,
    tick: number,
    playerName: string
  ): MilitaryMetrics {
    const combatUnits = state.units.filter(
      (u) =>
        u.owner === playerName &&
        ["Rifleman", "Medium Tank", "Light Tank", "Artillery"].includes(
          u.type
        )
    ).length;

    const enemiesSpotted = state.units.filter(
      (u) => u.owner !== playerName
    ).length;

    const buildingsDestroyed = state.buildings.filter(
      (b) => b.owner !== playerName && b.health < b.maxHealth
    ).length;

    const unitsLost = state.units.filter(
      (u) => u.owner !== playerName
    ).length;

    return {
      tick,
      combatUnits,
      enemiesSpotted,
      combatEngagements: 0, // Calculated from events
      unitsLost,
      buildingsDestroyed,
    };
  }

  /**
   * Generate report.
   */
  static generateReport(result: MilitaryValidationResult): string {
    const lines = [
      "=== Military Validation Report ===",
      `Status: ${result.success ? "PASS" : "FAIL"}`,
      "",
      "Metrics:",
      `  Start: ${result.startMetrics.combatUnits} combat units`,
      `  End:   ${result.endMetrics.combatUnits} combat units (${result.endMetrics.combatUnits - result.startMetrics.combatUnits} produced)`,
      "",
      "Checks:",
      `  Scouting: ${result.checks.scoutingWorks ? "✓" : "✗"}`,
      `  Enemy detection: ${result.checks.enemyDetection ? "✓" : "✗"}`,
      `  Unit production: ${result.checks.unitProduction ? "✓" : "✗"}`,
      `  Combat engagement: ${result.checks.combatEngagement ? "✓" : "✗"}`,
      `  Defense: ${result.checks.defenseWorks ? "✓" : "✗"}`,
      `  Retreat possible: ${result.checks.retreatPossible ? "✓" : "✗"}`,
    ];

    return lines.join("\n");
  }
}
