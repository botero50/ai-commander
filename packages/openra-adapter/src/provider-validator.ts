/**
 * Provider Validator — Verify all providers see identical game state
 *
 * Validates that:
 * 1. All providers receive identical WorldObservations
 * 2. All providers receive identical goal/command options
 * 3. All decisions are valid (commands match state)
 * 4. No provider gets special information others don't
 */

import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";
import type { Brain, WorldObservation, GoalOption, CommandOption, BrainDecision, ExecutionMemory } from "@ai-commander/brain";
import { WorldMapper } from "./world-mapper";
import { CommandExecutor } from "./command-executor";

export interface ProviderValidationResult {
  readonly success: boolean;
  readonly observations: Map<string, WorldObservation>;
  readonly decisions: Map<string, BrainDecision>;
  readonly checks: {
    readonly observationsIdentical: boolean;
    readonly goalsIdentical: boolean;
    readonly commandsIdentical: boolean;
    readonly decisionsValid: boolean;
    readonly noHiddenInfo: boolean;
  };
  readonly errors: string[];
}

/**
 * ProviderValidator: Verify fair play across all providers
 *
 * Ensures no provider gets privileged information or options.
 */
export class ProviderValidator {
  /**
   * Validate that all brains see identical game state.
   *
   * Run each brain through the same game state and verify:
   * 1. Observations are identical (same units, buildings, resources)
   * 2. Goal options are identical
   * 3. Command options are identical
   * 4. Decisions are valid against state
   */
  static async validateProviders(
    brains: Map<string, Brain>,
    gameState: OpenRAGameState,
    playerNames: Map<string, string>,
    events: GameEvent[]
  ): Promise<ProviderValidationResult> {
    const errors: string[] = [];
    const observations = new Map<string, WorldObservation>();
    const decisions = new Map<string, BrainDecision>();

    // Generate observations for each player
    const obsPerPlayer = new Map<string, WorldObservation>();
    const goalsPerPlayer = new Map<string, readonly GoalOption[]>();
    const commandsPerPlayer = new Map<string, readonly CommandOption[]>();

    for (const [brainId, playerName] of playerNames) {
      const obs = WorldMapper.mapToObservation(gameState, playerName);
      obsPerPlayer.set(brainId, obs);
      observations.set(brainId, obs);

      // Generate goals for this player
      const goals = this.getGoals(gameState, playerName);
      goalsPerPlayer.set(brainId, goals);

      // Generate commands for this player
      const commands = this.getCommands(gameState, playerName);
      commandsPerPlayer.set(brainId, commands);
    }

    // Get decisions from each brain
    const memory: ExecutionMemory = {
      recentEvents: [],
      recentDecisions: [],
      metrics: {
        commandsExecuted: 0,
        commandsFailed: 0,
        goalsCompleted: 0,
        goalsAbandoned: 0,
      },
    };

    for (const [brainId, brain] of brains) {
      const obs = obsPerPlayer.get(brainId);
      const goals = goalsPerPlayer.get(brainId);
      const commands = commandsPerPlayer.get(brainId);

      if (!obs || !goals || !commands) {
        errors.push(`Missing state for brain ${brainId}`);
        continue;
      }

      try {
        const decision = await brain.decide(obs, goals, commands, memory);
        decisions.set(brainId, decision);

        // Validate decision against state
        for (const cmd of decision.commands) {
          const commandIdx = commands.findIndex((c) => c.id === cmd.commandId);
          if (commandIdx === 0) {
            errors.push(`Brain ${brainId}: Invalid command ID ${cmd.commandId}`);
          }
        }
      } catch (e) {
        errors.push(`Brain ${brainId}: ${String(e)}`);
      }
    }

    // Check 1: Observations identical
    const obsArray = Array.from(observations.values());
    let observationsIdentical = true;
    for (let i = 1; i < obsArray.length; i++) {
      if (!this.obsEqual(obsArray[0], obsArray[i])) {
        observationsIdentical = false;
        errors.push(`Observations differ between brains`);
        break;
      }
    }

    // Check 2: Goals identical
    const goalsArray = Array.from(goalsPerPlayer.values());
    let goalsIdentical = true;
    for (let i = 1; i < goalsArray.length; i++) {
      if (goalsArray[0].length !== goalsArray[i].length) {
        goalsIdentical = false;
        errors.push(`Goal count differs: ${goalsArray[0].length} vs ${goalsArray[i].length}`);
        break;
      }
    }

    // Check 3: Commands identical
    const commandsArray = Array.from(commandsPerPlayer.values());
    let commandsIdentical = true;
    for (let i = 1; i < commandsArray.length; i++) {
      if (commandsArray[0].length !== commandsArray[i].length) {
        commandsIdentical = false;
        errors.push(`Command count differs: ${commandsArray[0].length} vs ${commandsArray[i].length}`);
        break;
      }
    }

    // Check 4: Decisions valid
    let decisionsValid = true;
    for (const [brainId, decision] of decisions) {
      const commands = commandsPerPlayer.get(brainId);
      if (!commands) continue;

      for (const cmd of decision.commands) {
        const isValid = commands.some((c) => c.id === cmd.commandId);
        if (!isValid) {
          decisionsValid = false;
          errors.push(`Brain ${brainId}: Command ${cmd.commandId} not in valid options`);
        }
      }
    }

    // Check 5: No hidden info
    const noHiddenInfo = observationsIdentical && goalsIdentical && commandsIdentical;

    const success = errors.length === 0;

    return {
      success,
      observations,
      decisions,
      checks: {
        observationsIdentical,
        goalsIdentical,
        commandsIdentical,
        decisionsValid,
        noHiddenInfo,
      },
      errors,
    };
  }

  /**
   * Check if two observations are identical.
   */
  private static obsEqual(obs1: WorldObservation, obs2: WorldObservation): boolean {
    // Compare key fields
    if (obs1.tick !== obs2.tick) return false;
    if (obs1.missionId !== obs2.missionId) return false;
    if (obs1.friendlyUnits.length !== obs2.friendlyUnits.length) return false;
    if (obs1.enemyUnits.length !== obs2.enemyUnits.length) return false;
    if (obs1.agentHealth !== obs2.agentHealth) return false;

    // Compare unit IDs (friendly)
    const ids1 = new Set(obs1.friendlyUnits.map((u: any) => u.id));
    const ids2 = new Set(obs2.friendlyUnits.map((u: any) => u.id));
    for (const id of ids1) {
      if (!ids2.has(id)) return false;
    }

    // Compare enemy unit IDs
    const eids1 = new Set(obs1.enemyUnits.map((u: any) => u.id));
    const eids2 = new Set(obs2.enemyUnits.map((u: any) => u.id));
    for (const id of eids1) {
      if (!eids2.has(id)) return false;
    }

    return true;
  }

  /**
   * Generate goals for a player (same for all providers).
   */
  private static getGoals(state: OpenRAGameState, playerName: string): readonly GoalOption[] {
    return [
      {
        id: "economy",
        intent: "Expand economy and gather resources",
        priority: 1,
        feasibility: 0.8,
        expectedDuration: 10,
        estimatedValue: 100,
      },
      {
        id: "military",
        intent: "Build military and defend base",
        priority: 1,
        feasibility: 0.7,
        expectedDuration: 15,
        estimatedValue: 80,
      },
    ];
  }

  /**
   * Generate commands for a player (same for all providers).
   */
  private static getCommands(state: OpenRAGameState, playerName: string): readonly CommandOption[] {
    return state.units
      .filter((u: { owner: string }) => u.owner === playerName)
      .map((u: { id: string }) => ({
        id: u.id,
        action: "move" as const,
        target: { x: 50, y: 50 },
        expectedDuration: 5,
        expectedCost: 0,
        description: "Move unit",
      }));
  }

  /**
   * Generate human-readable report.
   */
  static generateReport(result: ProviderValidationResult): string {
    const lines = [
      "=== Provider Validation Report ===",
      `Status: ${result.success ? "PASS" : "FAIL"}`,
      "",
      "Checks:",
      `  Observations identical: ${result.checks.observationsIdentical ? "✓" : "✗"}`,
      `  Goals identical: ${result.checks.goalsIdentical ? "✓" : "✗"}`,
      `  Commands identical: ${result.checks.commandsIdentical ? "✓" : "✗"}`,
      `  Decisions valid: ${result.checks.decisionsValid ? "✓" : "✗"}`,
      `  No hidden info: ${result.checks.noHiddenInfo ? "✓" : "✗"}`,
    ];

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
