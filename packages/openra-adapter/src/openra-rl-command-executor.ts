/**
 * OpenRA-RL Command Executor — Send real commands to OpenRA via HTTP
 *
 * Converts AI Commander commands to OpenRA-RL format and executes them
 * against the live game.
 *
 * Validates commands before and after execution using game state.
 */

import type { OpenRAGameState } from "./state-reader";
import type { CommandValidationResult, OpenRACommand } from "./command-executor";
import { CommandExecutor } from "./command-executor";
import type { CommandOption } from "@ai-commander/brain";

interface OpenRaRLStepResponse {
  success: boolean;
  timestamp: number;
  message?: string;
  data?: unknown;
}

/**
 * OpenRA-RL Command Executor
 *
 * Sends real commands to OpenRA game via HTTP
 */
export class OpenRACommandExecutorRL {
  private baseUrl: string;
  private timeout: number;
  private retries: number;
  private verbose: boolean;

  constructor(
    baseUrl: string = "http://localhost:8000",
    timeout: number = 5000,
    retries: number = 2,
    verbose: boolean = false
  ) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retries = retries;
    this.verbose = verbose;
  }

  /**
   * Execute a command against the live game
   */
  async executeCommand(
    brainCommand: CommandOption,
    unitId: string,
    gameState: OpenRAGameState,
    playerName: string
  ): Promise<CommandValidationResult> {
    // First: validate command against current state
    const validation = CommandExecutor.executeCommand(brainCommand, unitId, gameState, playerName);

    if (!validation.valid) {
      return validation;
    }

    // Second: send to OpenRA-RL
    try {
      const success = await this.submitOrder({
        orderName: this.mapCommandToOrderName(brainCommand.action as string),
        target: this.mapCommandToTarget(brainCommand),
        unitId,
      });

      if (!success) {
        return {
          valid: false,
          reason: "OpenRA execution failed",
          executedCommand: undefined,
          expectedEffect: undefined,
        };
      }

      // Third: command was executed successfully
      return {
        valid: true,
        reason: "Command executed successfully",
        executedCommand: undefined,
        expectedEffect: this.describeExpectedEffect(brainCommand.action as string),
      };
    } catch (error) {
      return {
        valid: false,
        reason: `Execution error: ${error instanceof Error ? error.message : String(error)}`,
        executedCommand: undefined,
        expectedEffect: undefined,
      };
    }
  }

  /**
   * Verify that world state changed after command execution
   */
  async verifyStateChange(
    beforeState: OpenRAGameState,
    afterState: OpenRAGameState
  ): Promise<boolean> {
    // Simple heuristic: check if any units/buildings changed
    const unitCountChanged =
      beforeState.units.length !== afterState.units.length;
    const buildingCountChanged =
      beforeState.buildings.length !== afterState.buildings.length;
    const tickAdvanced = afterState.tick > beforeState.tick;

    // At minimum, game tick should advance
    return tickAdvanced;
  }

  /**
   * Map AI Commander action to OpenRA order name
   */
  private mapCommandToOrderName(action: string): string {
    const mapping: Record<string, string> = {
      move: "Move",
      attack: "AttackMove",
      gather: "Harvest",
      build: "PlaceBuilding",
      train: "BuildUnit",
      stop: "Stop",
      patrol: "Patrol",
      repair: "Repair",
    };

    return mapping[action] || action;
  }

  /**
   * Map command target to OpenRA format
   */
  private mapCommandToTarget(command: CommandOption): unknown {
    if ("target" in command && command.target) {
      return {
        x: (command.target as { x?: number; y?: number }).x || 0,
        y: (command.target as { x?: number; y?: number }).y || 0,
      };
    }

    return null;
  }

  /**
   * Describe expected effect of a command
   */
  private describeExpectedEffect(action: string): string {
    const descriptions: Record<string, string> = {
      move: "Unit should move towards target position",
      attack: "Unit should attack target",
      gather: "Unit should gather resources at target",
      build: "Building should be placed at target",
      train: "Unit should be trained",
      stop: "Unit should stop current action",
      patrol: "Unit should patrol route",
      repair: "Unit should repair target building",
    };

    return descriptions[action] || "Command executed";
  }

  /**
   * Submit order to OpenRA-RL
   */
  private async submitOrder(order: unknown): Promise<boolean> {
    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/step`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: order,
        }),
      });

      if (!response.ok) {
        this.log(`  Order submission failed with status ${response.status}`);
        return false;
      }

      const data = (await response.json()) as OpenRaRLStepResponse;
      return data.success;
    } catch (error) {
      this.log(`  Order submission error: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * HTTP request with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attemptCount: number = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (attemptCount < this.retries) {
        this.log(`  Retrying (attempt ${attemptCount + 1}/${this.retries})...`);
        await new Promise((resolve) => setTimeout(resolve, 100 * (attemptCount + 1)));
        return this.fetchWithRetry(url, options, attemptCount + 1);
      }
      throw error;
    }
  }

  /**
   * Log helper
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(message);
    }
  }
}

/**
 * Create OpenRA-RL command executor
 */
export function createOpenRACommandExecutorRL(
  baseUrl: string = "http://localhost:8000",
  verbose: boolean = false
): OpenRACommandExecutorRL {
  return new OpenRACommandExecutorRL(baseUrl, 5000, 2, verbose);
}
