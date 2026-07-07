/**
 * Match Orchestrator — Run complete autonomous match
 *
 * Orchestrates:
 * 1. Start game
 * 2. Loop: Get state → Brain decides → Execute commands
 * 3. Collect replay (state + events)
 * 4. Detect victory or defeat
 * 5. Validate gameplay (worker, economy, military)
 */

import { OpenRAProcessManager } from "./process-manager";
import { OpenRAStateReader } from "./state-reader";
import { WorldMapper } from "./world-mapper";
import { CommandExecutor } from "./command-executor";
import { EventSynchronizer } from "./event-synchronizer";
import { WorkerValidator } from "./worker-validator";
import { EconomyValidator } from "./economy-validator";
import { MilitaryValidator } from "./military-validator";
import type { Brain } from "@ai-commander/brain";
import type { OpenRAGameState } from "./state-reader";
import type { GameEvent } from "./event-synchronizer";

export interface MatchResult {
  readonly winner: "player1" | "player2" | "draw";
  readonly totalTicks: number;
  readonly duration: number;
  readonly player1Stats: {
    readonly resourcesGathered: number;
    readonly unitsProduced: number;
    readonly buildingsConstructed: number;
  };
  readonly player2Stats: {
    readonly resourcesGathered: number;
    readonly unitsProduced: number;
    readonly buildingsConstructed: number;
  };
  readonly validations: {
    readonly workerCycleValid: boolean;
    readonly economyScaling: string;
    readonly militaryEngagement: boolean;
  };
}

/**
 * MatchOrchestrator: Run complete autonomous match
 */
export class MatchOrchestrator {
  /**
   * Run a complete match between two brains.
   */
  static async runMatch(
    brain1: Brain,
    brain2: Brain,
    playerName1: string = "GDI",
    playerName2: string = "Nod",
    maxTicks: number = 500
  ): Promise<MatchResult> {
    // Step 1: Launch OpenRA
    const processManager = new OpenRAProcessManager({ headless: true, port: 9000 });
    await processManager.launch();

    const stateReader = new OpenRAStateReader();
    const synchronizer = new EventSynchronizer();
    const states: OpenRAGameState[] = [];
    const events: GameEvent[] = [];

    try {
      // Main game loop
      for (let tick = 0; tick < maxTicks; tick++) {
        // Get current state
        const gameState = await stateReader.getGameState();
        states.push(gameState);

        if (tick > 0) {
          const prevState = states[tick - 1];
          // Detect state changes
          const newEvents = synchronizer.detectStateChanges(
            tick,
            new Set(prevState.units.map((u) => u.id)),
            new Set(gameState.units.map((u) => u.id)),
            new Map(prevState.buildings.map((b) => [b.id, b.health])),
            new Map(gameState.buildings.map((b) => [b.id, b.health])),
            new Map(prevState.players.map((p) => [p.name, p.credits])),
            new Map(gameState.players.map((p) => [p.name, p.credits]))
          );

          events.push(...newEvents);
        }

        // Get observations for each player
        const obs1 = WorldMapper.mapToObservation(gameState, playerName1);
        const obs2 = WorldMapper.mapToObservation(gameState, playerName2);

        // Brain 1 decision
        const goals1 = this.getGoals(gameState, playerName1);
        const commands1 = this.getCommands(gameState, playerName1);
        const decision1 = await brain1.decide(obs1, goals1, commands1, {
          recentEvents: [],
          recentDecisions: [],
          metrics: {
            commandsExecuted: 0,
            commandsFailed: 0,
            goalsCompleted: 0,
            goalsAbandoned: 0,
          },
        });

        // Brain 2 decision
        const goals2 = this.getGoals(gameState, playerName2);
        const commands2 = this.getCommands(gameState, playerName2);
        const decision2 = await brain2.decide(obs2, goals2, commands2, {
          recentEvents: [],
          recentDecisions: [],
          metrics: {
            commandsExecuted: 0,
            commandsFailed: 0,
            goalsCompleted: 0,
            goalsAbandoned: 0,
          },
        });

        // Execute commands (in real integration, would send to OpenRA)
        if (decision1.commands.length > 0) {
          const unit1 = gameState.units.find((u) => u.owner === playerName1);
          if (unit1) {
            CommandExecutor.executeCommand(
              commands1[0],
              unit1.id,
              gameState,
              playerName1
            );
          }
        }

        if (decision2.commands.length > 0) {
          const unit2 = gameState.units.find((u) => u.owner === playerName2);
          if (unit2) {
            CommandExecutor.executeCommand(
              commands2[0],
              unit2.id,
              gameState,
              playerName2
            );
          }
        }

        // Check victory condition
        const player1 = gameState.players.find((p) => p.name === playerName1);
        const player2 = gameState.players.find((p) => p.name === playerName2);

        if (!player1?.isAlive || !player2?.isAlive) {
          // Game over
          break;
        }
      }

      // Run validations
      const workerResult = WorkerValidator.validateWorkerCycle(
        states[0],
        states[states.length - 1],
        events,
        playerName1
      );

      const economyResult = EconomyValidator.validateEconomy(
        states[0],
        states[states.length - 1],
        events,
        playerName1
      );

      const militaryResult = MilitaryValidator.validateMilitary(
        states[0],
        states[states.length - 1],
        events,
        playerName1
      );

      // Determine winner (simplified)
      const finalState = states[states.length - 1];
      const player1Final = finalState.players.find((p) => p.name === playerName1);
      const player2Final = finalState.players.find((p) => p.name === playerName2);

      let winner: "player1" | "player2" | "draw" = "draw";
      if (
        player1Final?.isAlive &&
        !player2Final?.isAlive
      ) {
        winner = "player1";
      } else if (
        !player1Final?.isAlive &&
        player2Final?.isAlive
      ) {
        winner = "player2";
      }

      return {
        winner,
        totalTicks: states.length,
        duration: Date.now(),
        player1Stats: {
          resourcesGathered: player1Final?.credits || 0,
          unitsProduced: finalState.units.filter(
            (u) => u.owner === playerName1
          ).length,
          buildingsConstructed: finalState.buildings.filter(
            (b) => b.owner === playerName1
          ).length,
        },
        player2Stats: {
          resourcesGathered: player2Final?.credits || 0,
          unitsProduced: finalState.units.filter(
            (u) => u.owner === playerName2
          ).length,
          buildingsConstructed: finalState.buildings.filter(
            (b) => b.owner === playerName2
          ).length,
        },
        validations: {
          workerCycleValid: workerResult.success,
          economyScaling: economyResult.checks.scalingWorks ? "working" : "failed",
          militaryEngagement: militaryResult.checks.combatEngagement,
        },
      };
    } finally {
      await processManager.shutdown();
    }
  }

  private static getGoals(state: OpenRAGameState, playerName: string) {
    return [
      {
        id: "economy",
        intent: "Expand economy",
        priority: 1,
        feasibility: 0.8,
        expectedDuration: 10,
        estimatedValue: 100,
      },
      {
        id: "military",
        intent: "Build military",
        priority: 1,
        feasibility: 0.7,
        expectedDuration: 15,
        estimatedValue: 80,
      },
    ];
  }

  private static getCommands(state: OpenRAGameState, playerName: string) {
    return state.units
      .filter((u: { owner: string }) => u.owner === playerName)
      .map((u: { id: string }) => ({
        id: u.id,
        action: "move",
        target: { x: 50, y: 50 },
        expectedDuration: 5,
        expectedCost: 0,
        description: "Move unit",
      }));
  }
}
